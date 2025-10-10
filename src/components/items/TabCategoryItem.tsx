import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, ExtendedColorEnum } from '../../types/category';
import { CustomSelect } from '../ui/CustomSelect';
import { FavIcon } from '../ui/FavIcon';

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string;
}

// 🚀 성능: 가벼운 카테고리 옵션 타입 (전체 Category 대신 필요한 필드만)
interface CategoryOption {
  id: string;
  name: string;
  color: ExtendedColorEnum;
}

interface TabCategoryItemProps {
  tab: TabWithCategory;
  categories: CategoryOption[] | Category[];
  isSelected: boolean;
  isUpdating: boolean;
  onCategoryChange: (tabId: number, tabUrl: string, newCategoryId: string) => void;
}

/**
 * 메모이제이션된 탭 카테고리 아이템 컴포넌트
 * 카테고리 선택 드롭다운과 함께 탭을 표시
 * 다른 탭이 변경될 때 불필요한 리렌더링 방지
 * 커스텀 비교: 탭 데이터, 선택 상태, 카테고리 목록이 실제로 변경될 때만 리렌더링
 */
export const TabCategoryItem = React.memo(
  function TabCategoryItem({ tab, categories, isSelected, isUpdating, onCategoryChange }: TabCategoryItemProps) {
    const { t } = useTranslation();

    return (
      <div className={`glass-card py-2 px-3 transition-all relative ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
        <div className="flex items-start gap-2.5">
          {/* 파비콘 */}
          <FavIcon url={tab.favIconUrl || tab.url} size={18} className="flex-shrink-0 mt-0.5" />

          {/* 탭 제목과 URL */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm glass-text truncate font-semibold leading-tight"
              title={tab.title || t('modal.tabCategoryOrganizer.untitled')}
            >
              {tab.title || t('modal.tabCategoryOrganizer.untitled')}
            </p>
            {tab.url && (
              <p className="text-[10px] glass-text opacity-50 truncate mt-0.5" title={tab.url}>
                {tab.url}
              </p>
            )}
          </div>

          {/* 카테고리 선택 */}
          <div className="flex items-center gap-2 flex-shrink-0 self-center">
            <CustomSelect
              value={tab.category || 'uncategorized'}
              options={categories}
              onChange={(value) => onCategoryChange(tab.id!, tab.url!, value)}
              disabled={isUpdating || !tab.url}
            />

            {/* 성공 표시 */}
            {isSelected && <span className="text-green-500 text-sm">✓</span>}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // React.memo용 커스텀 비교 함수
    // 특정 props가 변경될 때만 리렌더링
    return (
      prevProps.tab.id === nextProps.tab.id &&
      prevProps.tab.title === nextProps.tab.title &&
      prevProps.tab.url === nextProps.tab.url &&
      prevProps.tab.category === nextProps.tab.category &&
      prevProps.tab.favIconUrl === nextProps.tab.favIconUrl &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isUpdating === nextProps.isUpdating &&
      prevProps.categories.length === nextProps.categories.length &&
      // 중요한 카테고리 변경만 확인 (길이 + 첫/마지막 아이템 ID)
      prevProps.categories[0]?.id === nextProps.categories[0]?.id &&
      prevProps.categories[prevProps.categories.length - 1]?.id === nextProps.categories[nextProps.categories.length - 1]?.id
    );
  },
);
