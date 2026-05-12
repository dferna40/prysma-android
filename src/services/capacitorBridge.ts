interface CapacitorFilesystemReadFileOptions {
  directory?: string;
  encoding?: string;
  path: string;
}

interface CapacitorFilesystemWriteFileOptions {
  data: string;
  directory?: string;
  encoding?: string;
  path: string;
  recursive?: boolean;
}

interface CapacitorFilesystemWriteFileResult {
  uri?: string;
}

interface CapacitorFilesystemPluginLike {
  readFile(
    options: CapacitorFilesystemReadFileOptions,
  ): Promise<{ data: string }>;
  writeFile(
    options: CapacitorFilesystemWriteFileOptions,
  ): Promise<CapacitorFilesystemWriteFileResult | unknown>;
}

interface CapacitorCoreLike {
  convertFileSrc?: (filePath: string) => string;
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

interface CapacitorFilesystemModuleLike {
  Directory?: {
    Data?: string;
  };
  Filesystem?: CapacitorFilesystemPluginLike;
}

interface ResolvedCapacitorBridge {
  convertFileSrc?: (filePath: string) => string;
  directoryData?: string;
  filesystem: CapacitorFilesystemPluginLike | null;
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

const loadCapacitorCoreModule = async (): Promise<CapacitorCoreLike | null> => {
  try {
    const capacitorCore = await import('@capacitor/core');
    return capacitorCore.Capacitor ?? null;
  } catch {
    return window.Capacitor ?? null;
  }
};

const loadCapacitorFilesystemModule = async (): Promise<CapacitorFilesystemModuleLike | null> => {
  try {
    const filesystemModule = await import('@capacitor/filesystem');
    return filesystemModule as CapacitorFilesystemModuleLike;
  } catch {
    return null;
  }
};

export const resolveCapacitorBridge = async (): Promise<ResolvedCapacitorBridge> => {
  if (typeof window === 'undefined') {
    return {
      filesystem: null,
    };
  }

  const [coreModule, filesystemModule] = await Promise.all([
    loadCapacitorCoreModule(),
    loadCapacitorFilesystemModule(),
  ]);

  const windowFilesystem =
    window.Capacitor?.Filesystem ?? window.Capacitor?.Plugins?.Filesystem ?? null;

  return {
    convertFileSrc: coreModule?.convertFileSrc ?? window.Capacitor?.convertFileSrc,
    directoryData: filesystemModule?.Directory?.Data,
    filesystem: filesystemModule?.Filesystem ?? windowFilesystem,
    getPlatform: coreModule?.getPlatform ?? window.Capacitor?.getPlatform,
    isNativePlatform:
      coreModule?.isNativePlatform ?? window.Capacitor?.isNativePlatform,
  };
};
