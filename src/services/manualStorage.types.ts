import type { ManualData } from '../types';

export interface ManualLoadResult {
  data: ManualData;
  revision: string;
  source: 'bundled' | 'local-storage';
}

export interface ManualSaveResult {
  ok: true;
  revision: string;
}

export interface ManualStorage {
  healthCheck(): Promise<boolean>;
  loadManual(): Promise<ManualLoadResult>;
  saveManual(data: ManualData, expectedRevision?: string): Promise<ManualSaveResult>;
  importManualFromFile(file: File): Promise<unknown>;
  exportJsonToFile(payload: unknown, filename: string): Promise<void>;
}
