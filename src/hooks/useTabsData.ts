import { useCallback, useState } from 'react';
import { useAIStore } from '../store/aiStore';
import { categorySelectors, useCategoryStore } from '../store/categoryStore';
import { useTabStore } from '../store/tabStore';
import { calculateProductivityScore } from '../utils/tabAnalyzer';

/**
 * Custom hook for managing tabs data and analysis
 * Separates data fetching logic from UI components for better performance
 */
export function useTabsData() {
  // 최적화된 선택자 사용 - 액션만 구독
  const setTabs = useTabStore((state) => state.setTabs);
  const setProductivityScore = useAIStore((state) => state.setProductivityScore);
  const categories = useCategoryStore(categorySelectors.categories);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTabsAndAnalyze = useCallback(async () => {
    setIsLoading(true);
    try {
      // 🚀 최적화: 병렬로 데이터 가져오기
      const [currentTabs, response] = await Promise.all([chrome.tabs.query({}), chrome.runtime.sendMessage({ action: 'getTabsAnalysis' })]);

      setTabs(
        currentTabs.map((tab) => ({
          id: tab.id!,
          title: tab.title || '',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl,
          lastAccessed: Date.now(),
        })),
      );

      setAnalysis(response);

      // 🚀 최적화: calculateProductivityScore는 이미 최적화되어 빠르므로 그대로 사용
      // background의 분석 결과를 사용하지 않고 여기서 계산 (일관성 보장)
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
