const REVISION_KEY = 'knowledge-manual-revision-v1';

export const STORAGE_KEY = 'knowledge-manual-state-v2';
export { REVISION_KEY };

export const buildRevision = () => `${Date.now()}`;

export const readStoredJson = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    return null;
  }
};

export const writeStoredJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readRevision = () => {
  if (typeof window === 'undefined') {
    return buildRevision();
  }

  const storedRevision = window.localStorage.getItem(REVISION_KEY);
  return storedRevision || buildRevision();
};

export const persistRevision = (revision: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(REVISION_KEY, revision);
};

export const readCurrentRevision = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(REVISION_KEY);
};

export const importJsonFile = async (file: File): Promise<unknown> =>
  JSON.parse(await file.text());

export const exportJsonFile = async (payload: unknown, filename: string): Promise<void> => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};
