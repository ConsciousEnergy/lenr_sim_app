/**
 * Trigger a browser file download from a Blob or ArrayBuffer.
 * @param {Blob|ArrayBuffer|Uint8Array} data
 * @param {string} filename
 * @param {string} [mime]
 */
export function downloadBlob(data, filename, mime = 'application/octet-stream') {
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
