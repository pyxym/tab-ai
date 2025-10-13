import React from 'react';
import { useTranslation } from 'react-i18next';
import { getColorHex } from '../../utils/colorUtils';
import { FavIcon } from '../ui/FavIcon';

interface TabGroupItemProps {
  group: {
    id: number;
    title: string;
    color: chrome.tabGroups.ColorEnum;
    collapsed: boolean;
    tabs: chrome.tabs.Tab[];
    windowId: number;
  };
  onGroupClick: (event: React.MouseEvent<HTMLElement>) => void;
  onSaveClick: (event: React.MouseEvent<HTMLElement>) => void;
  onTabClick: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * 🚀 탭 그룹 아이템 컴포넌트
 *
 * TabCategoryItem 패턴을 따라 분리된 컴포넌트
 *
 * 장점:
 * - 코드 재사용성 향상
 * - TabGroupManager 가독성 개선
 * - React.memo로 불필요한 리렌더 방지
 * - 유지보수 용이
 */
export const TabGroupItem = React.memo(
  function TabGroupItem({ group, onGroupClick, onSaveClick, onTabClick }: TabGroupItemProps) {
    const { t } = useTranslation();

    return (
      <div className="glass-card overflow-hidden">
        {/* 그룹 헤더 - 클릭 시 아코디언 토글 */}
        <div
          data-group-id={group.id}
          onClick={onGroupClick}
          className="flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all group border-b border-white/5"
        >
          {/* 아코디언 화살표 - Chrome 실제 상태 반영 */}
          <div className="text-white/60 group-hover:text-white transition-colors mr-2 group-hover:scale-110">
            <svg
              className={`w-3 h-3 transition-transform ${group.collapsed ? '' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* 색상 인디케이터 */}
          <div className="w-3 h-3 rounded flex-shrink-0 mr-2 ring-1 ring-white/10" style={{ backgroundColor: getColorHex(group.color) }} />

          {/* 제목과 카운트 - 한 줄로 */}
          <div className="flex-1 min-w-0 mr-2 flex items-baseline gap-1">
            <h3 className="text-xs font-medium glass-text truncate leading-tight">{group.title}</h3>
            <span className="text-[10px] glass-text opacity-40 flex-shrink-0">
              {group.tabs.length} {t('modal.tabGroups.tabs')}
            </span>
          </div>

          {/* 스냅샷 저장 버튼 */}
          <button
            data-group-id={group.id}
            onClick={onSaveClick}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-purple-500/20 transition-all flex-shrink-0"
            title={t('modal.tabGroups.takeSnapshot')}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* 그룹 내 탭들 - Chrome 실제 상태에 따라 표시 */}
        {!group.collapsed && (
          <div className="px-2 pb-1 pt-0.5 space-y-0.5 relative ml-2">
            {/* 🎨 개선된 트리 라인 - 그라디언트로 더 선명하게 */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500/30 via-purple-400/20 to-transparent"></div>

            {group.tabs.map((tab) => (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                onClick={onTabClick}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 transition-all cursor-pointer group ml-2 relative"
              >
                {/* 🎨 개별 탭 연결선 */}
                <div className="absolute left-[-8px] top-1/2 w-2 h-[1px] bg-gradient-to-r from-purple-400/30 to-transparent"></div>
                <FavIcon
                  url={tab.favIconUrl || tab.url}
                  size={12}
                  className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] glass-text truncate group-hover:text-purple-300 group-hover:font-medium transition-all leading-tight">
                    {tab.title || t('modal.tabCategoryOrganizer.untitled')}
                  </p>
                </div>
                {tab.active && (
                  <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0 animate-pulse shadow-lg shadow-green-400/50"></span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // React.memo용 커스텀 비교 함수
    // 그룹 상태가 변경될 때만 리렌더링
    return (
      prevProps.group.id === nextProps.group.id &&
      prevProps.group.title === nextProps.group.title &&
      prevProps.group.color === nextProps.group.color &&
      prevProps.group.collapsed === nextProps.group.collapsed &&
      prevProps.group.tabs.length === nextProps.group.tabs.length &&
      // 탭 배열의 깊은 비교 (ID와 active 상태만)
      prevProps.group.tabs.every((tab, index) => {
        const nextTab = nextProps.group.tabs[index];
        return tab.id === nextTab?.id && tab.active === nextTab?.active && tab.title === nextTab?.title;
      })
    );
  },
);
