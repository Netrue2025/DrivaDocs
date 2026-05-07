export function documentUrlFromStorageKey(storageKey?: string | null, download = false) {
  if (!storageKey || !storageKey.startsWith("uploads/")) return null;
  const encodedPath = storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/api/${encodedPath}${download ? "?download=1" : ""}`;
}
