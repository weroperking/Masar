/**
 * Legacy PIN Migration for Masar
 * Migrates plaintext PINs from profilesConfig to hashed pinConfigs and scrubs plaintext.
 */

import { db } from '../db/db';
import { getPinConfig, setPin, updatePinFlags } from './pinService';

const migratedOrgs = new Set<string>();

export async function migrateLegacyPins(orgId: string): Promise<void> {
  if (!orgId || migratedOrgs.has(orgId)) {
    return;
  }

  try {
    let settings = await db.settings.get(orgId);
    if (!settings) {
      settings = await db.settings.get('settings_' + orgId);
    }
    if (!settings) {
      const all = await db.settings.toArray();
      settings = all.find(s => s.id === orgId || s.id === 'settings_' + orgId || s.profilesConfig?.adminPin) || all[0];
    }

    if (!settings) {
      migratedOrgs.add(orgId);
      return;
    }

    const cfg = settings.profilesConfig;
    if (!cfg) {
      migratedOrgs.add(orgId);
      return;
    }

    let needsScrub = false;

    // 1. Admin PIN migration (if cfg.adminPin and no pinConfigs admin row)
    const existingAdmin = await getPinConfig(orgId, 'admin');
    if (cfg.adminPin && !existingAdmin) {
      await setPin(orgId, 'admin', cfg.adminPin);
      needsScrub = true;
    }

    // 2. Assistant PIN migration
    const existingAssistant = await getPinConfig(orgId, 'assistant');
    if (cfg.assistantPin && !existingAssistant) {
      await setPin(orgId, 'assistant', cfg.assistantPin, {
        assistantPinRequired: Boolean(cfg.assistantPinRequired)
      });
      needsScrub = true;
    }

    // 3. Flags migration
    if (cfg.assistantPinRequired !== undefined || cfg.autoLockMinutes !== undefined) {
      await updatePinFlags(orgId, 'admin', {
        assistantPinRequired: cfg.assistantPinRequired ?? false,
        autoLockMinutes: cfg.autoLockMinutes ?? 15
      });
    }

    // 4. SCRUB: delete adminPin and assistantPin from profilesConfig, then save
    if (needsScrub || 'adminPin' in cfg || 'assistantPin' in cfg) {
      delete (cfg as any).adminPin;
      delete (cfg as any).assistantPin;

      await db.settings.put({
        ...settings,
        profilesConfig: { ...cfg },
        updated_at: Date.now()
      });
    }

    migratedOrgs.add(orgId);
  } catch (err) {
    console.warn('[pinMigration] Migration encountered an error:', err);
  }
}
