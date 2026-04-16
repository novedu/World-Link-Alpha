export function formatQuotaLabel(block) {
  if (!block) return '--';
  if (block.limit === null) return `${block.used || 0} / ∞`;
  return `${block.used || 0} / ${block.limit || 0}`;
}
