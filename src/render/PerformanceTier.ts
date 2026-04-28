import type { PixelTier } from './PixelRenderPipeline';

/**
 * 부팅 시 한 번 측정하여 적정 픽셀 tier 를 결정.
 * 60 프레임 평균 fps 가:
 *   < 35 → low
 *   35–55 → medium
 *   > 55 → high
 *
 * 결과는 외부에서 적용 (PixelRenderPipeline.setTier).
 */
export class PerformanceTier {
  private frameTimes: number[] = [];
  private benchmarkActive = false;
  private resolveBenchmark: ((tier: PixelTier) => void) | null = null;

  /** 60프레임 동안 측정 후 tier 반환. */
  startBenchmark(): Promise<PixelTier> {
    return new Promise((resolve) => {
      this.frameTimes = [];
      this.benchmarkActive = true;
      this.resolveBenchmark = resolve;
    });
  }

  /** 매 프레임 호출. 벤치마크 진행 중이면 시간 기록. */
  tick(): void {
    if (!this.benchmarkActive) return;
    const now = performance.now();
    this.frameTimes.push(now);
    if (this.frameTimes.length >= 60) {
      const elapsed = (this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0]) / 1000;
      const fps = 59 / Math.max(elapsed, 0.001);
      this.benchmarkActive = false;
      const tier: PixelTier = fps < 35 ? 'low' : fps > 55 ? 'high' : 'medium';
      this.resolveBenchmark?.(tier);
      this.resolveBenchmark = null;
    }
  }
}
