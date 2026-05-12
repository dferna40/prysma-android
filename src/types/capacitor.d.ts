export interface CapacitorFilesystemReadFileOptions {
  directory?: string;
  encoding?: string;
  path: string;
}

export interface CapacitorFilesystemWriteFileOptions {
  data: string;
  directory?: string;
  encoding?: string;
  path: string;
  recursive?: boolean;
}

export interface CapacitorFilesystemWriteFileResult {
  uri?: string;
}

export interface CapacitorFilesystemPlugin {
  readFile(
    options: CapacitorFilesystemReadFileOptions,
  ): Promise<{ data: string }>;
  writeFile(
    options: CapacitorFilesystemWriteFileOptions,
  ): Promise<CapacitorFilesystemWriteFileResult | unknown>;
}

export interface CapacitorRuntime {
  convertFileSrc?: (filePath: string) => string;
  Filesystem?: CapacitorFilesystemPlugin;
  Plugins?: {
    Filesystem?: CapacitorFilesystemPlugin;
  };
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime;
  }
}

