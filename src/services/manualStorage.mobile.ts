import manualSeed from '../data/manual.json';
import type { ManualData } from '../types';
import { resolveCapacitorBridge } from './capacitorBridge';
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

const MOBILE_STORAGE_KEY = `${STORAGE_KEY}:mobile`;
const MOBILE_MANUAL_FILE_PATH = 'prysma/manual-data.json';
const MOBILE_REVISION_FILE_PATH = 'prysma/manual-revision.txt';

const readMobileSnapshot = () => readStoredJson<ManualData>(MOBILE_STORAGE_KEY);

const writeMobileSnapshot = (manualData: ManualData) => {
  writeStoredJson(MOBILE_STORAGE_KEY, manualData);
};

const readFromFilesystem = async <T,>(filePath: string): Promise<T | null> => {
  const { directoryData, filesystem } = await resolveCapacitorBridge();

  if (!filesystem) {
    return null;
  }

  try {
    const result = await filesystem.readFile({
      directory: directoryData,
      path: filePath,
    });

    return JSON.parse(result.data) as T;
  } catch {
    return null;
  }
};

const writeToFilesystem = async (filePath: string, payload: unknown) => {
  const { directoryData, filesystem } = await resolveCapacitorBridge();

  if (!filesystem) {
    return false;
  }

  await filesystem.writeFile({
    directory: directoryData,
    path: filePath,
    data: JSON.stringify(payload, null, 2),
    recursive: true,
  });

  return true;
};

const readRevisionFromFilesystem = async () => {
  const { directoryData, filesystem } = await resolveCapacitorBridge();

  if (!filesystem) {
    return null;
  }

  try {
    const result = await filesystem.readFile({
      directory: directoryData,
      path: MOBILE_REVISION_FILE_PATH,
    });

    return result.data || null;
  } catch {
    return null;
  }
};

const writeRevisionToFilesystem = async (revision: string) => {
  const { directoryData, filesystem } = await resolveCapacitorBridge();

  if (!filesystem) {
    return false;
  }

  await filesystem.writeFile({
    directory: directoryData,
    path: MOBILE_REVISION_FILE_PATH,
    data: revision,
    recursive: true,
  });

  return true;
};

export const manualStorageMobile: ManualStorage = {
  async healthCheck(): Promise<boolean> {
    return true;
  },

  async loadManual() {
    // Priorizamos Filesystem cuando la shell nativa lo exponga.
    // Mientras tanto, mantenemos un fallback estable en localStorage.
    const filesystemManual = await readFromFilesystem<ManualData>(MOBILE_MANUAL_FILE_PATH);
    const filesystemRevision = await readRevisionFromFilesystem();

    if (filesystemManual) {
      const revision = filesystemRevision || readRevision();

      if (!filesystemRevision) {
        persistRevision(revision);
        await writeRevisionToFilesystem(revision);
      }

      return {
        data: filesystemManual,
        revision,
        source: 'local-storage',
      } as const;
    }

    const storedManual = readMobileSnapshot();
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
    const filesystemAvailable = await writeToFilesystem(MOBILE_MANUAL_FILE_PATH, data);
    const revisionPersistedInFilesystem = filesystemAvailable
      ? await writeRevisionToFilesystem(nextRevision)
      : false;

    // Mantenemos una copia local para sesiones mixtas y como red de seguridad.
    writeMobileSnapshot(data);
    persistRevision(nextRevision);

    if (filesystemAvailable && !revisionPersistedInFilesystem) {
      throw new Error('storage-unavailable');
    }

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
