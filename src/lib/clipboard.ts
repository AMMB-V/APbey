export function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.reject(new Error('El portapapeles no está disponible.'));
  }

  return navigator.clipboard.writeText(text);
}
