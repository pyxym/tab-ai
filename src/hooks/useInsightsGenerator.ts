import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { aiSelectors, useAIStore } from '../store/aiStore';
import { isNewTabUrl, isSystemUrl } from '../utils/tabFilters';

/**
 * Custom hook for generating AI insights
 * Memoized to prevent unnecessary recalculations
 */
export function useInsightsGenerator() {
  const { t } = useTranslation();

  // 최적화된 선택자 사용
  const insights = useAIStore(aiSelectors.insights);
  const addInsight = useAIStore((state) => state.addInsight);
  const removeInsight = useAIStore((state) => state.removeInsight);

  const generateInsights = useCallback(
    (tabs: chrome.tabs.Tab[], analysis: any) => {
      // Remove only analysis-based insights
      const analysisInsightIds = ['duplicates', 'high-tab-count', 'category-focus'];
      analysisInsightIds.forEach((id) => {
        if (insights.some((i) => i.id === id)) {
          removeInsight(id);
        }
      });

      // Add duplicate tabs insight
      if (analysis.duplicates?.length > 0) {
        const totalDuplicates = analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0);

        addInsight({
          id: 'duplicates',
          type: 'alert',
          title: t('insights.duplicates.title', { count: totalDuplicates }),
          description: t('insights.duplicates.description'),
          priority: 'high',
          timestamp: Date.now(),
          actionable: {
            label: t('insights.duplicates.action'),
            action: async () => {
              try {
                const tabs = await chrome.tabs.query({ currentWindow: true });
                const urlMap = new Map<string, chrome.tabs.Tab[]>();

                // Group tabs by normalized URL
                tabs.forEach((tab) => {
                  if (!tab.url) return;

                  let normalizedUrl: string;
                  if (isNewTabUrl(tab.url)) {
                    normalizedUrl = '__newtab__';
                  } else if (isSystemUrl(tab.url)) {
                    normalizedUrl = tab.url.replace(/\/$/, '');
                  } else {
                    normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
                  }

                  if (!urlMap.has(normalizedUrl)) {
                    urlMap.set(normalizedUrl, []);
                  }
                  urlMap.get(normalizedUrl)!.push(tab);
                });

                // Find and close duplicates
                const tabsToClose: number[] = [];
                for (const [, tabGroup] of urlMap) {
                  if (tabGroup.length > 1) {
                    tabGroup.sort((a, b) => (a.id || 0) - (b.id || 0));
                    for (let i = 1; i < tabGroup.length; i++) {
                      const tabId = tabGroup[i].id;
                      if (tabId !== undefined) {
                        tabsToClose.push(tabId);
                      }
                    }
                  }
                }

                // Close duplicates
                if (tabsToClose.length > 0) {
                  await chrome.tabs.remove(tabsToClose);
                  removeInsight('duplicates');

                  addInsight({
                    id: `duplicates-removed-${Date.now()}`,
                    type: 'tip',
                    title: t('insights.duplicatesRemoved.title'),
                    description: t('insights.duplicatesRemoved.description', { count: tabsToClose.length }),
                    priority: 'medium',
                    timestamp: Date.now(),
                  });
                }
              } catch (error) {
                console.error('[useInsightsGenerator] Failed to remove duplicates:', error);
              }
            },
          },
        });
      }

      // Add high tab count insight
      if (tabs.length > 20) {
        addInsight({
          id: 'high-tab-count',
          type: 'suggestion',
          title: t('insights.highTabCount.title', { count: tabs.length }),
          description: t('insights.highTabCount.description'),
          priority: tabs.length > 30 ? 'high' : 'medium',
          timestamp: Date.now(),
        });
      }

      // Add category insight (exclude uncategorized)
      if (analysis.categoryCounts) {
        const topCategory = Object.entries(analysis.categoryCounts)
          .filter(([category]) => category !== 'uncategorized')
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];

        if (topCategory && (topCategory[1] as number) > 5) {
          addInsight({
            id: 'category-focus',
            type: 'pattern',
            title: t('insights.categoryFocus.title', { category: topCategory[0] }),
            description: t('insights.categoryFocus.description', {
              count: topCategory[1] as number,
              category: topCategory[0],
            }),
            priority: 'low',
            timestamp: Date.now(),
          });
        }
      }
    },
    [t, insights, addInsight, removeInsight],
  );

  return { generateInsights };
}
