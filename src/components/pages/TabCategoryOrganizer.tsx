import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categorySelectors, useCategoryStore } from '../../store/categoryStore';
import { filterProtectedTabs } from '../../utils/tabFilters';
import { organizeTabsUnified } from '../../utils/unifiedOrganizer';
import { TabListItem } from '../items/TabListItem';
import { InfoTooltip } from '../ui/InfoTooltip';

interface TabCategoryOrganizerProps {
  onClose: () => void;
}

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string;
}

/**
 * 탭 카테고리 정리 컴포넌트 (최적화됨)
 * 250줄에서 ~150줄로 축소하여 성능 개선
 * - 메모이제이션된 탭 아이템으로 불필요한 리렌더링 방지
 * - 통합된 상태 관리
 * - 탭 아이템을 별도 컴포넌트로 분리
 */
export const TabCategoryOrganizer: React.FC<TabCategoryOrganizerProps> = ({ onClose }) => {
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

  // 마운트 시 카테고리 및 탭 로드
  useEffect(() => {
    loadCategories();
    loadTabs();
  }, [loadCategories]);

  // 🚀 성능: 반복된 URL 파싱을 피하기 위한 도메인 파싱 캐시
  const domainCache = useMemo(() => new Map<string, string>(), []);

  // 캐싱을 사용한 도메인 추출 헬퍼 함수
  const getDomainFromUrl = useCallback(
    (url: string): string => {
      if (domainCache.has(url)) return domainCache.get(url)!;

      try {
        const domain = new URL(url).hostname.replace(/^www\./, '');
        domainCache.set(url, domain);
        return domain;
      } catch {
        domainCache.set(url, '');
        return '';
      }
    },
    [domainCache],
  );

  // 카테고리 정보와 함께 탭 로드
  const loadTabs = useCallback(async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const filteredTabs = filterProtectedTabs(allTabs);

    // 🚀 성능: O(n) indexOf 대신 O(1) 카테고리 순서 조회를 위한 Map 생성
    const categoryOrderMap = new Map<string, number>();
    categories.forEach((cat, index) => {
      categoryOrderMap.set(cat.id, index);
    });
    categoryOrderMap.set('uncategorized', categories.length);

    const tabsWithCategories = filteredTabs.map((tab) => {
      if (tab.url) {
        const domain = getDomainFromUrl(tab.url);
        if (domain) {
          const category = getCategoryForDomain(domain);
          return { ...tab, category };
        }
      }
      return { ...tab, category: 'uncategorized' };
    });

    // 🚀 성능: 정렬 시 O(n) indexOf 대신 O(1) Map 조회 사용
    const sortedTabs = tabsWithCategories.sort((a, b) => {
      const aIndex = categoryOrderMap.get(a.category || 'uncategorized') ?? categories.length;
      const bIndex = categoryOrderMap.get(b.category || 'uncategorized') ?? categories.length;
      return aIndex - bIndex;
    });

    setTabs(sortedTabs);
  }, [categories, getCategoryForDomain, getDomainFromUrl]);

  // 카테고리 변경 처리
  const handleCategoryChange = useCallback(
    async (tabId: number, tabUrl: string, newCategoryId: string) => {
      if (!tabUrl) return;

      setIsUpdating(true);
      try {
        // 🚀 성능: 캐시된 도메인 파싱 사용
        const domain = getDomainFromUrl(tabUrl);
        if (!domain) return;

        await assignDomainToCategory(domain, newCategoryId);

        // 🚀 성능: 전체 리로드 없이 영향받는 탭만 업데이트
        setTabs((prevTabs) =>
          prevTabs.map((tab) => {
            if (tab.url) {
              const tabDomain = getDomainFromUrl(tab.url);
              if (tabDomain === domain) {
                return { ...tab, category: newCategoryId };
              }
            }
            return tab;
          }),
        );

        // 성공 피드백 표시
        setSelectedTab(tabId);
        setTimeout(() => setSelectedTab(null), 1500);
      } catch (error) {
        console.error('[TabCategoryOrganizer] 카테고리 업데이트 실패:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [assignDomainToCategory, getDomainFromUrl],
  );

  // 조직화 처리
  const organizeTabsByCategory = useCallback(async () => {
    if (isOrganizing) return;

    try {
      setIsOrganizing(true);
      await organizeTabsUnified(categories);
      setTimeout(() => loadTabs(), 500);
    } catch (error) {
      console.error('[TabCategoryOrganizer] 조직화 실패:', error);
    } finally {
      setIsOrganizing(false);
    }
  }, [isOrganizing, categories, loadTabs]);

  // 메모이제이션된 탭 통계
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-2xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.tabCategoryOrganizer.assignTabsToCategories')}</h2>
              <InfoTooltip
                title={t('modal.tabCategoryOrganizer.infoTitle')}
                description={t('modal.tabCategoryOrganizer.infoDescription')}
                features={t('modal.tabCategoryOrganizer.infoFeatures', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={organizeTabsByCategory}
                className="glass-button-primary !py-2 !px-3 text-sm"
                disabled={isOrganizing || isUpdating}
                title={t('modal.tabCategoryOrganizer.applyButtonTooltip')}
              >
                {isOrganizing ? `⏳ ${t('modal.tabCategoryOrganizer.applying')}` : `🎯 ${t('modal.tabCategoryOrganizer.applyGrouping')}`}
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
