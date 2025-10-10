import React from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { SimpleBarChart } from '../charts/SimpleBarChart';
import { SimpleLineChart } from '../charts/SimpleLineChart';
import { ProductivityScore } from '../shared/ProductivityScore';

interface DashboardModalProps {
  onClose: () => void;
}

/**
 * Optimized Dashboard Modal Component
 * Reduced from 346 lines to ~180 lines with better performance
 * - Extracted data loading to custom hook
 * - Memoized chart components
 * - Simplified state management
 */
export const DashboardModal: React.FC<DashboardModalProps> = ({ onClose }) => {
  const {
    tabs,
    categoryStats,
    productivityScore,
    mostVisited,
    totalTabs,
    duplicates,
    categoryTimeData,
    productivityTrend,
    totalTimeToday,
    isLoading,
  } = useDashboardData();

  const formatTime = (ms: number | undefined): string => {
    if (ms === undefined || ms === 0) return '0m';
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-5xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold ai-gradient-text">📊 Analytics Dashboard (Beta)</h2>
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="glass-text">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="glass-card p-4 text-center">
                  <p className="text-3xl font-bold glass-text">{totalTabs}</p>
                  <p className="text-xs glass-text opacity-70 mt-1">Total Tabs</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-3xl font-bold glass-text">{tabs.length}</p>
                  <p className="text-xs glass-text opacity-70 mt-1">Tracked</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-3xl font-bold glass-text">{totalTimeToday}</p>
                  <p className="text-xs glass-text opacity-70 mt-1">Minutes Today</p>
                </div>
                <div className="glass-card p-4 text-center">
                  <p className="text-3xl font-bold glass-text">{duplicates}</p>
                  <p className="text-xs glass-text opacity-70 mt-1">Duplicates</p>
                </div>
              </div>

              {/* Productivity Score */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold glass-text mb-3">💯 Productivity Score</h3>
                <ProductivityScore score={productivityScore} />
                <p className="text-xs glass-text opacity-60 mt-2 text-center">Based on tab categories and usage patterns</p>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category Time Distribution */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold glass-text mb-3">⏱️ Time by Category (Today)</h3>
                  {categoryTimeData.length > 0 ? (
                    <SimpleBarChart data={categoryTimeData} height={200} />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-xs glass-text opacity-50">No data available</p>
                    </div>
                  )}
                </div>

                {/* Productivity Trend */}
                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold glass-text mb-3">📈 Productivity Trend (7 Days)</h3>
                  {productivityTrend.length > 0 ? (
                    <SimpleLineChart data={productivityTrend} height={200} />
                  ) : (
                    <div className="h-[200px] flex items-center justify-center">
                      <p className="text-xs glass-text opacity-50">Not enough data yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Stats */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold glass-text mb-3">📊 Category Distribution</h3>
                <div className="space-y-2">
                  {categoryStats.map((stat) => (
                    <div key={stat.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stat.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm glass-text truncate">{stat.name}</span>
                          <span className="text-xs glass-text opacity-70">{stat.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold glass-text w-8 text-right">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Visited */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold glass-text mb-3">🔥 Most Visited Today</h3>
                <div className="space-y-2">
                  {mostVisited.length > 0 ? (
                    mostVisited.map((tab, index) => (
                      <div key={tab.url} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        <span className="text-lg font-bold glass-text opacity-50 w-6">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm glass-text truncate font-medium">{tab.title}</p>
                          <p className="text-xs glass-text opacity-50 truncate">{tab.domain}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold glass-text">{tab.accessCount}</p>
                          <p className="text-xs glass-text opacity-50">visits</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold glass-text">{formatTime(tab.totalTimeSpent)}</p>
                          <p className="text-xs glass-text opacity-50">time</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm glass-text opacity-50 text-center py-4">No data available yet</p>
                  )}
                </div>
              </div>

              {/* Beta Notice */}
              <div className="glass-card p-3 bg-purple-500/10">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold glass-text">Beta Feature</p>
                    <p className="text-xs glass-text opacity-70 mt-1">
                      This dashboard is in beta. Data accuracy may vary. More features coming soon!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
