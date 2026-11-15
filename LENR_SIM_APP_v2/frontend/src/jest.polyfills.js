/**
 * jsdom does not provide TextEncoder/TextDecoder; react-router (and others)
 * need them at import time, so this runs via Jest `setupFiles`.
 */
const { TextEncoder, TextDecoder } = require('util');

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}
