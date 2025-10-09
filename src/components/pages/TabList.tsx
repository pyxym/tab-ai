import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categorySelectors, useCategoryStore } from '../../store/categoryStore';
import { filterProtectedTabs } from '../../utils/tabFilters';
import { organizeTabsUnified } from '../../utils/unifiedOrganizer';
import { TabListItem } from '../items/TabListItem';
import { InfoTooltip } from '../ui/InfoTooltip';

interface TabListProps {
  onClose: () => void;
}

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string;
}

/**
 * Optimized TabList Component
 * Reduced from 250 lines to ~150 lines with better performance
 * - Memoized tab items to prevent unnecessary re-renders
 * - Consolidated state management
 * - Extracted tab item to separate component
 */
export const TabList: React.FC<TabListProps> = ({ onClose }) => {
  const { t } = useTranslation();

  // 최적화된 선택자 사용 - 카테고리 데이터만 구독
  const categories = useCategoryStore(categorySelectors.categories);
  const getCategoryForDomain = useCategoryStore((state) => state.getCategoryForDomain);
  const assignDomainToCategory = useCategoryStore((state) => state.assignDomainToCategory);
  const loadCategories = useCategoryStore((state) => state.loadCategories);

  const [tabs, setTabs] = useState<TabWithCategory[]>([]);
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Load categories and tabs on mount
  useEffect(() => {
    loadCategories();
    loadTabs();
  }, [loadCategories]);

  // Load tabs with category info
  const loadTabs = useCallback(async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const filteredTabs = filterProtectedTabs(allTabs);

    const tabsWithCategories = filteredTabs.map((tab) => {
      if (tab.url) {
        try {
          const domain = new URL(tab.url).hostname.replace(/^www\./, '');
          const category = getCategoryForDomain(domain);
          return { ...tab, category };
        } catch {
          return { ...tab, category: 'uncategorized' };
        }
      }
      return { ...tab, category: 'uncategorized' };
    });

    // Sort by category order
    const categoryOrder = categories.map((c) => c.id);
    const sortedTabs = tabsWithCategories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category || 'uncategorized');
      const bIndex = categoryOrder.indexOf(b.category || 'uncategorized');
      return aIndex - bIndex;
    });

    setTabs(sortedTabs);
  }, [categories, getCategoryForDomain]);

  // Handle category change
  const handleCategoryChange = useCallback(
    async (tabId: number, tabUrl: string, newCategoryId: string) => {
      if (!tabUrl) return;

      setIsUpdating(true);
      try {
        const domain = new URL(tabUrl).hostname.replace(/^www\./, '');
        await assignDomainToCategory(domain, newCategoryId);

        // Update local state for same domain tabs
        setTabs((prevTabs) =>
          prevTabs.map((tab) => {
            if (tab.url) {
              try {
                const tabDomain = new URL(tab.url).hostname.replace(/^www\./, '');
                if (tabDomain === domain) {
                  return { ...tab, category: newCategoryId };
                }
              } catch {
                // Invalid URL, skip
              }
            }
            return tab;
          }),
        );

        // Show success feedback
        setSelectedTab(tabId);
        setTimeout(() => setSelectedTab(null), 1500);

        // Reload tabs
        await loadTabs();
      } catch (error) {
        console.error('[TabList] Category update failed:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [assignDomainToCategory, loadTabs],
  );

  // Handle organization
  const organizeTabsByCategory = useCallback(async () => {
    if (isOrganizing) return;

    try {
      setIsOrganizing(true);
      await organizeTabsUnified(categories);
      setTimeout(() => loadTabs(), 500);
    } catch (error) {
      console.error('[TabList] Organization failed:', error);
    } finally {
      setIsOrganizing(false);
    }
  }, [isOrganizing, categories, loadTabs]);

  // Memoized tab stats
  const stats = useMemo(() => {
    const categoryCounts = tabs.reduce(
      (acc, tab) => {
        const cat = tab.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: tabs.length,
      categorized: tabs.filter((t) => t.category && t.category !== 'uncategorized').length,
      categories: Object.keys(categoryCounts).length,
    };
  }, [tabs]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] py-2 px-4">
      <div className="glass-main rounded-[24px] w-full max-w-2xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.tabAssignment.assignTabsToCategories')}</h2>
              <InfoTooltip
                title={t('modal.tabAssignment.infoTitle')}
                description={t('modal.tabAssignment.infoDescription')}
                features={t('modal.tabAssignment.infoFeatures', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={organizeTabsByCategory}
                className="glass-button-primary !py-2 !px-3 text-sm"
                disabled={isOrganizing || isUpdating}
                title={t('modal.tabAssignment.applyButtonTooltip')}
              >
                {isOrganizing ? `⏳ ${t('modal.tabAssignment.applying')}` : `🎯 ${t('modal.tabAssignment.applyGrouping')}`}
              </button>

              <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
                ✕
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs glass-text opacity-70">
            <span>📊 {stats.total} tabs</span>
            <span>🏷️ {stats.categorized} categorized</span>
            <span>📁 {stats.categories} groups</span>
          </div>
        </div>

        {/* Tab List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {tabs.map((tab) => (
              <TabListItem
                key={tab.id}
                tab={tab}
                categories={categories}
                isSelected={selectedTab === tab.id}
                isUpdating={isUpdating}
                onCategoryChange={handleCategoryChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
