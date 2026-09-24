import { db, PinConfigRecord } from '../db/db';
import { 
  ensureDeviceKeypair, 
  exportPublicKey, 
  unwrapDek, 
  encryptRecord, 
  decryptRecord, 
  decryptSyncResponse,
  Envelope, 
  getPublicKeyHash
} from './cryptoService';
import { fetchWithAuth, syncHeaders, API_BASE_URL, withTimeout } from '../config/api';

const __syncTrace: Array<{ t: number; msg: string; extra?: any }> = [];
function trace(msg: string, extra?: any) {
  __syncTrace.push({ t: Date.now(), msg, extra });
  if (__syncTrace.length > 200) __syncTrace.shift();
  console.log('[SYNC TRACE]', msg, extra ?? '');
}
if (typeof window !== 'undefined') {
  (window as any).__syncTrace = () => __syncTrace;
}

export type SyncPillStatus = 'synced' | 'pending' | 'paused' | 'syncing';

let globalTokenGetter: (() => Promise<string | null>) | null = null;
let currentActiveOrgId: string = 'default_org';

export function registerAuthTokenGetter(getter: () => Promise<string | null>) {
  globalTokenGetter = getter;
}

export function setActiveOrgId(orgId: string) {
  currentActiveOrgId = orgId;
}

export function getActiveOrgId(): string {
  return currentActiveOrgId;
}

export async function getClerkToken(): Promise<string | null> {
  if (globalTokenGetter) {
    try {
      const t = await globalTokenGetter();
      if (t) return t;
    } catch {}
  }
  if (typeof window !== 'undefined' && (window as any).Clerk?.session) {
    try {
      return await (window as any).Clerk.session.getToken();
    } catch {}
  }
  return null;
}

export async function pushPinConfig(record: PinConfigRecord): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  try {
    const token = await getClerkToken();
    if (!token || !isOnline) {
      await db.pendingPinPushes.put({
        id: record.id,
        orgId: record.orgId,
        profileType: record.profileType,
        queuedAt: Date.now()
      });
      return;
    }

    const { orgId, ...bodyWithoutOrgId } = record;
    const url = `${API_BASE_URL}/api/pin-configs/${record.profileType}`;

    if (record.deletedAt) {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        await db.pendingPinPushes.delete(record.id);
      } else {
        console.warn('[syncService] pushPinConfig DELETE non-2xx:', res.status);
        await db.pendingPinPushes.put({
          id: record.id,
          orgId: record.orgId,
          profileType: record.profileType,
          queuedAt: Date.now()
        });
      }
    } else {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyWithoutOrgId)
      });
      if (res.ok) {
        await db.pendingPinPushes.delete(record.id);
      } else {
        console.warn('[syncService] pushPinConfig PUT non-2xx:', res.status);
        await db.pendingPinPushes.put({
          id: record.id,
          orgId: record.orgId,
          profileType: record.profileType,
          queuedAt: Date.now()
        });
      }
    }
  } catch (err) {
    // Non-2xx / network error -> queue for retry and swallow
    try {
      await db.pendingPinPushes.put({
        id: record.id,
        orgId: record.orgId,
        profileType: record.profileType,
        queuedAt: Date.now()
      });
    } catch {}
    console.warn('[syncService] pushPinConfig network error:', err);
  }
}

export async function flushPendingPinPushes(): Promise<void> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) return;

  try {
    const token = await getClerkToken();
    if (!token) return;

    const pending = await db.pendingPinPushes.toArray();
    for (const item of pending) {
      const rec = await db.pinConfigs.where('[orgId+profileType]').equals([item.orgId, item.profileType]).first();
      if (!rec) {
        await db.pendingPinPushes.delete(item.id);
        continue;
      }

      const { orgId, ...bodyWithoutOrgId } = rec;
      const url = `${API_BASE_URL}/api/pin-configs/${rec.profileType}`;

      if (rec.deletedAt) {
        const res = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          await db.pendingPinPushes.delete(item.id);
        }
      } else {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyWithoutOrgId)
        });
        if (res.ok) {
          await db.pendingPinPushes.delete(item.id);
        }
      }
    }
  } catch (err) {
    console.warn('[syncService] flushPendingPinPushes error:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingPinPushes().catch(() => {});
  });
}

