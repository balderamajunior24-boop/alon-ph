/* Client-side inquiry list — shared across pages.
 * Stored in localStorage; a custom "inquiry:changed" event keeps the
 * header badge and drawer in sync.
 */
const KEY = "alon-ph:inquiry-list";

export function getItems() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveItems(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("inquiry:changed"));
}

export function count() {
  return getItems().reduce((s, i) => s + Math.max(1, Number(i.qty) || 1), 0);
}

// Add or merge a line. `id` is the variant id (or `service:<id>`).
export function addItem({ id, productName, variantName, qty = 1, minQty = 1, note = "" }) {
  const items = getItems();
  const existing = items.find((i) => i.id === id);
  const minimum = Math.max(1, Number(minQty) || 1);
  if (existing) {
    existing.minQty = Math.max(minimum, Number(existing.minQty) || 1);
    existing.qty = Math.max(existing.minQty, Number(existing.qty) || 0) + Math.max(existing.minQty, Number(qty) || 0);
  } else items.push({ id, productName, variantName, qty: Math.max(minimum, Number(qty) || minimum), minQty: minimum, note });
  saveItems(items);
}

export function removeItem(id) {
  saveItems(getItems().filter((i) => i.id !== id));
}

export function setQty(id, qty) {
  const items = getItems();
  const it = items.find((i) => i.id === id);
  if (it) it.qty = Math.max(Number(it.minQty) || 1, qty);
  saveItems(items);
}

export function clear() {
  saveItems([]);
}
