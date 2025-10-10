import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types/category';
import { CustomSelect } from '../ui/CustomSelect';
import { FavIcon } from '../ui/FavIcon';

interface TabWithCategory extends chrome.tabs.Tab {
  category?: string;
}

interface TabListItemProps {
  tab: TabWithCategory;
  categories: Category[];
  isSelected: boolean;
  isUpdating: boolean;
  onCategoryChange: (tabId: number, tabUrl: string, newCategoryId: string) => void;
}

/**
 * Memoized tab list item component
 * Prevents re-rendering when other tabs change
 */
export const TabListItem = React.memo(function TabListItem({
  tab,
  categories,
  isSelected,
  isUpdating,
  onCategoryChange,
}: TabListItemProps) {
  const { t } = useTranslation();

  return (
    <div className={`glass-card py-2 px-3 transition-all relative ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
      <div className="flex items-start gap-2.5">
        {/* Favicon */}
        <FavIcon url={tab.favIconUrl || tab.url} size={18} className="flex-shrink-0 mt-0.5" />

        {/* Tab title and URL */}
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

        {/* Category selector */}
        <div className="flex items-center gap-2 flex-shrink-0 self-center">
          <CustomSelect
            value={tab.category || 'uncategorized'}
            options={categories}
            onChange={(value) => onCategoryChange(tab.id!, tab.url!, value)}
            disabled={isUpdating || !tab.url}
          />

          {/* Success indicator */}
          {isSelected && <span className="text-green-500 text-sm">✓</span>}
        </div>
      </div>
    </div>
  );
});
