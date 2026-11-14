export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB");
}

export function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function splitList(text) {
  return text.split(",").map(item => item.trim()).filter(Boolean);
}

export function sameText(a, b) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function countBy(items) {
  const counts = new Map();
  items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
