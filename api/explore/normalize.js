export function normalizeText(value) {
  return (value ?? "")
    .toString()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function makeResourceKey(artistName, albumTitle) {
  return `${normalizeText(artistName)}::${normalizeText(albumTitle)}`;
}
