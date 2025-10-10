import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categorySelectors, useCategoryStore } from '../../store/categoryStore';
import { filterProtectedTabs } from '../../utils/tabFilters';
import { organizeTabsUnified } from '../../utils/unifiedOrganizer';
import { TabCategoryItem } from '../items/TabCategoryItem';
import { InfoTooltip } from '../ui/InfoTooltip';

interface TabCategoryOrganizerProps {
  onClose: () => void;
}

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string;
}

/**
 * 탭 카테고리 정리 컴포넌트
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

  // 🚀 성능 개선 2: 카테고리 배열 참조 안정화
  // 카테고리 전체 객체 대신 ID와 이름만 전달하여 불필요한 리렌더링 방지
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      })),
    [categories],
  );

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

  // 🚀 성능 개선 1: useCallback 의존성 최적화
  // getCategoryForDomain과 assignDomainToCategory를 useRef로 안정화
  const getCategoryForDomainRef = useRef(getCategoryForDomain);
  const assignDomainToCategoryRef = useRef(assignDomainToCategory);
  useEffect(() => {
    getCategoryForDomainRef.current = getCategoryForDomain;
    assignDomainToCategoryRef.current = assignDomainToCategory;
  }, [getCategoryForDomain, assignDomainToCategory]);

  // 카테고리 정보와 함께 탭 로드
  const loadTabs = useCallback(async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const filteredTabs = filterProtectedTabs(allTabs);

    // 🚀 성능: 탭 순서 유지 (정렬 제거로 O(n log n) → O(n) 개선)
    // 사용자는 원래 탭 순서를 선호하며, 카테고리 정렬은 실제 조직화 시 적용됨
    const tabsWithCategories = filteredTabs.map((tab) => {
      if (tab.url) {
        const domain = getDomainFromUrl(tab.url);
        if (domain) {
          const category = getCategoryForDomainRef.current(domain);
          return { ...tab, category };
        }
      }
      return { ...tab, category: 'uncategorized' };
    });

    setTabs(tabsWithCategories);
  }, [getDomainFromUrl]);

  // 마운트 시 카테고리 및 탭 로드
  useEffect(() => {
    loadCategories();
    loadTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🚀 성능 개선 3: handleCategoryChange 최적화
  // 카테고리 변경 처리 - 도메인별로 탭을 미리 그룹화하여 성능 개선
  const handleCategoryChange = useCallback(
    async (tabId: number, tabUrl: string, newCategoryId: string) => {
      if (!tabUrl) return;

      setIsUpdating(true);
      try {
        // 캐시된 도메인 파싱 사용
        const domain = getDomainFromUrl(tabUrl);
        if (!domain) return;

        await assignDomainToCategoryRef.current(domain, newCategoryId);

        // 🚀 최적화: 같은 도메인의 탭 ID들을 먼저 수집 (O(n) 1회)
        const affectedTabIds = new Set<number>();
        setTabs((prevTabs) => {
          // 첫 번째 패스: 영향받는 탭 찾기
          prevTabs.forEach((tab) => {
            if (tab.url && tab.id) {
              const tabDomain = getDomainFromUrl(tab.url);
              if (tabDomain === domain) {
                affectedTabIds.add(tab.id);
              }
            }
          });

          // 두 번째 패스: 한 번에 업데이트
          return prevTabs.map((tab) => (affectedTabIds.has(tab.id!) ? { ...tab, category: newCategoryId } : tab));
        });

        // 성공 피드백 표시
        setSelectedTab(tabId);
        setTimeout(() => setSelectedTab(null), 1500);
      } catch (error) {
        console.error('[TabCategoryOrganizer] 카테고리 업데이트 실패:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [getDomainFromUrl],
  );

  // 🚀 성능 개선 1: organizeTabsByCategory 의존성 최적화
  // 조직화 처리 - isOrganizing을 state로 체크하여 의존성 제거
  const organizeTabsByCategory = useCallback(async () => {
    setIsOrganizing((prev) => {
      if (prev) return prev; // 이미 실행 중이면 무시
      return true;
    });

    try {
      await organizeTabsUnified(categories);
      // 🚀 성능: 불필요한 delay 제거, 즉시 탭 새로고침
      await loadTabs();
    } catch (error) {
      console.error('[TabCategoryOrganizer] 조직화 실패:', error);
    } finally {
      setIsOrganizing(false);
    }
  }, [categories, loadTabs]);

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
      <div className="glass-main rounded-[12px] w-full max-w-2xl h-[95vh] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20">
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
              <TabCategoryItem
                key={tab.id}
                tab={tab}
                categories={categoryOptions}
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
