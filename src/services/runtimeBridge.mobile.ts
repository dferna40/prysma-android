import { resolveCapacitorBridge } from './capacitorBridge';
import type { RuntimeBridge } from './runtimeBridge.types';
import {
  checkEndpointFromClient,
  readFileAsDataUrl,
} from './runtimeBridge.shared';

const MOBILE_IMAGE_DIRECTORY = 'prysma/images';

const dataUrlToBase64Payload = (dataUrl: string) => {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex === -1) {
    throw new Error('No se pudo extraer el contenido base64 de la imagen.');
  }

  return dataUrl.slice(separatorIndex + 1);
};

const buildImageFileName = (file: File) => {
  const extension = file.name.includes('.')
    ? `.${file.name.split('.').pop()?.toLowerCase() ?? 'png'}`
    : '.png';

  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
};

export const runtimeBridgeMobile: RuntimeBridge = {
  async checkEndpoint(targetUrl: string) {
    return checkEndpointFromClient(targetUrl);
  },

  async storeMarkdownImage(file: File) {
    const dataUrl = await readFileAsDataUrl(file);
    const { convertFileSrc, directoryData, filesystem } = await resolveCapacitorBridge();

    if (!filesystem || !convertFileSrc) {
      return {
        path: dataUrl,
        storage: 'embedded',
      } as const;
    }

    try {
      const imageFilePath = `${MOBILE_IMAGE_DIRECTORY}/${buildImageFileName(file)}`;
      const writeResult = await filesystem.writeFile({
        directory: directoryData,
        path: imageFilePath,
        data: dataUrlToBase64Payload(dataUrl),
        recursive: true,
      });

      const uri =
        typeof writeResult === 'object' &&
        writeResult !== null &&
        'uri' in writeResult &&
        typeof writeResult.uri === 'string'
          ? writeResult.uri
          : imageFilePath;

      return {
        path: convertFileSrc(uri),
        storage: 'filesystem',
      } as const;
    } catch {
      return {
        path: dataUrl,
        storage: 'embedded',
      } as const;
    }
  },
};
