import { ExternalApiError } from "../_lib/errors.js";

function escapeSearchTerm(value) {
  return (value ?? "").replace(/"/g, '\\"');
}

export class MusicBrainzClient {
  constructor(env) {
    this.baseUrl = env.MUSICBRAINZ_BASE_URL.replace(/\/$/, "");
    this.userAgent = env.MUSICBRAINZ_USER_AGENT;
  }

  async findAlbum(artistName, albumTitle) {
    const query = `release:"${escapeSearchTerm(albumTitle)}" AND artist:"${escapeSearchTerm(artistName)}"`;
    const params = new URLSearchParams({
      query,
      fmt: "json",
      limit: "1",
    });

    const response = await fetch(`${this.baseUrl}/release?${params.toString()}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ExternalApiError(
        payload?.error || "MusicBrainz request failed.",
        retryable ? 503 : 502,
        { status: response.status, retryable }
      );
    }

    const release = payload?.releases?.[0];
    if (!release) return null;

    const artistCredit = Array.isArray(release["artist-credit"])
      ? release["artist-credit"].find((entry) => typeof entry === "object" && entry?.artist)
      : null;
    const artist = artistCredit?.artist;

    return {
      artist: {
        mbid: artist?.id ?? null,
        name: artist?.name ?? artistName,
        sortName: artist?.["sort-name"] ?? null,
        country: artist?.country ?? null,
        disambiguation: artist?.disambiguation ?? null,
      },
      album: {
        mbid: release.id ?? null,
        title: release.title ?? albumTitle,
        releaseDate: release.date ?? null,
        primaryType: release?.["release-group"]?.["primary-type"] ?? null,
        secondaryTypes: release?.["release-group"]?.["secondary-types"] ?? [],
        coverArtUrl: release?.id
          ? `https://coverartarchive.org/release/${release.id}/front-500`
          : null,
      },
    };
  }

  async fetchTracklist(releaseMbid) {
    const params = new URLSearchParams({
      fmt: "json",
      inc: "recordings",
    });

    const response = await fetch(`${this.baseUrl}/release/${releaseMbid}?${params.toString()}`, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ExternalApiError(
        payload?.error || "MusicBrainz tracklist request failed.",
        retryable ? 503 : 502,
        { status: response.status, retryable }
      );
    }

    const media = Array.isArray(payload?.media) ? payload.media : [];
    const tracks = [];

    for (const medium of media) {
      const mediumTracks = Array.isArray(medium?.tracks) ? medium.tracks : [];
      for (const track of mediumTracks) {
        tracks.push({
          number: track?.number ?? `${tracks.length + 1}`,
          title: track?.title ?? "Unknown Track",
          length: formatTrackLength(track?.length),
        });
      }
    }

    return tracks;
  }
}

function formatTrackLength(lengthMs) {
  if (!Number.isFinite(lengthMs) || lengthMs <= 0) return "0:00";
  const totalSeconds = Math.round(lengthMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
