import { db } from '../db/db';
import { 
  ensureDeviceKeypair, 
  exportPublicKey, 
  unwrapDek, 
  encryptRecord, 
  decryptRecord, 
  Envelope, 
  getOrCreateLocalDek,
  getPublicKeyHash
} from './cryptoService';
import { fetchWithAuth, syncHeaders } from '../config/api';

export type SyncPillStatus = 'synced' | 'pending' | 'paused' | 'syncing';

// Phase 3 — Backoff & Circuit Breaker Constants
const MAX_ATTEMPTS = 6;
const BASE_MS = 500;
const CAP_MS = 30_000;
const BREAKER_THRESHOLD = 5;

let isSyncing = false;
let syncError: string | null = null;
let lastSyncTime = 0;
let consecutiveFailures = 0;
let breakerOpen = false;
let retryTimeout: any = null;
let syncPillStatus: SyncPillStatus = 'synced';

/**
 * Handshake with server to retrieve/unwrap encrypted DEK
 */
export async function performHandshake(getToken: () => Promise<string | null>): Promise<void> {
  try {
    // Check if valid DEK already in keystore
    const cachedDek = await db.keystore.get('dek');
    if (cachedDek?.key) {
      return;
    }

    const keypair = await ensureDeviceKeypair();
    const token = await getToken();

    if (!token || !navigator.onLine) {
      await getOrCreateLocalDek();
      return;
    }

    try {
      const pubKeyStr = await exportPublicKey(keypair);
      const res = await fetchWithAuth('/api/sync/handshake', token, {
        method: 'POST',
        headers: syncHeaders(token),
        body: JSON.stringify({ devicePublicKey: pubKeyStr })
      });

      if (res?.wrappedDek) {
        await unwrapDek(res.wrappedDek, keypair.privateKey);
        if (res.publicKeyHash) {
          await db.keystore.put({ id: 'publicKeyHash', value: res.publicKeyHash, at: Date.now() });
        }
        return;
      }
    } catch (netErr) {
      console.warn('[syncService] Handshake server response deferred, using local DEK:', netErr);
    }

    await getOrCreateLocalDek();
  } catch (err) {
    console.warn('[syncService] Handshake initialization caught:', err);
    await getOrCreateLocalDek();
  }
}

/**
 * Reset circuit breaker and attempt immediate sync (e.g. on manual user tap or online event)
 */
export function resetCircuitBreaker() {
  consecutiveFailures = 0;
  breakerOpen = false;
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  updateSyncStatus('pending');
}

function updateSyncStatus(status: SyncPillStatus) {
  syncPillStatus = status;
  window.dispatchEvent(new CustomEvent('masar_sync_status_change', { detail: { status } }));
}

export function getSyncPillStatus(): SyncPillStatus {
  return syncPillStatus;
}

/**
 * Phase 3 & Phase 5: Process sync queue with lock and exponential backoff
 */
export async function processSyncQueue(getToken: () => Promise<string | null>) {
  if (breakerOpen) {
    updateSyncStatus('paused');
    return;
  }

  if (isSyncing || !navigator.onLine) {
    return;
  }

  // Phase 5 — Multi-tab leader election via Web Locks API
  if (typeof navigator !== 'undefined' && navigator.locks) {
    await navigator.locks.request('masar_sync_leader', { ifAvailable: true }, async (lock) => {
      if (lock) {
        await executeSyncLoop(getToken);
      }
    });
  } else {
    await executeSyncLoop(getToken);
  }
}

