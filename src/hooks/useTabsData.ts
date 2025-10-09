import { useCallback, useEffect, useState } from 'react';
import { useAIStore } from '../store/aiStore';
import { useCategoryStore } from '../store/categoryStore';
import { useTabStore } from '../store/tabStore';
import { calculateProductivityScore } from '../utils/tabAnalyzer';

/**
 * Custom hook for managing tabs data and analysis
 * Separates data fetching logic from UI components for better performance
 */
export function useTabsData() {
  const { setTabs } = useTabStore();
  const { setProductivityScore } = useAIStore();
  const { categories } = useCategoryStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTabsAndAnalyze = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load current tabs
      const currentTabs = await chrome.tabs.query({});

      setTabs(
        currentTabs.map((tab) => ({
          id: tab.id!,
          title: tab.title || '',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl,
          lastAccessed: Date.now(),
        })),
      );

      // Get analysis from background
      const response = await chrome.runtime.sendMessage({ action: 'getTabsAnalysis' });
      setAnalysis(response);

      // Calculate and set productivity score
      const score = calculateProductivityScore(currentTabs);
      setProductivityScore(score);

      return { tabs: currentTabs, analysis: response };
    } catch (error) {
      console.error('[useTabsData] Failed to load tabs:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setTabs, setProductivityScore]);

  return {
    analysis,
    isLoading,
    loadTabsAndAnalyze,
  };
}
