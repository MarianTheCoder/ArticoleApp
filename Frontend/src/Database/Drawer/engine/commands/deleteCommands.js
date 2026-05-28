// Returns selected item id when selection points at a whole item.
export function getSelectedItemId(selected) {
  if (!selected?.itemId) return null;

  return selected.itemId;
}
