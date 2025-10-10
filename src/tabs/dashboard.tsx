import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AILogo } from '../components/shared/AILogo';
import { ProductivityScore } from '../components/shared/ProductivityScore';
import '../lib/i18n';
import '../styles/dashboard.css';
import type { TabData } from '../types/analytics';
import { getColorHex } from '../utils/colorUtils';
import { storageUtils } from '../utils/storage';

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface TimeStats {
  hour: number;
  count: number;
}

// 통합 상태 인터페이스 - 7번 리렌더링 → 1번으로 최적화
interface DashboardData {
  tabs: TabData[];
  categoryStats: CategoryStats[];
  productivityScore: number;
  mostVisited: TabData[];
  timeStats: TimeStats[];
  totalTabs: number;
  duplicates: number;
}

function Dashboard() {
  const { t } = useTranslation();

  // 상태 통합: 7개 개별 상태 → 1개 통합 상태
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    tabs: [],
    categoryStats: [],
    productivityScore: 0,
    mostVisited: [],
    timeStats: [],
    totalTabs: 0,
    duplicates: 0,
  });

  // 배치 업데이트로 최적화된 데이터 로딩
  const loadDashboardData = useCallback(async () => {
    // 병렬 처리로 데이터 가져오기 최적화
    const [allTabs, tabsData, categories, duplicatesResponse] = await Promise.all([
      chrome.tabs.query({}),
      storageUtils.getItem<any>('local:tabsData'),
      storageUtils.getCategories(),
      chrome.runtime.sendMessage({ action: 'findDuplicates' }).catch(() => null),
    ]);

    // 모든 계산을 먼저 완료
    const tabsArray = Object.values(tabsData || {}) as TabData[];

    // 카테고리 통계 계산
    const categoryCount: Record<string, number> = {};
    tabsArray.forEach((tab) => {
      const category = tab.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const stats: CategoryStats[] = categories
      .map((cat: any) => ({
        name: cat.name,
        count: categoryCount[cat.id] || 0,
        percentage: tabsArray.length > 0 ? Math.round(((categoryCount[cat.id] || 0) / tabsArray.length) * 100) : 0,
        color: getColorHex(cat.color),
      }))
      .filter((stat: CategoryStats) => stat.count > 0);

    // 생산성 점수 계산
    const workTabs = categoryCount['work'] || 0;
    const entertainmentTabs = categoryCount['entertainment'] || 0;
    const socialTabs = categoryCount['social'] || 0;
    const totalProductiveTabs = workTabs;
    const totalDistractingTabs = entertainmentTabs + socialTabs;

    let score = 50;
    if (totalProductiveTabs + totalDistractingTabs > 0) {
      score = Math.round((totalProductiveTabs / (totalProductiveTabs + totalDistractingTabs)) * 100);
    }

    // 가장 많이 방문한 탭
    const sortedByAccess = [...tabsArray].sort((a, b) => b.accessCount - a.accessCount);
    const topVisited = sortedByAccess.slice(0, 5);

    // 시간대별 통계
    const hourCounts: Record<number, number> = {};
    tabsArray.forEach((tab) => {
      const hour = new Date(tab.lastAccessed).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const timeData: TimeStats[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
    }));

    // 중복 탭 수 계산
    const totalDuplicates = duplicatesResponse ? duplicatesResponse.reduce((sum: number, group: any) => sum + group.count - 1, 0) : 0;

    // 한 번에 모든 상태 업데이트 - 7번 리렌더링 → 1번으로 최적화
    setDashboardData({
      tabs: tabsArray,
      categoryStats: stats,
      productivityScore: score,
      mostVisited: topVisited,
      timeStats: timeData,
      totalTabs: allTabs.length,
      duplicates: totalDuplicates,
    });
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 메모이제이션된 계산 값들
  const maxTimeCount = useMemo(() => {
    return Math.max(...dashboardData.timeStats.map((s) => s.count), 1);
  }, [dashboardData.timeStats]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <AILogo size="large" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold ai-gradient-text">{t('dashboard.title')}</h1>
                <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full animate-pulse">
                  {t('dashboard.betaBadge')}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{t('dashboard.subtitle')}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ {t('dashboard.betaNotice')}</p>
            </div>
          </div>
          <ProductivityScore score={dashboardData.productivityScore} trend="up" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('dashboard.stats.totalTabs')}</h3>
            <p className="text-3xl font-bold ai-gradient-text">{dashboardData.totalTabs}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('dashboard.stats.categories')}</h3>
            <p className="text-3xl font-bold ai-gradient-text">{dashboardData.categoryStats.length}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('dashboard.stats.duplicates')}</h3>
            <p className="text-3xl font-bold ai-gradient-text">{dashboardData.duplicates}</p>
          </div>
          <div className="ai-card">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t('dashboard.stats.trackedTabs')}</h3>
            <p className="text-3xl font-bold ai-gradient-text">{dashboardData.tabs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution */}
          <div className="ai-card">
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.sections.categoryDistribution')}</h2>
            <div className="space-y-3">
              {dashboardData.categoryStats.map((stat) => (
                <CategoryStatItem key={stat.name} stat={stat} t={t} />
              ))}
            </div>
          </div>

          {/* Most Visited */}
          <div className="ai-card">
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.sections.mostVisited')}</h2>
            <div className="space-y-3">
              {dashboardData.mostVisited.map((tab, index) => (
                <MostVisitedItem key={tab.id} tab={tab} index={index} t={t} />
              ))}
            </div>
          </div>

          {/* Time Distribution */}
          <div className="ai-card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.sections.activityByHour')}</h2>
            <div className="flex items-end gap-1 h-32">
              {dashboardData.timeStats.map((stat) => (
                <TimeBarItem key={stat.hour} stat={stat} maxCount={maxTimeCount} t={t} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{t('dashboard.time.12am')}</span>
              <span>{t('dashboard.time.6am')}</span>
              <span>{t('dashboard.time.12pm')}</span>
              <span>{t('dashboard.time.6pm')}</span>
              <span>{t('dashboard.time.11pm')}</span>
            </div>
          </div>

          {/* AI Insights */}
          <div className="ai-card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">{t('dashboard.sections.aiInsights')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">💡 {t('dashboard.insights.productivityTip')}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {dashboardData.productivityScore < 50
                    ? t('dashboard.insights.lowProductivity')
                    : t('dashboard.insights.highProductivity')}
                </p>
              </div>
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">🎯 {t('dashboard.insights.focusSuggestion')}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {dashboardData.duplicates > 5
                    ? t('dashboard.insights.manyDuplicates', { count: dashboardData.duplicates })
                    : t('dashboard.insights.fewDuplicates')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 메모이제이션된 서브 컴포넌트 - 불필요한 리렌더링 방지
const CategoryStatItem = React.memo(({ stat, t }: { stat: CategoryStats; t: any }) => {
  // 스타일 객체 메모이제이션
  const barStyle = useMemo(
    () => ({
      width: `${stat.percentage}%`,
      backgroundColor: stat.color,
    }),
    [stat.percentage, stat.color],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{stat.name}</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {stat.count} {t('dashboard.sections.tabs')} ({stat.percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={barStyle} />
      </div>
    </div>
  );
});

CategoryStatItem.displayName = 'CategoryStatItem';

const MostVisitedItem = React.memo(({ tab, index, t }: { tab: TabData; index: number; t: any }) => (
  <div className="flex items-center gap-3">
    <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
    <div className="flex-1">
      <p className="text-sm font-medium truncate">{tab.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{tab.domain}</p>
    </div>
    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
      {tab.accessCount} {t('dashboard.sections.visits')}
    </span>
  </div>
));

MostVisitedItem.displayName = 'MostVisitedItem';

const TimeBarItem = React.memo(({ stat, maxCount, t }: { stat: TimeStats; maxCount: number; t: any }) => {
  const height = stat.count > 0 ? (stat.count / maxCount) * 100 : 0;

  return (
    <div
      className="flex-1 bg-gradient-to-t from-purple-600 to-blue-600 rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
      style={{ height: `${height}%` }}
    >
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {stat.hour}:00 - {stat.count} {t('dashboard.sections.tabs')}
      </div>
    </div>
  );
});

TimeBarItem.displayName = 'TimeBarItem';

export default Dashboard;
