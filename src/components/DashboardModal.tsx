import React, { useEffect, useState } from 'react';
import type { TabData } from '../types/analytics';
import { getColorHex } from '../utils/colorUtils';
import { storageUtils } from '../utils/storage';
import { isSystemUrl } from '../utils/tabFilters';
import { TabTracker } from '../utils/tabTracker';
import { ProductivityScore } from './ProductivityScore';
import { SimpleBarChart } from './SimpleBarChart';
import { SimpleLineChart } from './SimpleLineChart';

/**
 * 대시보드 모달 컴포넌트의 Props
 */
interface DashboardModalProps {
  onClose: () => void; // 모달 닫기 핸들러
}

/**
 * 카테고리 통계 타입
 * 카테고리별 탭 사용 현황
 */
interface CategoryStats {
  name: string; // 카테고리 이름
  count: number; // 탭 개수
  percentage: number; // 비율 (%)
  color: string; // 표시 색상
}

/**
 * 대시보드 모달 컴포넌트
 * 탭 사용 통계, 생산성 점수, 카테고리 분석 등을 시각화
 *
 * @component
 * @param {DashboardModalProps} props - 컴포넌트 속성
 */
export const DashboardModal: React.FC<DashboardModalProps> = ({ onClose }) => {
  // 대시보드 상태 관리
  const [tabs, setTabs] = useState<TabData[]>([]); // 탭 목록
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]); // 카테고리별 통계
  const [productivityScore, setProductivityScore] = useState(0); // 생산성 점수
  const [mostVisited, setMostVisited] = useState<TabData[]>([]); // 가장 많이 방문한 탭
  const [totalTabs, setTotalTabs] = useState(0); // 전체 탭 수
  const [duplicates, setDuplicates] = useState(0); // 중복 탭 수
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태
  const [categoryTimeData, setCategoryTimeData] = useState<any[]>([]); // 카테고리별 시간 데이터
  const [productivityTrend, setProductivityTrend] = useState<any[]>([]); // 생산성 추이
  const [totalTimeToday, setTotalTimeToday] = useState(0); // 오늘 총 사용 시간

  // 컴포넌트 마운트 시 대시보드 데이터 로드
  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * 대시보드 데이터를 로드하는 비동기 함수
   * 탭 사용 통계, 카테고리 분석, 생산성 점수 등을 계산
   */
  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // 현재 열린 탭 개수 가져오기
      const allTabs = await chrome.tabs.query({});
      setTotalTabs(allTabs.length);

      // 저장소에서 카테고리 정보 가져오기
      const categories = await storageUtils.getCategories();

      // TabTracker에서 사용 데이터 가져오기
      const { tabUsageData, todayStats, dailyStats } = await TabTracker.getUsageData();

      // 사용 데이터를 TabData 형식으로 변환하고 접근 횟수로 정렬
      const tabsArray: TabData[] = tabUsageData
        .map((usage: any) => ({
          id: 0, // 히스토리 데이터에는 ID 불필요
          url: usage.url,
          title: usage.title,
          domain: usage.domain,
          category: usage.category,
          lastAccessed: usage.lastAccessed,
          accessCount: usage.accessCount,
          totalTimeSpent: usage.totalTimeSpent,
        }))
        .sort((a, b) => b.accessCount - a.accessCount); // 접근 횟수 내림차순 정렬

      setTabs(tabsArray);

      // 카테고리별 통계 계산
      const categoryCount: Record<string, number> = {};
      tabsArray.forEach((tab) => {
        const category = tab.category || 'other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      // 카테고리 통계 객체 생성
      const stats: CategoryStats[] = categories
        .map((cat: any) => ({
          name: cat.name,
          count: categoryCount[cat.id] || 0,
          percentage: tabsArray.length > 0 ? Math.round(((categoryCount[cat.id] || 0) / tabsArray.length) * 100) : 0,
          color: getColorHex(cat.color),
        }))
        .filter((stat: CategoryStats) => stat.count > 0); // 탭이 있는 카테고리만 필터링

      setCategoryStats(stats);

      // 오늘의 생산성 점수가 있으면 사용, 없으면 계산
      if (todayStats?.productivityScore !== undefined) {
        setProductivityScore(todayStats.productivityScore);
      } else {
        // 현재 데이터로 생산성 점수 계산
        const workTabs = categoryCount['work'] || 0;
        const productivityTabs = categoryCount['productivity'] || 0;
        const entertainmentTabs = categoryCount['entertainment'] || 0;
        const socialTabs = categoryCount['social'] || 0;
        const totalProductiveTabs = workTabs + productivityTabs;
        const totalDistractingTabs = entertainmentTabs + socialTabs;

        let score = 50;
        if (totalProductiveTabs + totalDistractingTabs > 0) {
          score = Math.round((totalProductiveTabs / (totalProductiveTabs + totalDistractingTabs)) * 100);
        }
        setProductivityScore(score);
      }

      // Most visited tabs are already sorted
      setMostVisited(tabsArray.slice(0, 5));

      // Process time-based data for category chart
      if (todayStats) {
        setTotalTimeToday(todayStats.totalTimeSpent);

        const categoryTimeChartData = Object.entries(todayStats.categoryBreakdown || {})
          .map(([category, timeSpent]: [string, any]) => {
            const categoryInfo = categories.find((c: any) => c.id === category);
            return {
              label: categoryInfo?.name || category,
              value: Math.round((timeSpent as number) / 1000 / 60), // Convert to minutes
              color: categoryInfo ? getColorHex(categoryInfo.color) : '#6B7280',
            };
          })
          .filter((item) => item.value > 0)
          .sort((a, b) => b.value - a.value);

        setCategoryTimeData(categoryTimeChartData);
      }

      // Process productivity trend data
      const trendData = dailyStats.map((day: any) => ({
        label: new Date(day.date).toLocaleDateString('ko', { weekday: 'short' }).replace('요일', ''),
        value: day.productivityScore || 50,
      }));
      setProductivityTrend(trendData);

      // Count duplicates directly
      try {
        const urlCounts: Record<string, number> = {};
        allTabs.forEach((tab) => {
          if (tab.url && !isSystemUrl(tab.url)) {
            const normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
            urlCounts[normalizedUrl] = (urlCounts[normalizedUrl] || 0) + 1;
          }
        });

        const duplicateCount = Object.values(urlCounts).reduce((sum, count) => {
          return sum + (count > 1 ? count - 1 : 0);
        }, 0);

        setDuplicates(duplicateCount);
      } catch (error) {
        console.error('Error counting duplicates:', error);
        setDuplicates(0);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-convex w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold ai-gradient-text">TabQuest Analytics</h1>
              <p className="text-sm text-white/90 mt-1">AI-powered insights for your browsing habits</p>
            </div>
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-white/80">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{totalTabs}</p>
                  <p className="text-xs text-white/80 mt-1">현재 탭</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{formatDuration(totalTimeToday)}</p>
                  <p className="text-xs text-white/80 mt-1">오늘 사용 시간</p>
                </div>
                <div className="glass-card text-center">
                  <p className="text-2xl font-bold ai-gradient-text">{tabs.length}</p>
                  <p className="text-xs text-white/80 mt-1">방문한 사이트</p>
                </div>
                <div className="glass-card text-center">
                  <ProductivityScore score={productivityScore} compact />
                  <p className="text-xs text-white/80 mt-1">생산성 점수</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">📊</span> 카테고리별 분포
                  </h3>
                  <div className="space-y-3">
                    {categoryStats.length > 0 ? (
                      categoryStats.map((stat) => (
                        <div key={stat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{stat.name}</span>
                            <span className="text-xs text-white/70">
                              {stat.count} ({stat.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${stat.percentage}%`,
                                backgroundColor: stat.color,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">No tab data available yet</p>
                    )}
                  </div>
                </div>

                {/* Most Visited */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">🔥</span> 자주 방문한 사이트
                  </h3>
                  <div className="space-y-3">
                    {mostVisited.length > 0 ? (
                      mostVisited.map((tab, index) => (
                        <div key={tab.id} className="flex items-center gap-3">
                          <span className="text-xl font-bold text-white/90">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-white">{tab.title}</p>
                            <p className="text-xs text-white/70">{tab.domain}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-purple-400">{tab.accessCount}x</p>
                            {tab.id !== 0 && <p className="text-xs text-white/60">{formatDuration((tab as any).totalTimeSpent || 0)}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">No visit data available yet</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Time-based Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Category Time Spent */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">⏱️</span> 오늘 카테고리별 사용 시간
                  </h3>
                  {categoryTimeData.length > 0 ? (
                    <SimpleBarChart data={categoryTimeData} showValues={true} height={180} />
                  ) : (
                    <p className="text-sm text-white/60">No time tracking data available yet</p>
                  )}
                </div>

                {/* Productivity Trend */}
                <div className="glass-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                    <span className="text-lg">📈</span> 생산성 추이 (7일간)
                  </h3>
                  {productivityTrend.length > 0 ? (
                    <SimpleLineChart data={productivityTrend} height={180} color="#8B5CF6" />
                  ) : (
                    <p className="text-sm text-white/60">Not enough data for trend analysis</p>
                  )}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="mt-6 p-4 glass-card bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-white">
                  <span className="text-lg">💡</span> AI 인사이트
                </h3>
                <ul className="text-sm space-y-1 text-white/90">
                  {productivityScore < 50 ? (
                    <li>• 엔터테인먼트 탭이 업무 탭보다 많습니다. 집중력 향상을 위해 일부 탭을 닫아보세요!</li>
                  ) : (
                    <li>• 훌륭한 생산성 균형을 유지하고 있습니다! 계속 집중해서 브라우징하세요.</li>
                  )}
                  {duplicates > 0 && <li>• 중복된 탭이 {duplicates}개 있습니다. 스마트 정리 기능으로 정리해보세요!</li>}
                  {totalTabs > 30 && <li>• {totalTabs}개의 탭이 열려있습니다. 더 나은 관리를 위해 그룹화를 고려해보세요.</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


// Helper function to format time duration
function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(milliseconds / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
