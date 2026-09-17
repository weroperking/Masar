import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAuth } from '@clerk/clerk-react';
import { processSyncQueue } from '../services/syncService';
import { decryptRecord, encryptRecord, Envelope } from '../services/cryptoService';
import { useState, useEffect } from 'react';

/**
 * Single shared helper enforcing deleted_at != null filtering across all queries
 */
export function isNotDeleted(record: any): boolean {
  if (!record) return false;
  return record.deleted_at == null && record.deletedAt == null;
}

export function useApiQuery<T extends { id?: string; deleted_at?: number | null; deletedAt?: number | null }>(
  resource: string,
  _staleTime?: number,
  additionalParams: Record<string, any> = {}
) {
  const [decryptedData, setDecryptedData] = useState<T[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Live query on local Dexie table for instant reactive updates
  const rawRecords = useLiveQuery(async () => {
    const table = (db as any)[resource];
    if (!table) return [];
    return await table.toArray();
  }, [resource]);

  useEffect(() => {
    let isCancelled = false;

    async function processRecords() {
      if (rawRecords === undefined) {
        setIsLoading(true);
        return;
      }

      try {
        const decryptedList: T[] = [];
        for (const item of rawRecords) {
          if (item.envelope) {
            try {
              const plain = await decryptRecord<T>(item.envelope as Envelope);
              if (isNotDeleted(plain) && isNotDeleted(item)) {
                decryptedList.push({ ...plain, id: item.id });
              }
            } catch (err) {
              const message = err instanceof Error ? err.message || err.name : String(err);
              console.warn(`[useApiQuery] Decryption error for ${resource} item:`, message, err);
            }
          } else {
            // Unencrypted legacy record
            if (isNotDeleted(item)) {
              decryptedList.push(item as T);
            }
          }
        }

        // Apply additionalParams filtering on decrypted fields
        let filtered = decryptedList;
        if (additionalParams && Object.keys(additionalParams).length > 0) {
          filtered = filtered.filter((item: any) => {
            for (const [key, value] of Object.entries(additionalParams)) {
              if (item[key] !== value) return false;
            }
            return true;
          });
        }

        if (!isCancelled) {
          setDecryptedData(filtered);
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`[useApiQuery] Error querying ${resource}:`, err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    processRecords();

    return () => {
      isCancelled = true;
    };
  }, [rawRecords, resource, JSON.stringify(additionalParams)]);

  return {
    data: decryptedData ?? [],
    isLoading,
    isSuccess: !isLoading,
    isError: false,
    refetch: () => {}
  };
}

export function useApiMutation<T extends { id?: string }>(resource: string) {
  const { getToken } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const createMutation = {
    isPending,
    mutate: (newData: any, options?: { onSuccess?: (data: any) => void; onError?: (err: any) => void }) => {
      createMutation.mutateAsync(newData)
        .then((res) => options?.onSuccess?.(res))
        .catch((err) => options?.onError?.(err));
    },
    mutateAsync: async (newData: any) => {
      setIsPending(true);
      try {
        const table = (db as any)[resource];
        if (!table) throw new Error(`Table ${resource} not found in database`);

        const now = Date.now();
        // Client-side UUID generation for true local-first conflict-free creation
        const id = newData.id || crypto.randomUUID();
        const record: any = {
          ...newData,
          id,
          created_at: newData.created_at || now,
          updated_at: now,
          deleted_at: null,
          deletedAt: null,
          sync_status: 'pending'
        };

        // 1c. Encrypt record outside of Dexie transaction
        const envelope = await encryptRecord(record);

        // Store encrypted envelope in Dexie table
        await table.put({
          id,
          envelope,
          updated_at: now,
          updatedAt: now,
          deleted_at: null,
          deletedAt: null,
          sync_status: 'pending'
        });

        // 1e. Queue envelope in outbox (no double encryption)
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: resource,
          entityId: id,
          operation: 'create',
          payload: { id, envelope, updatedAt: now },
          createdAt: now
        });

        // Trigger background sync non-blockingly
        processSyncQueue(getToken).catch(console.warn);

        return record as T;
      } finally {
        setIsPending(false);
      }
    }
  };

  const updateMutation = {
    isPending,
    mutate: (params: { id: string; data: any }, options?: { onSuccess?: (data: any) => void; onError?: (err: any) => void }) => {
      updateMutation.mutateAsync(params)
        .then((res) => options?.onSuccess?.(res))
        .catch((err) => options?.onError?.(err));
    },
    mutateAsync: async (params: { id: string; data: any }) => {
      setIsPending(true);
      try {
        const table = (db as any)[resource];
        if (!table) throw new Error(`Table ${resource} not found in database`);

        const now = Date.now();
        const existingRow = await table.get(params.id);
        let baseRecord: any = {};
        if (existingRow?.envelope) {
          try {
            baseRecord = await decryptRecord(existingRow.envelope as Envelope);
          } catch {
            baseRecord = existingRow;
          }
        } else if (existingRow) {
          baseRecord = existingRow;
        }

        const updated: any = {
          ...baseRecord,
          ...params.data,
          id: params.id,
          updated_at: now,
          deleted_at: null,
          deletedAt: null,
          sync_status: 'pending'
        };

        // 1c. Encrypt record outside transaction
        const envelope = await encryptRecord(updated);

        await table.put({
          id: params.id,
          envelope,
          updated_at: now,
          updatedAt: now,
          deleted_at: null,
          deletedAt: null,
          sync_status: 'pending'
        });

        // Queue update in outbox
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: resource,
          entityId: params.id,
          operation: 'update',
          payload: { id: params.id, envelope, updatedAt: now },
          createdAt: now
        });

        // Trigger background sync non-blockingly
        processSyncQueue(getToken).catch(console.warn);

        return updated as T;
      } finally {
        setIsPending(false);
      }
    }
  };

  const deleteMutation = {
    isPending,
    mutate: (id: string, options?: { onSuccess?: () => void; onError?: (err: any) => void }) => {
      deleteMutation.mutateAsync(id)
        .then(() => options?.onSuccess?.())
        .catch((err) => options?.onError?.(err));
    },
    mutateAsync: async (id: string) => {
      setIsPending(true);
      try {
        const table = (db as any)[resource];
        if (!table) throw new Error(`Table ${resource} not found in database`);

        const now = Date.now();
        const existingRow = await table.get(id);
        let baseRecord: any = { id };
        if (existingRow?.envelope) {
          try {
            baseRecord = await decryptRecord(existingRow.envelope as Envelope);
          } catch {
            baseRecord = existingRow;
          }
        } else if (existingRow) {
          baseRecord = existingRow;
        }

        // Soft delete
        const softDeleted: any = {
          ...baseRecord,
          id,
          deleted_at: now,
          deletedAt: now,
          updated_at: now,
          updatedAt: now,
          sync_status: 'pending'
        };

        const envelope = await encryptRecord(softDeleted);

        await table.put({
          id,
          envelope,
          updated_at: now,
          updatedAt: now,
          deleted_at: now,
          deletedAt: now,
          sync_status: 'pending'
        });

        // Queue delete in outbox
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          entityType: resource,
          entityId: id,
          operation: 'delete',
          payload: { id, envelope, deletedAt: now },
          createdAt: now
        });

        // Trigger background sync non-blockingly
        processSyncQueue(getToken).catch(console.warn);
      } finally {
        setIsPending(false);
      }
    }
  };

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation
  };
}
