/**
 * jsdom does not provide TextEncoder/TextDecoder; react-router (and others)
 * need them at import time, so this runs via Jest `setupFiles`.
 */
/* eslint-env node */
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
