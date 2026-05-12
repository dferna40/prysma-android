import manualSeed from '../data/manual.json';
import type { ManualData } from '../types';
import type { ManualStorage } from './manualStorage.types';
import {
  STORAGE_KEY,
  buildRevision,
  exportJsonFile,
  importJsonFile,
  persistRevision,
  readCurrentRevision,
  readRevision,
  readStoredJson,
  writeStoredJson,
} from './manualStorage.shared';

export const manualStorageWeb: ManualStorage = {
  async healthCheck(): Promise<boolean> {
    return true;
  },

  async loadManual() {
    const storedManual = readStoredJson<ManualData>(STORAGE_KEY);
    const revision = readRevision();

    if (storedManual) {
      if (!readCurrentRevision()) {
        persistRevision(revision);
      }

      return {
        data: storedManual,
        revision,
        source: 'local-storage',
      } as const;
    }

    return {
      data: manualSeed as ManualData,
      revision,
      source: 'bundled',
    } as const;
  },

  async saveManual(data: ManualData, expectedRevision?: string) {
    if (typeof window === 'undefined') {
      throw new Error('storage-unavailable');
    }

    const currentRevision = readCurrentRevision();

    if (expectedRevision && currentRevision && expectedRevision !== currentRevision) {
      throw new Error('save-conflict');
    }

    const nextRevision = buildRevision();
    writeStoredJson(STORAGE_KEY, data);
    persistRevision(nextRevision);

    return {
      ok: true,
      revision: nextRevision,
    } as const;
  },

  async importManualFromFile(file: File) {
    return importJsonFile(file);
  },

  async exportJsonToFile(payload: unknown, filename: string) {
    return exportJsonFile(payload, filename);
  },
};
