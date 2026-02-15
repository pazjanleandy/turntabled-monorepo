import { ExternalApiError } from "../_lib/errors.js";

export class MusicBrainzWorkerService {
  constructor({ queueService, musicBrainzClient, artistRepository, albumRepository, backlogRepository }) {
    this.queueService = queueService;
    this.musicBrainzClient = musicBrainzClient;
    this.artistRepository = artistRepository;
    this.albumRepository = albumRepository;
    this.backlogRepository = backlogRepository;
  }

  async run({ maxJobs = 10, maxRuntimeMs = 9000 }) {
    const startedAt = Date.now();
    let processed = 0;
    let retriesScheduled = 0;
    let permanentlyFailed = 0;

    await this.queueService.moveDueRetries();

    while (processed < maxJobs && Date.now() - startedAt < maxRuntimeMs) {
      const job = await this.queueService.pop();
      if (!job) break;

      const rateGateAcquired = await this.queueService.acquireRateGate();
      if (!rateGateAcquired) {
        await this.queueService.requeue(job);
        await this.sleep(250);
        continue;
      }

      try {
        const metadata = await this.musicBrainzClient.findAlbum(job.artistName, job.albumTitle);
        if (!metadata) {
          await this.queueService.markPermanentFailure(job.resourceKey);
          permanentlyFailed += 1;
          processed += 1;
          continue;
        }

        const artist = await this.artistRepository.upsertFromMusicBrainz(metadata.artist);
        const album = await this.albumRepository.upsertFromMusicBrainz(metadata.album, artist.id);
        if (job.backlogId) {
          await this.backlogRepository.attachAlbum(job.backlogId, album.id);
        }

        await this.queueService.markSuccess(job.resourceKey);
        processed += 1;
      } catch (error) {
        const attempt = Number.isInteger(job.attempt) ? job.attempt + 1 : 1;
        const retryable = this.isRetryable(error);

        if (retryable && attempt <= 6) {
          await this.queueService.unlockForRetry(job.resourceKey);
          await this.queueService.scheduleRetry({ ...job, attempt }, attempt);
          retriesScheduled += 1;
          continue;
        }

        await this.queueService.markPermanentFailure(job.resourceKey);
        permanentlyFailed += 1;
      }
    }

    return { processed, retriesScheduled, permanentlyFailed };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isRetryable(error) {
    if (error instanceof ExternalApiError) {
      return error?.details?.retryable === true;
    }
    return true;
  }
}
