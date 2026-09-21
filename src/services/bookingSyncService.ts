import { db } from '../db/db';
import { decryptRecord, Envelope } from './cryptoService';
import { isNotDeleted } from '../config/queryHooks';
import { Course, Group, Settings } from '../types';

async function getDecryptedTable<T extends { id?: string; envelope?: any; deleted_at?: number | null; deletedAt?: number | null }>(tableName: string): Promise<T[]> {
  try {
    const table = (db as any)[tableName];
    if (!table) return [];
    const rawItems = await table.toArray();
    const result: T[] = [];
    for (const item of rawItems) {
      if (item.envelope) {
        try {
          const plain = await decryptRecord<T>(item.envelope as Envelope);
          if (isNotDeleted(plain) && isNotDeleted(item)) {
            result.push({ ...plain, id: item.id });
          }
        } catch {
          // If decryption fails, skip
        }
      } else {
        if (isNotDeleted(item)) {
          result.push(item as T);
        }
      }
    }
    return result;
  } catch (e) {
    console.warn(`[bookingSyncService] Failed to read table ${tableName}:`, e);
    return [];
  }
}

let syncBookingTimeout: any = null;

/**
 * Compiles public courses, groups, and center details and synchronizes
 * them to the public server so that online booking links (/book?org=...)
 * immediately display available courses and groups to any visitor on any device.
 */
export async function syncBookingCatalogToServer(organization?: any): Promise<void> {
  if (syncBookingTimeout) {
    clearTimeout(syncBookingTimeout);
  }

  syncBookingTimeout = setTimeout(async () => {
    try {
      const [courses, groups, settingsList] = await Promise.all([
        getDecryptedTable<Course>('courses'),
        getDecryptedTable<Group>('groups'),
        getDecryptedTable<Settings>('settings')
      ]);

      const currentSettings = settingsList[0];
      const academyName = currentSettings?.academyName || 
                          localStorage.getItem('masar_academy_name') || 
                          organization?.name || 
                          'أكاديمية مسار التعليمية';
      const teacherName = currentSettings?.teacherName || 
                          localStorage.getItem('masar_teacher_name') || 
                          '';

      const bookingCode = (organization as any)?.publicMetadata?.booking_code ||
                          organization?.slug ||
                          organization?.id ||
                          localStorage.getItem('masar_booking_code') ||
                          'default';

      // Sanitize active courses for public display
      const activeCourses = (courses || [])
        .filter(c => !c.deleted_at && c.isActive !== false)
        .map(c => ({
          id: c.id,
          name: c.name,
          subject: c.subject || c.name,
          gradeLevel: (c as any).gradeLevel || (c as any).grade || '',
          price: c.price || 0,
          paymentType: c.paymentType || 'monthly',
          isActive: true
        }));

      // Sanitize groups for public display
      const activeGroups = (groups || [])
        .filter(g => !g.deleted_at)
        .map(g => ({
          id: g.id,
          courseId: g.courseId,
          name: g.name,
          type: g.type || 'in_person',
          daysOfWeek: Array.isArray(g.daysOfWeek) ? g.daysOfWeek : [],
          startTime: g.startTime || '',
          endTime: g.endTime || '',
          maxStudents: g.maxStudents || 25,
          room: g.room || ''
        }));

      const payload = {
        bookingCode,
        orgId: organization?.id || '',
        orgSlug: organization?.slug || '',
        orgName: organization?.name || academyName,
        academyName,
        teacherName,
        courses: activeCourses,
        groups: activeGroups,
        syncedAt: Date.now()
      };

      // 1. Sync to local backend server
      const serverEndpoints = ['/api/public/sync-booking-catalog', '/public/sync-booking-catalog'];
      for (const ep of serverEndpoints) {
        try {
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) break;
        } catch {
          // ignore transient local network failure
        }
      }

      // 2. Also attempt upstream worker if booking code is available
      if (bookingCode && bookingCode !== 'default') {
        try {
          await fetch(`https://masar-api.weroperking.workers.dev/api/public/booking/${encodeURIComponent(bookingCode)}/catalog`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        } catch {
          // non-blocking
        }
      }

      console.log(`[bookingSyncService] Synced booking catalog (${activeCourses.length} courses, ${activeGroups.length} groups) for code: ${bookingCode}`);
    } catch (err) {
      console.warn('[bookingSyncService] Sync booking catalog error:', err);
    }
  }, 1000);
}
