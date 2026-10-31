import {
  classifyTransportError,
  schematicFallbackMessage,
  streamFailureMessage,
} from './apiUserFacingError';

describe('classifyTransportError', () => {
  it('classifies CORS failures without science overclaim', () => {
    const result = classifyTransportError(new Error('Blocked by CORS policy'));
    expect(result.kind).toBe('cors');
    expect(result.isTransport).toBe(true);
    expect(result.message).toMatch(/VITE_API_URL/);
    expect(result.message).not.toMatch(/validated|confirmed|proof/i);
  });

  it('classifies Failed to fetch as network', () => {
    const err = new TypeError('Failed to fetch');
    const result = classifyTransportError(err);
    expect(result.kind).toBe('network');
    expect(result.message).toMatch(/placeholder/i);
  });

  it('classifies websocket failures', () => {
    const result = classifyTransportError('WebSocket connection failed');
    expect(result.kind).toBe('websocket');
    expect(result.message).toMatch(/not scientific/i);
  });
});

describe('schematicFallbackMessage', () => {
  it('labels local fallback as schematic, not lab data', () => {
    const msg = schematicFallbackMessage(new Error('Failed to fetch'));
    expect(msg).toMatch(/schematic/i);
    expect(msg).not.toMatch(/laboratory measurement confirmed/i);
  });
});

describe('streamFailureMessage', () => {
  it('phrases stream errors as connectivity', () => {
    const msg = streamFailureMessage('Stream connection failed');
    expect(msg).toMatch(/WebSocket|connectivity|split-origin|scientific/i);
  });
});