export async function pullPinConfigs(activeOrgId?: string): Promise<void> {
  try {
    const targetOrg = activeOrgId || currentActiveOrgId;
    const token = await getClerkToken();
    if (!token || !navigator.onLine) {
      return;
    }

    const url = `${API_BASE_URL}/api/pin-configs`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('[syncService] pullPinConfigs non-2xx:', res.status);
      return;
    }

    const remoteConfigs = await res.json();
    if (!Array.isArray(remoteConfigs)) return;

    for (const r of remoteConfigs) {
      // Defense in depth: skip if r.orgId !== activeOrgId
      if (r.orgId && targetOrg && r.orgId !== targetOrg) {
        continue;
      }

      const rowOrgId = r.orgId || targetOrg;
      const local = await db.pinConfigs
        .where('[orgId+profileType]')
        .equals([rowOrgId, r.profileType])
        .first();

      const isoUpdatedAt = new Date(r.updatedAt).toISOString();
      const remoteUpdatedTime = new Date(isoUpdatedAt).getTime() || 0;
      const localUpdatedTime = local ? (new Date(local.updatedAt).getTime() || 0) : 0;

      if (!local || remoteUpdatedTime > localUpdatedTime) {
        await db.pinConfigs.put({
          ...r,
          updatedAt: isoUpdatedAt,
          orgId: rowOrgId
        });
      }
    }
  } catch (err) {
    console.warn('[syncService] pullPinConfigs error:', err);
  }
}

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
let lastActivityAt = Date.now();
let syncStartedAt = 0;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const idleMs = Date.now() - lastActivityAt;
      const syncDuration = syncStartedAt ? Date.now() - syncStartedAt : 0;
      // If we were mid-sync when the tab froze (idle > 30s or sync hung > 20s), the finally block
      // may never have run. Force-reset so the next tap starts clean.
      if (isSyncing && (idleMs > 30_000 || syncDuration > 20_000)) {
        console.warn('[syncService] forcing isSyncing reset after tab resume', { idleMs, syncDuration });
        isSyncing = false;
        syncStartedAt = 0;
        updateSyncStatus('pending');
      }
      // Retrigger sync shortly after resume (only if nothing is currently running)
      if (!isSyncing && navigator.onLine) {
        setTimeout(() => {
          // caller-provided getToken is captured on the original call site;
          // handled via masar_sync_retry event
          window.dispatchEvent(new CustomEvent('masar_sync_retry'));
        }, 1500);
      }
    } else {
      lastActivityAt = Date.now();
    }
  });
}

export async function performHandshake(getToken: () => Promise<string | null>): Promise<void> {
  const cachedDek = await db.keystore.get('dek');
  const cachedHash = await db.keystore.get('publicKeyHash');
  if (cachedDek?.key && cachedHash?.value) {
    return;
  }

  const keypair = await ensureDeviceKeypair();
  const token = await getToken();

  if (!token) {
    throw new Error('handshake: no auth token available');
  }

  if (!navigator.onLine) {
    throw new Error('handshake: browser is offline');
  }

  const pubKeyStr = await exportPublicKey(keypair);
  const res = await fetchWithAuth('/api/sync/handshake', token, {
    method: 'POST',
    headers: syncHeaders(token),
    body: JSON.stringify({ devicePublicKey: pubKeyStr })
  });

  if (!res?.wrappedDek) {
    throw new Error('handshake: server returned no wrappedDek');
  }

  await unwrapDek(res.wrappedDek, keypair.privateKey);

  if (res.publicKeyHash) {
    await db.keystore.put({
      id: 'publicKeyHash',
      value: res.publicKeyHash,
      at: Date.now(),
    });
  }
}

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
  trace('updateSyncStatus called', { status, isSyncing });
  syncPillStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar_sync_status_change', { 
      detail: { status, isSyncing, ...getSyncState() } 
    }));
  }
}

