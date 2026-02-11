import { useMemo, useState } from "react";

export default function useAlbumRatings(albums) {
  const initialRatings = useMemo(
    () =>
      Object.fromEntries(
        albums.map((album) => [
          `${album.artist} - ${album.title}`,
          album.rating ?? 0,
        ])
      ),
    [albums]
  );

  const [ratings, setRatings] = useState(() => initialRatings);

  const updateRating = (key, value) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return { ratings, updateRating };
}
