import { useEffect, useMemo, useState } from "react";

export default function useAlbumRatings(albums) {
  const albumKeys = useMemo(
    () => albums.map((album) => `${album.artist} - ${album.title}`),
    [albums]
  );

  const [ratings, setRatings] = useState(() =>
    Object.fromEntries(albumKeys.map((key) => [key, 0]))
  );

  useEffect(() => {
    setRatings((prev) => {
      const next = {};
      albumKeys.forEach((key) => {
        next[key] = prev[key] ?? 0;
      });
      return next;
    });
  }, [albumKeys]);

  const updateRating = (key, value) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return { ratings, updateRating };
}
