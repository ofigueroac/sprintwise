import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import { testEnv } from './test/env';

describe('GET /health', () => {
  it('reports the service is up', async () => {
    const res = await createApp(testEnv()).request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('protects /runs without a bearer token', async () => {
    const res = await createApp(testEnv()).request('/runs', { method: 'POST' });

    expect(res.status).toBe(401);
  });

  it('allows the configured web origin', async () => {
    const app = createApp(testEnv({ WEB_ORIGIN: 'https://example.test' }));

    const res = await app.request('/health', {
      headers: { Origin: 'https://example.test' },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://example.test'
    );
  });
});
