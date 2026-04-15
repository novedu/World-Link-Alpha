export function parseTags(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : String(value).replace(/，/g, ',').split(',');
  return [...new Set(source.map((tag) => String(tag || '').trim()).filter(Boolean))];
}
