import { useEffect, useState } from "react";

export default function useAlbumCovers(albums) {
  const [covers, setCovers] = useState({});

  useEffect(() => {
    if (!albums?.length) {
      setCovers({});
      return;
    }

    let cancelled = false;
    async function loadCovers() {
      const entries = await Promise.all(
        albums.map(async (album) => {
          const key = `${album.artist} - ${album.title}`;
          const term = encodeURIComponent(`${album.artist} ${album.title}`);
          try {
            const response = await fetch(
              `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`
            );
            if (!response.ok) return null;
            const data = await response.json();
            const artwork = data?.results?.[0]?.artworkUrl100;
            if (!artwork) return null;
            return [key, artwork.replace("100x100bb", "600x600bb")];
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setCovers(Object.fromEntries(entries.filter(Boolean)));
      }
    }

    loadCovers();
    return () => {
      cancelled = true;
    };
  }, [albums]);

  return covers;
}
