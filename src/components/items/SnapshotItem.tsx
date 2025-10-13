import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TabGroupSnapshot } from '../../types/snapshot';
import { getColorHex } from '../../utils/colorUtils';
import { FavIcon } from '../ui/FavIcon';

interface SnapshotItemProps {
  snapshot: TabGroupSnapshot;
  isCollapsed: boolean;
  onToggleClick: (event: React.MouseEvent<HTMLElement>) => void;
  onRestoreClick: (event: React.MouseEvent<HTMLElement>) => void;
  onDeleteClick: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * 저장된 스냅샷 아이템 컴포넌트
 * React.memo로 최적화하여 불필요한 재렌더링 방지
 */
export const SnapshotItem = React.memo(
  function SnapshotItem({ snapshot, isCollapsed, onToggleClick, onRestoreClick, onDeleteClick }: SnapshotItemProps) {
    const { t } = useTranslation();

    return (
      <div className="glass-card overflow-hidden">
        {/* 스냅샷 헤더 */}
        <div
          data-group-id={snapshot.id}
          onClick={onToggleClick}
          className="flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all group border-b border-white/5"
        >
          {/* 아코디언 화살표 */}
          <button
            data-group-id={snapshot.id}
            onClick={onToggleClick}
            className="text-white/60 hover:text-white transition-colors mr-2 group-hover:scale-110"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 색상 인디케이터 */}
          <div
            className="w-3 h-3 rounded flex-shrink-0 mr-2 ring-1 ring-white/10"
            style={{ backgroundColor: getColorHex(snapshot.color as string) }}
          />

          {/* 제목과 카운트 */}
          <div className="flex-1 min-w-0 mr-2 flex items-baseline gap-1">
            <h3 className="text-xs font-medium glass-text truncate leading-tight">{snapshot.name}</h3>
            <span className="text-[10px] glass-text opacity-40 flex-shrink-0">
              {snapshot.tabs.length} {t('modal.tabGroups.tabs')}
            </span>
          </div>

          {/* 날짜와 시간 */}
          <span className="text-[10px] glass-text opacity-30 mr-2 flex-shrink-0">
            {new Date(snapshot.createdAt).toLocaleString(undefined, {
              year: '2-digit',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* 액션 버튼들 */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              data-snapshot-id={snapshot.id}
              onClick={onRestoreClick}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-green-500/20 transition-all"
              title={t('modal.tabGroups.restoreSnapshot')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              data-snapshot-id={snapshot.id}
              onClick={onDeleteClick}
              className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all"
              title={t('actions.delete')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 스냅샷 탭 목록 */}
        {!isCollapsed && (
          <div className="px-2 pb-1 pt-0.5 space-y-0.5 relative ml-2">
            {/* 🎨 개선된 트리 라인 - 더 진하고 선명하게 */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-400/60 via-purple-400/40 to-purple-400/20"></div>

            {snapshot.tabs.slice(0, 5).map((tab, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 transition-all cursor-pointer group ml-2 relative"
              >
                {/* 🎨 개별 탭 연결선 - 더 선명하게 */}
                <div className="absolute left-[-8px] top-1/2 w-2 h-[1px] bg-purple-400/50"></div>
                <FavIcon
                  url={tab.favIconUrl || tab.url}
                  size={12}
                  className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] glass-text truncate group-hover:text-purple-300 group-hover:font-medium transition-all leading-tight">
                    {tab.title}
                  </p>
                </div>
              </div>
            ))}
            {snapshot.tabs.length > 5 && (
              <div className="px-2 py-1 ml-2">
                <p className="text-[10px] glass-text opacity-40">+{snapshot.tabs.length - 5} more...</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
  // Custom comparison - 스냅샷 ID와 collapse 상태만 비교
  (prevProps, nextProps) => {
    return prevProps.snapshot.id === nextProps.snapshot.id && prevProps.isCollapsed === nextProps.isCollapsed;
  },
);
