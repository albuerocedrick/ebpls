export function validateDocumentFile(file) {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || !/\.(pdf|jpe?g|png)$/i.test(file.name)) return 'Use a PDF, JPG, or PNG file.';
  if (!file.size || file.size > 5 * 1024 * 1024) return 'Choose a non-empty file up to 5 MB.';
  return null;
}