async function executeSyncLoop(getToken: () => Promise<string | null>) {
  isSyncing = true;
  updateSyncStatus('syncing');

  try {
    const token = await getToken();
    if (!token) {
      isSyncing = false;
      updateSyncStatus('pending');
      return;
    }

    // Ensure DEK is ready
    await performHandshake(getToken);

    // 1. Push Outbox
    const queue = await db.syncQueue.orderBy('createdAt').toArray();
    if (queue.length > 0) {
      // Deduplicate operations by entityId
      const grouped = new Map();
      for (const op of queue) {
        const key = `${op.entityType}:${op.entityId}`;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, op);
        } else {
          if (existing.operation === 'create' && op.operation === 'update') {
            existing.payload = op.payload;
          } else if (existing.operation === 'update' && op.operation === 'update') {
            existing.payload = op.payload;
          } else if (op.operation === 'delete') {
            if (existing.operation === 'create') {
              grouped.delete(key);
              await db.syncQueue.delete(existing.id);
              await db.syncQueue.delete(op.id);
            } else {
              grouped.set(key, op);
            }
          }
        }
      }

      const operationsToPush = Array.from(grouped.values());

      if (operationsToPush.length > 0) {
        // Phase 1e — operations already hold encrypted envelope in payload
        const wireOps = await Promise.all(
          operationsToPush.map(async (o) => {
            let payload = o.payload;
            // If legacy unencrypted payload, wrap in envelope
            if (payload && !payload.envelope && !payload.ct) {
              const env = await encryptRecord(payload);
              payload = { id: o.entityId, envelope: env, updatedAt: o.createdAt };
            }
            return {
              idempotencyKey: o.id,
              entityType: o.entityType,
              entityId: o.entityId,
              operation: o.operation,
              payload,
              localTimestamp: o.createdAt
            };
          })
        );

        const publicKeyHash = await getPublicKeyHash();
        const res = await fetchWithAuth('/api/sync/push', token, {
          method: 'POST',
          headers: syncHeaders(token, publicKeyHash),
          body: JSON.stringify({ operations: wireOps })
        });

        // Delete processed operations from sync queue
        if (res && Array.isArray(res.results)) {
          for (const result of res.results) {
            if (result.status === 'success' || result.status === 'applied') {
              await db.syncQueue.delete(result.idempotencyKey);
            } else {
              console.warn('[syncService] Remote rejected operation:', result);
            }
          }
        } else if (res && res.success) {
          for (const op of wireOps) {
            await db.syncQueue.delete(op.idempotencyKey);
          }
        }
      }
    }

    // 2. Pull Deltas
    const lastPullStr = localStorage.getItem('masar_last_pull_timestamp');
    const lastPull = lastPullStr ? parseInt(lastPullStr, 10) : 0;
    try {
      const publicKeyHash = await getPublicKeyHash();
      const pullRes = await fetchWithAuth(`/api/sync/pull?since=${lastPull}`, token, {
        headers: syncHeaders(token, publicKeyHash)
      });

      if (pullRes && pullRes.data) {
        await applyDeltas(pullRes.data);
        if (pullRes.timestamp) {
          localStorage.setItem('masar_last_pull_timestamp', pullRes.timestamp.toString());
        }
      }
    } catch (pullErr: any) {
      console.warn('[syncService] Delta pull deferred:', pullErr?.message || pullErr);
    }

    // Sync Succeeded
    lastSyncTime = Date.now();
    consecutiveFailures = 0;
    breakerOpen = false;
    syncError = null;

    const remaining = await db.syncQueue.count();
    updateSyncStatus(remaining > 0 ? 'pending' : 'synced');
  } catch (err: any) {
    consecutiveFailures++;
    console.warn(`[syncService] Sync failure (${consecutiveFailures}/${BREAKER_THRESHOLD}):`, err?.message || err);
    syncError = err?.message || 'Sync error';

    // Phase 3 — Circuit Breaker threshold
    if (consecutiveFailures >= BREAKER_THRESHOLD) {
      breakerOpen = true;
      updateSyncStatus('paused');
      console.warn('[syncService] Circuit breaker tripped. Sync paused.');

      // Auto-reset when network reconnects
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          resetCircuitBreaker();
          processSyncQueue(getToken).catch(console.warn);
        }, { once: true });
      }
      return;
    }

    // Phase 3 — Exponential Backoff with jitter
    const delay = Math.min(CAP_MS, BASE_MS * (2 ** consecutiveFailures)) * (1 + Math.random() * 0.3);
    console.log(`[syncService] Scheduling retry in ${Math.round(delay)}ms...`);
    updateSyncStatus('pending');

    if (retryTimeout) clearTimeout(retryTimeout);
    retryTimeout = setTimeout(() => {
      processSyncQueue(getToken).catch(console.warn);
    }, delay);
  } finally {
    isSyncing = false;
  }
}

/**
 * Phase 4 — Hydrate on first load if not yet hydrated
 */
export async function hydrateIfNeeded(getToken: () => Promise<string | null>): Promise<{ hydrated: boolean; recordCount: number }> {
  try {
    const flag = await db.keystore.get('hydrated');
    if (flag) {
      return { hydrated: true, recordCount: 0 };
    }

    const token = await getToken();
    if (!token || !navigator.onLine) {
      return { hydrated: false, recordCount: 0 };
    }

    console.log('[syncService] Hydrating account data (since=0)...');
    const publicKeyHash = await getPublicKeyHash();
    const res = await fetchWithAuth('/api/sync/pull?since=0', token, {
      headers: syncHeaders(token, publicKeyHash)
    });

    let count = 0;
    if (res && res.data) {
      count = await applyDeltas(res.data);
      if (res.timestamp) {
        localStorage.setItem('masar_last_pull_timestamp', res.timestamp.toString());
      }
    }

    await db.keystore.put({ id: 'hydrated', at: Date.now() });
    console.log(`[syncService] Hydration complete. Ingested ${count} records.`);
    return { hydrated: true, recordCount: count };
  } catch (err: any) {
    console.error('[syncService] Hydration failed:', err);
    throw err;
  }
}

async function applyDeltas(data: any): Promise<number> {
  let count = 0;
  for (const table of Object.keys(data)) {
    if ((db as any)[table]) {
      const records = data[table];
      if (!Array.isArray(records)) continue;

      // Encrypt outside of IDB transaction if needed
      const prepared = await Promise.all(
        records.map(async (record: any) => {
          let envelope = record.envelope;
          if (!envelope) {
            envelope = await encryptRecord(record);
          }
          return {
            id: record.id,
            envelope,
            updatedAt: record.updatedAt || record.updated_at || Date.now(),
            updated_at: record.updated_at || record.updatedAt || Date.now(),
            deletedAt: record.deletedAt || record.deleted_at || null,
            deleted_at: record.deleted_at || record.deletedAt || null,
            sync_status: 'synced'
          };
        })
      );

      const targetTable = (db as any)[table];
      await db.transaction('rw', targetTable, () =>
        Promise.all(
          prepared.map((item: any) =>
            item.deletedAt || item.deleted_at
              ? targetTable.delete(item.id)
              : targetTable.put(item)
          )
        )
      );
      count += prepared.length;
    }
  }
  return count;
}

export function getSyncState() {
  return {
    isSyncing,
    syncError,
    lastSyncTime,
    consecutiveFailures,
    breakerOpen,
    syncPillStatus
  };
}

export async function triggerManualSync(getToken: () => Promise<string | null>) {
  resetCircuitBreaker();
  return processSyncQueue(getToken);
}
