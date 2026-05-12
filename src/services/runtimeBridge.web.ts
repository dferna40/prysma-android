import type { RuntimeBridge } from './runtimeBridge.types';
import {
  checkEndpointFromClient,
  readFileAsDataUrl,
} from './runtimeBridge.shared';

export const runtimeBridgeWeb: RuntimeBridge = {
  async checkEndpoint(targetUrl: string) {
    return checkEndpointFromClient(targetUrl);
  },

  async storeMarkdownImage(file: File) {
    return {
      path: await readFileAsDataUrl(file),
      storage: 'embedded',
    } as const;
  },
};
