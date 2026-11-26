import {
  probeApiHealthOk,
  shouldPreferEngineBootstrap,
} from './preferEngineBootstrap';

describe('preferEngineBootstrap', () => {
  test('fires only when health OK, no samples, and not in maintenance', () => {
    expect(shouldPreferEngineBootstrap({
      healthOk: true,
      hasSimulationData: false,
      maintenanceHideRun: false,
    })).toBe(true);
  });

  test('refuses when health is down (stay Local Calc)', () => {
    expect(shouldPreferEngineBootstrap({
      healthOk: false,
      hasSimulationData: false,
    })).toBe(false);
  });

  test('refuses when samples already bound', () => {
    expect(shouldPreferEngineBootstrap({
      healthOk: true,
      hasSimulationData: true,
    })).toBe(false);
  });

  test('refuses during maintenance hide-run', () => {
    expect(shouldPreferEngineBootstrap({
      healthOk: true,
      hasSimulationData: false,
      maintenanceHideRun: true,
    })).toBe(false);
  });

  test('probeApiHealthOk returns true only on HTTP ok', async () => {
    const resolveUrl = (path) => `http://test${path}`;
    const okFetch = jest.fn().mockResolvedValue({ ok: true });
    await expect(probeApiHealthOk(resolveUrl, okFetch)).resolves.toBe(true);
    expect(okFetch).toHaveBeenCalledWith('http://test/api/health', { method: 'GET' });

    const badFetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(probeApiHealthOk(resolveUrl, badFetch)).resolves.toBe(false);

    const throwFetch = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(probeApiHealthOk(resolveUrl, throwFetch)).resolves.toBe(false);
  });
});
