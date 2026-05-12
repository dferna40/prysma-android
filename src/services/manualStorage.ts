import { isNativeMobileShell } from './runtimeBridge.shared';
import { manualStorageMobile } from './manualStorage.mobile';
import { manualStorageWeb } from './manualStorage.web';
export type {
  ManualLoadResult,
  ManualSaveResult,
  ManualStorage,
} from './manualStorage.types';

export const manualStorage = isNativeMobileShell()
  ? manualStorageMobile
  : manualStorageWeb;

export { manualStorageMobile, manualStorageWeb };
