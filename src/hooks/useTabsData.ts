import { useCallback, useState, useRef } from 'react';
import { useAIStore } from '../store/aiStore';
import { categorySelectors, useCategoryStore } from '../store/categoryStore';
import { useTabStore } from '../store/tabStore';
import { calculateProductivityScore } from '../utils/tabAnalyzer';
import { getCachedTabs } from '../utils/chromeApiOptimizer';

/**
 * Custom hook for managing tabs data and analysis
 * Separates data fetching logic from UI components for better performance
 * 🚀 성능 최적화: 캐싱 및 debouncing 적용
 */
export function useTabsData() {
  // 최적화된 선택자 사용 - 액션만 구독
  const setTabs = useTabStore((state) => state.setTabs);
  const setProductivityScore = useAIStore((state) => state.setProductivityScore);
  const categories = useCategoryStore(categorySelectors.categories);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🚀 중복 호출 방지를 위한 ref
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTabsAndAnalyze = useCallback(async () => {
    // 🚀 이미 로딩 중이면 스킵
    if (loadingRef.current) {
      return null;
    }

    // 🚀 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    loadingRef.current = true;
    setIsLoading(true);

    try {
      // 🚀 최적화: 캐시된 탭 데이터 사용 + 병렬 처리
      const [currentTabs, response] = await Promise.all([
        getCachedTabs({}, 500), // 500ms 캐시 TTL
        chrome.runtime.sendMessage({ action: 'getTabsAnalysis' }).catch(() => null),
      ]);

      // 🚀 요청이 취소되었으면 종료
      if (abortControllerRef.current.signal.aborted) {
        return null;
      }

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
      const score = calculateProductivityScore(currentTabs);
      setProductivityScore(score);

      return { tabs: currentTabs, analysis: response };
    } catch (error) {
      // AbortError는 무시
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      console.error('[useTabsData] Failed to load tabs:', error);
      return null;
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [setTabs, setProductivityScore]);

  return {
    analysis,
    isLoading,
    loadTabsAndAnalyze,
  };
}