export function getSyncPillStatus(): SyncPillStatus {
  return syncPillStatus;
}

export async function processSyncQueue(getToken: () => Promise<string | null>) {
  trace('processSyncQueue entry', { isSyncing, breakerOpen, online: navigator.onLine });
  if (breakerOpen) {
    trace('early return', { reason: 'breakerOpen' });
    updateSyncStatus('paused');
    return;
  }

  if (isSyncing || !navigator.onLine) {
    trace('early return', { reason: isSyncing ? 'isSyncing' : 'offline' });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.locks) {
    trace('locks: acquiring');
    let timeoutId: any;
    const lockPromise = navigator.locks.request('masar_sync_leader', { ifAvailable: true }, async (lock) => {
      trace('locks: acquired', { hasLock: !!lock });
      if (lock) {
        await executeSyncLoop(getToken);
      }
    });

    const timeout = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('lock acquisition timeout')), 15_000);
    });

    try {
      await Promise.race([lockPromise, timeout]);
    } catch (err) {
      console.warn('[syncService] lock acquisition timed out, forcing isSyncing reset');
      isSyncing = false;
      syncStartedAt = 0;
      updateSyncStatus('pending');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  } else {
    await executeSyncLoop(getToken);
  }
}

async function executeSyncLoop(getToken: () => Promise<string | null>) {
  trace('executeSyncLoop entry');
  lastActivityAt = Date.now();
  syncStartedAt = Date.now();
  isSyncing = true;
  updateSyncStatus('syncing');
  trace('status -> syncing');

  let terminalStatus: SyncPillStatus = 'synced';

  const watchdogId = setTimeout(() => {
    if (isSyncing) {
      console.warn('[syncService] watchdog fired — forcing isSyncing reset');
      isSyncing = false;
      syncStartedAt = 0;
      updateSyncStatus('pending');
    }
  }, 60_000);

  try {
    let token: string | null = null;
    try {
      token = await withTimeout(getToken(), 8_000, 'getToken');
    } catch {
      token = null;
    }

    await withTimeout(performHandshake(getToken), 25_000, 'handshake');

    const queue = await db.syncQueue.orderBy('createdAt').toArray();
    if (queue.length > 0) {
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
        const wireOps = await Promise.all(
          operationsToPush.map(async (o) => {
            if (o.entityType === 'pinConfigs') {
              const { orgId, ...cleanPayload } = o.payload || {};
              return {
                idempotencyKey: o.id,
                entityType: 'pinConfigs',
                entityId: o.entityId,
                operation: 'upsert',
                payload: cleanPayload,
                localTimestamp: o.createdAt
              };
            }
            let payload = o.payload;
            if (payload && !payload.envelope && !payload.ct) {
              const env = await encryptRecord(payload);
              // Preserve original fields while adding the envelope for the backend to use as it needs
              payload = { ...payload, id: o.entityId, envelope: env, updatedAt: o.createdAt };
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
        const raw = await fetchWithAuth('/api/sync/push', token, {
          method: 'POST',
          headers: syncHeaders(token, publicKeyHash),
          body: JSON.stringify({ operations: wireOps })
        });
        const res = await decryptSyncResponse(raw);

        if (res && Array.isArray(res.results)) {
          for (const result of res.results) {
            if (
              result.status === 'success' ||
              result.status === 'applied' ||
              result.status === 'ignored'
            ) {
              await db.syncQueue.delete(result.idempotencyKey);
            } else {
              console.warn('[syncService] Remote rejected operation:', result);
              const err = typeof result.error === 'string' ? result.error : '';
              const isPermanent =
                err.startsWith('Unknown or unsupported entity type') ||
                err.startsWith('Invalid envelope') ||
                err.startsWith('unwrapDek') ||
                err.startsWith('Failed query:');
              if (isPermanent) {
                console.error('[syncService] parking permanently-failed outbox item:', result);
                await db.syncQueue.delete(result.idempotencyKey);
              }
            }
          }
        } else if (res && res.success) {
          for (const op of wireOps) {
            await db.syncQueue.delete(op.idempotencyKey);
          }
        }
      }
    }

    const lastPullStr = localStorage.getItem('masar_last_pull_timestamp');
    const lastPull = lastPullStr ? (new Date(lastPullStr).getTime() || 0) : 0;
    try {
      const publicKeyHash = await getPublicKeyHash();
      const rawPull = await fetchWithAuth(`/api/sync/pull?since=${lastPull}`, token, {
        headers: syncHeaders(token, publicKeyHash)
      });
      const pullRes = await decryptSyncResponse(rawPull);

      if (pullRes && pullRes.data) {
        await applyDeltas(pullRes.data);
        if (pullRes.timestamp) {
          localStorage.setItem('masar_last_pull_timestamp', pullRes.timestamp.toString());
        }
      }

      if (pullRes && Array.isArray((pullRes as any).pinConfigs)) {
        for (const r of (pullRes as any).pinConfigs) {
          if (r.orgId && currentActiveOrgId && r.orgId !== currentActiveOrgId) continue;
          const rowOrgId = r.orgId || currentActiveOrgId;
          const local = await db.pinConfigs.where('[orgId+profileType]').equals([rowOrgId, r.profileType]).first();
          const remoteTime = new Date(r.updatedAt).getTime() || 0;
          const localTime = local ? (new Date(local.updatedAt).getTime() || 0) : 0;
          if (!local || remoteTime > localTime) {
            await db.pinConfigs.put({ ...r, orgId: rowOrgId });
          }
        }
      }

      // Also invoke dedicated pullPinConfigs on existing generic sync cycle
      await pullPinConfigs(currentActiveOrgId).catch(() => {});
    } catch (pullErr: any) {
      console.warn('[syncService] Delta pull deferred:', pullErr?.message || pullErr);
    }

    lastSyncTime = Date.now();
    consecutiveFailures = 0;
    breakerOpen = false;
    syncError = null;

    const remaining = await db.syncQueue.count();
    trace('terminal status reached', { remaining });
    terminalStatus = remaining > 0 ? 'pending' : 'synced';
  } catch (err: any) {
    trace('executeSyncLoop catch', { message: err?.message, consecutiveFailures });
    consecutiveFailures++;
    console.warn(`[syncService] Sync failure (${consecutiveFailures}/${BREAKER_THRESHOLD}):`, err?.message || err);
    syncError = err?.message || 'Sync error';

    if (consecutiveFailures >= BREAKER_THRESHOLD) {
      breakerOpen = true;
      terminalStatus = 'paused';
      console.warn('[syncService] Circuit breaker tripped. Sync paused.');

      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          resetCircuitBreaker();
          processSyncQueue(getToken).catch(console.warn);
        }, { once: true });
      }
      return;
    }

    const delay = Math.min(CAP_MS, BASE_MS * (2 ** consecutiveFailures)) * (1 + Math.random() * 0.3);
    console.log(`[syncService] Scheduling retry in ${Math.round(delay)}ms...`);
    terminalStatus = 'pending';

    if (retryTimeout) clearTimeout(retryTimeout);
    retryTimeout = setTimeout(() => {
      processSyncQueue(getToken).catch(console.warn);
    }, delay);
  } finally {
    clearTimeout(watchdogId);
    trace('executeSyncLoop finally', { isSyncing });
    isSyncing = false;
    syncStartedAt = 0;
    updateSyncStatus(terminalStatus);
  }
}

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
    const rawRes = await fetchWithAuth('/api/sync/pull?since=0', token, {
      headers: syncHeaders(token, publicKeyHash)
    });
    const res = await decryptSyncResponse(rawRes);

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
  isSyncing = false;
  syncStartedAt = 0;
  await processSyncQueue(getToken);
  if (breakerOpen && syncError) {
    throw new Error(syncError);
  }
}
