export interface StoredMarkdownImage {
  path: string;
  storage: 'embedded' | 'filesystem';
}

export interface EndpointCheckResult {
  ok: boolean;
  reason?: 'invalid-url' | 'request-failed' | 'unsupported-local-target';
  status?: number;
  statusText?: string;
  url: string;
}

export interface RuntimeBridge {
  checkEndpoint(targetUrl: string): Promise<EndpointCheckResult>;
  storeMarkdownImage(file: File): Promise<StoredMarkdownImage>;
}
