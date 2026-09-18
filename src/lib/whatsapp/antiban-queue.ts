/**
 * Anti-Ban Delay & Queue Scheduler for WhatsApp Bulk Campaigns.
 * Provides randomized human jitter delays, typing simulations, and batch pauses.
 */

export interface AntiBanConfig {
  minDelaySec: number;
  maxDelaySec: number;
  batchSize: number;
  batchPauseSec: number;
  typingDelaySec: number;
}

export const DEFAULT_ANTIBAN_CONFIG: AntiBanConfig = {
  minDelaySec: 15,
  maxDelaySec: 45,
  batchSize: 35,
  batchPauseSec: 180, // 3 minutes
  typingDelaySec: 3,
};

export function getRandomJitterMs(minSec: number, maxSec: number): number {
  const min = Math.max(1, Math.min(minSec, maxSec));
  const max = Math.max(min, Math.max(minSec, maxSec));
  const randomSec = Math.random() * (max - min) + min;
  return Math.floor(randomSec * 1000);
}

export function shouldPauseBatch(processedCount: number, batchSize: number): boolean {
  if (batchSize <= 0 || processedCount <= 0) return false;
  return processedCount % batchSize === 0;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
