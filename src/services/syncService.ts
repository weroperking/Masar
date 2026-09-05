import { db } from '../db/db';

const TABLES = [
  'students', 'courses', 'groups', 'payments', 'attendanceSessions',
  'attendanceRecords', 'assessments', 'assessmentGrades', 'products',
  'courseProducts', 'sessionPayments', 'ledgerEntries', 'bookingRequests',
  'productSales', 'events', 'users', 'messageTemplates', 'settings', 'qrCards'
];

export const syncService = {
  /**
   * Pushes pending records to the backend, pulls new records, and updates local Dexie.
   * Uses the Clerk session token for authentication and tenant isolation.
   */
  async syncPendingData(getToken: () => Promise<string | null>) {
    console.log('Sync Service: Starting sync loop...');
    try {
      const token = await getToken();
      if (!token) {
        console.log('Sync Service: No active Clerk session, skipping sync.');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. PUSH: Collect all pending records
      const pendingData: { table: string, records: any[] }[] = [];
      
      for (const table of TABLES) {
        const tableInstance = (db as any)[table];
        if (!tableInstance) continue;
        const records = await tableInstance.where('sync_status').equals('pending').toArray();
        if (records.length > 0) {
          pendingData.push({ table, records });
        }
      }

      let hasPushed = false;
      if (pendingData.length > 0) {
        console.log(`Sync Service: Pushing ${pendingData.reduce((acc, curr) => acc + curr.records.length, 0)} pending records...`);
        try {
          const pushRes = await fetch('/api/sync/push', {
            method: 'POST',
            headers,
            body: JSON.stringify(pendingData)
          });
          
          if (pushRes.ok) {
            // Update local records to synced
            await db.transaction('rw', TABLES.map(t => (db as any)[t]), async () => {
              for (const group of pendingData) {
                for (const record of group.records) {
                  await (db as any)[group.table].update(record.id, { sync_status: 'synced' });
                }
              }
            });
            hasPushed = true;
          } else {
            console.error('Sync Service: Push failed with status', pushRes.status);
          }
        } catch (e) {
          console.error('Sync Service: Push fetch error', e);
        }
      }

      // 2. PULL: Fetch remote changes since last sync
      const meta = await db.syncMeta.get('lastSynced');
      const sinceTimestamp = meta?.timestamp || 0;
      const sinceIso = new Date(sinceTimestamp).toISOString();

      console.log(`Sync Service: Pulling changes since ${sinceIso}...`);
      
      try {
        const pullRes = await fetch(`/api/sync/pull?since=${encodeURIComponent(sinceIso)}`, {
          headers
        });

        if (pullRes.ok) {
          const pulledData = await pullRes.json();
          // pulledData expected to be grouped by table: { students: [...], courses: [...] }
          const tablesToUpdate = Object.keys(pulledData).filter(t => TABLES.includes(t));
          
          if (tablesToUpdate.length > 0) {
            await db.transaction('rw', tablesToUpdate.map(t => (db as any)[t]), async () => {
              for (const table of tablesToUpdate) {
                const records = pulledData[table];
                for (const record of records) {
                  // Handle soft deletes if present in backend response
                  if (record.deleted_at) {
                    await (db as any)[table].delete(record.id);
                  } else {
                    await (db as any)[table].put({ ...record, sync_status: 'synced' });
                  }
                }
              }
            });
            console.log(`Sync Service: Applied remote changes to ${tablesToUpdate.length} tables.`);
          }
          
          // Update lastSynced timestamp only on successful pull
          await db.syncMeta.put({ id: 'lastSynced', timestamp: Date.now() });
        } else {
          console.error('Sync Service: Pull failed with status', pullRes.status);
        }
      } catch (e) {
         console.error('Sync Service: Pull fetch error', e);
      }

    } catch (error) {
      console.error('Sync Service Error:', error);
    }
  }
};
