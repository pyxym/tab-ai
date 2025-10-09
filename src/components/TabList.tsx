import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoryStore } from '../store/categoryStore';
import { getColorHex } from '../utils/colorUtils';
import { filterProtectedTabs } from '../utils/tabFilters';
import { organizeTabsUnified } from '../utils/unifiedOrganizer';
import { CustomSelect } from './CustomSelect';
import { FavIcon } from './FavIcon';
import { InfoTooltip } from './InfoTooltip';

/**
 * 탭 목록 컴포넌트의 Props
 */
interface TabListProps {
  onClose: () => void; // 모달 닫기 핸들러
}

/**
 * 카테고리가 포함된 탭 타입
 */
interface TabWithCategory extends chrome.tabs.Tab {
  category?: string; // 탭이 속한 카테고리 ID
}

/**
 * 탭 목록 컴포넌트
 * 현재 창의 모든 탭을 카테고리별로 분류하여 표시
 * 탭을 선택하여 카테고리 변경 가능
 *
 * @component
 * @param {TabListProps} props - 컴포넌트 속성
 */
export const TabList: React.FC<TabListProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { categories, getCategoryForDomain, assignDomainToCategory, loadCategories } = useCategoryStore();

  // 컴포넌트 상태 관리
  const [tabs, setTabs] = useState<TabWithCategory[]>([]); // 탭 목록
  const [selectedTab, setSelectedTab] = useState<number | null>(null); // 선택된 탭
  const [isUpdating, setIsUpdating] = useState(false); // 업데이트 중 상태
  const [isOrganizing, setIsOrganizing] = useState(false); // 정리 중 상태

  // 컴포넌트 마운트 시 카테고리와 탭 로드
  useEffect(() => {
    loadCategories();
    loadTabs();
  }, [loadCategories]);

  /**
   * 현재 창의 모든 탭을 로드하고 카테고리 정보 추가
   * 보호된 탭(화상회의, 시스템 페이지)은 제외
   */
  const loadTabs = async () => {
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    // 보호된 탭(Google Meet, Teams, 시스템 페이지 등) 필터링
    const filteredTabs = filterProtectedTabs(allTabs);
    const tabsWithCategories = filteredTabs.map((tab) => {
      if (tab.url) {
        try {
          // 도메인 추출 및 카테고리 확인
          const domain = new URL(tab.url).hostname.replace(/^www\./, '');
          const category = getCategoryForDomain(domain);
          return { ...tab, category };
        } catch {
          return { ...tab, category: 'uncategorized' };
        }
      }
      return { ...tab, category: 'uncategorized' };
    });

    // 카테고리 순서대로 탭 정렬
    const categoryOrder = categories.map((c) => c.id);
    const sortedTabs = tabsWithCategories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category || 'uncategorized');
      const bIndex = categoryOrder.indexOf(b.category || 'uncategorized');
      return aIndex - bIndex;
    });

    setTabs(sortedTabs);
  };

  /**
   * 탭의 카테고리를 변경하는 핸들러
   * 동일한 도메인의 모든 탭에 적용됨
   */
  const handleCategoryChange = async (tabId: number, tabUrl: string, newCategoryId: string) => {
    if (!tabUrl) return;

    setIsUpdating(true);
    try {
      // URL에서 도메인 추출
      const domain = new URL(tabUrl).hostname.replace(/^www\./, '');
      // 도메인을 새 카테고리에 할당
      await assignDomainToCategory(domain, newCategoryId);

      // 로컬 상태 업데이트 - 같은 도메인의 모든 탭
      setTabs(
        tabs.map((tab) => {
          if (tab.url) {
            try {
              const tabDomain = new URL(tab.url).hostname.replace(/^www\./, '');
              if (tabDomain === domain) {
                return { ...tab, category: newCategoryId };
              }
            } catch {
              // 잘못된 URL은 무시
            }
          }
          return tab;
        }),
      );

      // AI 학습은 추후 버전에서 구현 예정
      // TODO: AI 학습 기능 구현

      // 자동 정리는 하지 않음 - 사용자가 "그룹화 적용" 버튼 클릭 시에만
      // 성공 피드백 표시
      setSelectedTab(tabId);
      setTimeout(() => setSelectedTab(null), 1500);

      // 업데이트된 카테고리를 표시하기 위해 탭 다시 로드
      await loadTabs();
    } catch (error) {
      console.error('카테고리 업데이트 실패:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * 카테고리별로 탭을 그룹화하는 함수
   * Chrome Tab Groups API를 사용하여 탭을 정리
   */
  const organizeTabsByCategory = async () => {
    if (isOrganizing) return;

    try {
      setIsOrganizing(true);

      // 통합 정리 함수 사용
      const result = await organizeTabsUnified(categories);

      // 정리 후 탭 목록 새로고침
      setTimeout(() => {
        loadTabs();
      }, 500);
    } catch (error) {
      console.error('[TabQuest] 탭 정리 실패:', error);
    } finally {
      setIsOrganizing(false);
    }
  };

  /**
   * 카테고리 ID로 색상 코드를 가져오는 함수
   * @param {string} categoryId - 카테고리 ID
   * @returns {string} HEX 색상 코드
   */
  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? getColorHex(category.color) : '#6B7280';
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] py-2 px-4">
      {/* 모달 배경 오버레이 */}
      {/* 모달 메인 컨테이너 */}
      <div className="glass-main rounded-[24px] w-full max-w-2xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* 헤더 영역 */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.tabAssignment.assignTabsToCategories')}</h2>
              {/* 정보 툴팁 */}
              <InfoTooltip
                title={t('modal.tabAssignment.infoTitle')}
                description={t('modal.tabAssignment.infoDescription')}
                features={t('modal.tabAssignment.infoFeatures', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* 그룹화 적용 버튼 */}
              <button
                onClick={organizeTabsByCategory}
                className="glass-button-primary !py-2 !px-3 text-sm"
                disabled={isOrganizing || isUpdating}
                title={t('modal.tabAssignment.applyButtonTooltip')}
              >
                {isOrganizing ? `⏳ ${t('modal.tabAssignment.applying')}` : `🎯 ${t('modal.tabAssignment.applyGrouping')}`}
              </button>
              {/* 닫기 버튼 */}
              <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* 탭 목록 영역 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`glass-card py-2 px-3 transition-all relative ${
                  selectedTab === tab.id ? 'ring-2 ring-green-500' : '' // 선택된 탭 하이라이트
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* 파비콘 */}
                  <FavIcon url={tab.favIconUrl || tab.url} size={18} className="flex-shrink-0 mt-0.5" />

                  {/* 탭 제목과 URL (두 줄) */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm glass-text truncate font-semibold leading-tight"
                      title={tab.title || t('modal.tabAssignment.untitled')}
                    >
                      {tab.title || t('modal.tabAssignment.untitled')}
                    </p>
                    {tab.url && (
                      <p className="text-[10px] glass-text opacity-50 truncate mt-0.5" title={tab.url}>
                        {tab.url}
                      </p>
                    )}
                  </div>

                  {/* 카테고리 선택자 */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-center">
                    {/* 커스텀 카테고리 드롭다운 */}
                    <CustomSelect
                      value={tab.category || 'uncategorized'}
                      options={categories}
                      onChange={(value) => handleCategoryChange(tab.id!, tab.url!, value)}
                      disabled={isUpdating || !tab.url}
                    />

                    {/* 성공 표시 */}
                    {selectedTab === tab.id && <span className="text-green-500 text-sm">✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
