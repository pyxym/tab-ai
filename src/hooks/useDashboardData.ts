import { useCallback, useEffect, useState } from 'react';
import type { TabData } from '../types/analytics';
import type { DailyStats } from '../types/storage';
import { storageUtils } from '../utils/storage';
import { TabTracker } from '../utils/tabTracker';
import { getColorHex } from '../utils/colorUtils';

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface DashboardData {
  tabs: TabData[];
  categoryStats: CategoryStats[];
  productivityScore: number;
  mostVisited: TabData[];
  totalTabs: number;
  duplicates: number;
  categoryTimeData: any[];
  productivityTrend: any[];
  totalTimeToday: number;
  isLoading: boolean;
}

/**
 * Custom hook for dashboard data management
 * Handles data fetching, calculation, and state management
 */
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<Omit<DashboardData, 'isLoading'>>({
    tabs: [],
    categoryStats: [],
    productivityScore: 0,
    mostVisited: [],
    totalTabs: 0,
    duplicates: 0,
    categoryTimeData: [],
    productivityTrend: [],
    totalTimeToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch current tabs
      const allTabs = await chrome.tabs.query({});
      const totalTabs = allTabs.length;

      // Get categories
      const categories = await storageUtils.getCategories();

      // Get usage data from TabTracker
      const { tabUsageData, todayStats, dailyStats } = await TabTracker.getUsageData();

      // Convert to TabData format
      const tabsArray: TabData[] = tabUsageData
        .map((usage: any) => ({
          id: 0,
          url: usage.url,
          title: usage.title,
          domain: usage.domain,
          category: usage.category,
          lastAccessed: usage.lastAccessed,
          accessCount: usage.accessCount,
          totalTimeSpent: usage.totalTimeSpent,
        }))
        .sort((a, b) => b.accessCount - a.accessCount);

      // Calculate category stats
      const categoryCount: Record<string, number> = {};
      tabsArray.forEach((tab) => {
        const category = tab.category || 'other';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const categoryStats: CategoryStats[] = categories
        .map((cat: any) => ({
          name: cat.name,
          count: categoryCount[cat.id] || 0,
          percentage: tabsArray.length > 0 ? Math.round(((categoryCount[cat.id] || 0) / tabsArray.length) * 100) : 0,
          color: getColorHex(cat.color),
        }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count);

      // Calculate most visited (top 5)
      const mostVisited = tabsArray.slice(0, 5);

      // Calculate productivity score (simplified)
      const productivityScore = todayStats?.productivityScore || 50;

      // Detect duplicates
      const urlSet = new Set<string>();
      const duplicates = allTabs.filter((tab) => {
        if (!tab.url) return false;
        if (urlSet.has(tab.url)) return true;
        urlSet.add(tab.url);
        return false;
      }).length;

      // Prepare category time data for charts
      const categoryTimeData = Object.entries(todayStats?.categoryBreakdown || {})
        .map(([name, time]) => ({
          name,
          value: Math.round((time as number) / 60000), // Convert to minutes
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Prepare productivity trend (last 7 days)
      const productivityTrend = (dailyStats || [])
        .slice(-7)
        .map((stat: DailyStats) => ({
          date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: stat.productivityScore || 0,
        }));

      // Total time today (in minutes)
      const totalTimeToday = Math.round((todayStats?.totalTimeSpent || 0) / 60000);

      setData({
        tabs: tabsArray,
        categoryStats,
        productivityScore,
        mostVisited,
        totalTabs,
        duplicates,
        categoryTimeData,
        productivityTrend,
        totalTimeToday,
      });
    } catch (error) {
      console.error('[useDashboardData] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    ...data,
    isLoading,
  };
}
