import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PerformanceMetrics {
  tabCount: number;
  windowCount: number;
  groupCount: number;
  totalMemoryMB: number;
  availableMemoryMB: number;
  memoryUsagePercent: number;
}

interface PerformanceMonitorProps {
  onClose: () => void;
}

/**
 * 성능 모니터 컴포넌트
 * 탭 수, 윈도우 수, 그룹 수, 메모리 사용량 등을 표시
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
    // 5초마다 자동 갱신
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      // 탭, 윈도우, 그룹 정보
      const tabs = await chrome.tabs.query({});
      const windows = await chrome.windows.getAll();
      const groups = await chrome.tabGroups.query({});

      // 메모리 정보 (chrome.system.memory API)
      let memoryInfo: chrome.system.memory.MemoryInfo | null = null;
      try {
        memoryInfo = await chrome.system.memory.getInfo();
      } catch (err) {
        console.warn('Memory API not available:', err);
      }

      const totalMemoryMB = memoryInfo ? memoryInfo.capacity / (1024 * 1024) : 0;
      const availableMemoryMB = memoryInfo ? memoryInfo.availableCapacity / (1024 * 1024) : 0;
      const usedMemoryMB = totalMemoryMB - availableMemoryMB;
      const memoryUsagePercent = totalMemoryMB > 0 ? (usedMemoryMB / totalMemoryMB) * 100 : 0;

      setMetrics({
        tabCount: tabs.length,
        windowCount: windows.length,
        groupCount: groups.length,
        totalMemoryMB,
        availableMemoryMB,
        memoryUsagePercent,
      });
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to load performance metrics:', err);
      setError('Failed to load metrics');
      setLoading(false);
    }
  };

  const getMemoryStatusColor = (percent: number) => {
    if (percent >= 90) return 'text-red-500';
    if (percent >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getMemoryStatusText = (percent: number) => {
    if (percent >= 90) return '🔴 Critical';
    if (percent >= 75) return '🟡 Warning';
    return '🟢 Good';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 컨텐츠 */}
      <div className="relative z-10 glass-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden m-4">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-white/20">
          <div>
            <h2 className="text-2xl font-bold glass-text">⚡ Performance Monitor</h2>
            <p className="text-sm glass-text opacity-70 mt-1">System resource usage and tab statistics</p>
          </div>
          <button
            onClick={onClose}
            className="glass-button-secondary !p-2 rounded-full hover:bg-red-500/20 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <p className="glass-text">Loading metrics...</p>
            </div>
          ) : error ? (
            <div className="glass-card p-6 text-center">
              <p className="text-red-500">❌ {error}</p>
            </div>
          ) : metrics ? (
            <>
              {/* 탭 통계 */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold glass-text flex items-center gap-2">
                  📊 Tab Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4">
                    <div className="text-3xl font-bold text-purple-400">{metrics.tabCount}</div>
                    <div className="text-sm glass-text opacity-70 mt-1">Total Tabs</div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="text-3xl font-bold text-blue-400">{metrics.windowCount}</div>
                    <div className="text-sm glass-text opacity-70 mt-1">Windows</div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="text-3xl font-bold text-green-400">{metrics.groupCount}</div>
                    <div className="text-sm glass-text opacity-70 mt-1">Tab Groups</div>
                  </div>
                </div>
              </div>

              {/* 메모리 사용량 */}
              {metrics.totalMemoryMB > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold glass-text flex items-center gap-2">
                    💾 Memory Usage
                  </h3>
                  <div className="glass-card p-5">
                    {/* 메모리 상태 */}
                    <div className="flex justify-between items-center mb-3">
                      <span className="glass-text font-semibold">Status</span>
                      <span className={`font-bold ${getMemoryStatusColor(metrics.memoryUsagePercent)}`}>
                        {getMemoryStatusText(metrics.memoryUsagePercent)}
                      </span>
                    </div>

                    {/* 프로그레스 바 */}
                    <div className="relative h-8 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                          metrics.memoryUsagePercent >= 90
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : metrics.memoryUsagePercent >= 75
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                              : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${metrics.memoryUsagePercent}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold glass-text drop-shadow-lg">
                          {metrics.memoryUsagePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* 메모리 상세 정보 */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="glass-card !p-3">
                        <div className="glass-text opacity-70">Total Memory</div>
                        <div className="text-lg font-bold glass-text">
                          {(metrics.totalMemoryMB / 1024).toFixed(1)} GB
                        </div>
                      </div>
                      <div className="glass-card !p-3">
                        <div className="glass-text opacity-70">Available</div>
                        <div className="text-lg font-bold glass-text">
                          {(metrics.availableMemoryMB / 1024).toFixed(1)} GB
                        </div>
                      </div>
                      <div className="glass-card !p-3">
                        <div className="glass-text opacity-70">Used</div>
                        <div className="text-lg font-bold glass-text">
                          {((metrics.totalMemoryMB - metrics.availableMemoryMB) / 1024).toFixed(1)} GB
                        </div>
                      </div>
                      <div className="glass-card !p-3">
                        <div className="glass-text opacity-70">Per Tab (avg)</div>
                        <div className="text-lg font-bold glass-text">
                          {metrics.tabCount > 0
                            ? ((metrics.totalMemoryMB - metrics.availableMemoryMB) / metrics.tabCount).toFixed(0)
                            : 0}{' '}
                          MB
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-5">
                  <p className="glass-text opacity-70 text-center">
                    ⚠️ Memory API not available. Grant system.memory permission to view memory usage.
                  </p>
                </div>
              )}

              {/* 권장사항 */}
              <div className="glass-card p-4 bg-blue-500/10">
                <h4 className="font-semibold glass-text mb-2">💡 Performance Tips</h4>
                <ul className="text-sm glass-text opacity-80 space-y-1.5">
                  {metrics.tabCount > 50 && (
                    <li>• You have {metrics.tabCount} tabs open. Consider using Smart Organize to group them.</li>
                  )}
                  {metrics.memoryUsagePercent > 75 && (
                    <li>• Memory usage is high. Close unused tabs to improve performance.</li>
                  )}
                  {metrics.windowCount > 3 && (
                    <li>• Multiple windows detected. Consider consolidating tabs into fewer windows.</li>
                  )}
                  {metrics.tabCount <= 20 && metrics.memoryUsagePercent < 75 && (
                    <li>• ✅ Your tab usage looks healthy! Keep up the good work.</li>
                  )}
                </ul>
              </div>

              {/* 새로고침 버튼 */}
              <div className="flex justify-center">
                <button onClick={loadMetrics} className="glass-button-primary px-6 py-2 rounded-lg font-semibold">
                  🔄 Refresh Metrics
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
