import type { EndpointCheckResult } from './runtimeBridge.types';

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export const isNativeMobileShell = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const capacitorRuntime = window.Capacitor;

  if (!capacitorRuntime) {
    return false;
  }

  if (typeof capacitorRuntime.isNativePlatform === 'function') {
    return capacitorRuntime.isNativePlatform();
  }

  if (typeof capacitorRuntime.getPlatform === 'function') {
    const platform = capacitorRuntime.getPlatform();
    return platform === 'android' || platform === 'ios';
  }

  return false;
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo leer la imagen como data URL.'));
    };

    reader.onerror = () => reject(reader.error ?? new Error('Error leyendo la imagen.'));
    reader.readAsDataURL(file);
  });

export const checkEndpointFromClient = async (
  targetUrl: string,
): Promise<EndpointCheckResult> => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return {
      ok: false,
      reason: 'invalid-url',
      url: targetUrl,
    };
  }

  if (LOCALHOST_HOSTNAMES.has(parsedUrl.hostname)) {
    return {
      ok: false,
      reason: 'unsupported-local-target',
      url: targetUrl,
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: targetUrl,
    };
  } catch {
    return {
      ok: false,
      reason: 'request-failed',
      url: targetUrl,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
};
