export function normalizeText(value) {
  return (value ?? "")
    .toString()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function makeResourceKey(artistName, albumTitle) {
  return `${normalizeText(artistName)}::${normalizeText(albumTitle)}`;
}
