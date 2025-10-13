/**
 * 🚀 성능 모니터링 유틸리티
 * - 렌더링 성능 측정
 * - API 호출 성능 추적
 * - 메모리 사용량 모니터링
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;
  private enabled = process.env.NODE_ENV === 'development';

  /**
   * 성능 측정 시작
   */
  start(name: string): () => void {
    if (!this.enabled) {
      return () => {};
    }

    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({ name, duration, timestamp: Date.now() });

      // 개발 환경에서만 콘솔에 출력
      if (duration > 100) {
        console.warn(`[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * 비동기 작업 성능 측정
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const end = this.start(name);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * 동기 작업 성능 측정
   */
  measureSync<T>(name: string, fn: () => T): T {
    const end = this.start(name);
    try {
      return fn();
    } finally {
      end();
    }
  }

  /**
   * 메트릭 기록
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // 메트릭 개수 제한
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * 특정 작업의 평균 성능 가져오기
   */
  getAverageDuration(name: string): number {
    const filteredMetrics = this.metrics.filter(m => m.name === name);
    if (filteredMetrics.length === 0) return 0;

    const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / filteredMetrics.length;
  }

  /**
   * 모든 메트릭 가져오기
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 메트릭 초기화
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * 메모리 사용량 가져오기
   */
  getMemoryUsage(): MemoryInfo | null {
    if (!this.enabled || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  /**
   * 메모리 사용률 (%) 가져오기
   */
  getMemoryUsagePercent(): number | null {
    const memory = this.getMemoryUsage();
    if (!memory) return null;

    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  /**
   * 성능 리포트 생성
   */
  generateReport(): string {
    if (!this.enabled) {
      return 'Performance monitoring is disabled in production';
    }

    const operations = [...new Set(this.metrics.map(m => m.name))];
    const report: string[] = ['=== Performance Report ===\n'];

    operations.forEach(name => {
      const avg = this.getAverageDuration(name);
      const count = this.metrics.filter(m => m.name === name).length;
      report.push(`${name}: ${avg.toFixed(2)}ms (avg), ${count} calls`);
    });

    const memory = this.getMemoryUsage();
    if (memory) {
      const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      report.push(`\nMemory: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`);
    }

    return report.join('\n');
  }

  /**
   * 콘솔에 리포트 출력
   */
  printReport(): void {
    if (this.enabled) {
      console.log(this.generateReport());
    }
  }

}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor();

/**
 * 개발 환경에서만 성능 리포트 주기적으로 출력
 */
if (process.env.NODE_ENV === 'development') {
  // 30초마다 리포트 출력
  setInterval(() => {
    performanceMonitor.printReport();
    performanceMonitor.clear();
  }, 30000);
}

/**
 * 데코레이터: 메서드 성능 측정
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const end = performanceMonitor.start(`${target.constructor.name}.${propertyKey}`);
    try {
      return await originalMethod.apply(this, args);
    } finally {
      end();
    }
  };

  return descriptor;
}
