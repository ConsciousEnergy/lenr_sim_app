/**
 * Polyfills required before test modules load.
 * React Router v7 accesses TextEncoder/TextDecoder at import time;
 * jsdom does not provide them, so suite import of react-router-dom fails.
 */
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
