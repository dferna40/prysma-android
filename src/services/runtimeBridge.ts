import { runtimeBridgeMobile } from './runtimeBridge.mobile';
import {
  isNativeMobileShell,
} from './runtimeBridge.shared';
import { runtimeBridgeWeb } from './runtimeBridge.web';

export type {
  EndpointCheckResult,
  RuntimeBridge,
  StoredMarkdownImage,
} from './runtimeBridge.types';

export const runtimeBridge = isNativeMobileShell()
  ? runtimeBridgeMobile
  : runtimeBridgeWeb;

export { runtimeBridgeMobile, runtimeBridgeWeb };
