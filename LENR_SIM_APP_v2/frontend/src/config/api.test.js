import { resolveProductionApiBase, getWebSocketUrl, resolveApiUrl } from './api';

describe('resolveProductionApiBase', () => {
  it('maps the same-origin sentinel to an empty base so /api stays relative', () => {
    expect(resolveProductionApiBase('same-origin')).toBe('');
    expect(resolveProductionApiBase('SAME-ORIGIN')).toBe('');
    expect(resolveProductionApiBase('/')).toBe('');
    expect(resolveProductionApiBase(' same-origin ')).toBe('');
  });

  it('keeps the split-host default when nothing is configured', () => {
    expect(resolveProductionApiBase('')).toBe('https://api.conscious.energy');
    expect(resolveProductionApiBase(undefined)).toBe('https://api.conscious.energy');
  });

  it('passes explicit hosts through without a trailing slash', () => {
    expect(resolveProductionApiBase('https://beta.example.org/')).toBe('https://beta.example.org');
    expect(resolveProductionApiBase('http://127.0.0.1:8010')).toBe('http://127.0.0.1:8010');
  });
});

describe('dev/test base URL helpers', () => {
  // Under Jest NODE_ENV=test, API_BASE_URL is '' (dev-proxy mode), which is the
  // same shape a same-origin production build produces.
  it('resolves API paths relative to the page', () => {
    expect(resolveApiUrl('/api/health')).toBe('/api/health');
    expect(resolveApiUrl('api/health')).toBe('/api/health');
  });

  it('derives the WebSocket URL from window.location when the base is empty', () => {
    const url = getWebSocketUrl('/api/ws/simulation/lenr/abc');
    expect(url).toBe(`ws://${window.location.host}/api/ws/simulation/lenr/abc`);
  });
});
