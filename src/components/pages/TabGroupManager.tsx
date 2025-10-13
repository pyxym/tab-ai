import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useTabGroups } from '../../hooks/useTabGroups';
import type { TabGroupSnapshot } from '../../types/snapshot';
import { createSnapshotFromGroup, deleteSnapshot, getAllSnapshots, restoreSnapshotAsGroup } from '../../utils/snapshotStorage';
import { SnapshotItem } from '../items/SnapshotItem';
import { TabGroupItem } from '../items/TabGroupItem';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FavIcon } from '../ui/FavIcon';
import { InfoTooltip } from '../ui/InfoTooltip';

/**
 * 탭 그룹 관리 Props
 */
interface TabGroupManagerProps {
  onClose: () => void;
}

/**
 * 탭 그룹 관리 컴포넌트
 * 현재 창의 모든 탭 그룹과 그룹화된 탭들을 표시하고 스냅샷 관리 기능 제공
 * 🚀 최적화: Custom hooks로 로직 분리 + React.memo로 불필요한 재렌더 방지
 */
export const TabGroupManager: React.FC<TabGroupManagerProps> = React.memo(({ onClose }) => {
  const { t } = useTranslation();

  // 🚀 최적화 4: useTabGroups 커스텀 훅 사용
  const { groups, ungroupedTabs, loading, loadTabGroups, toggleGroup, activateTab } = useTabGroups();

  // 🚀 최적화 6: useConfirmModal 커스텀 훅 사용
  const { confirmModal, showModal, closeModal } = useConfirmModal();

  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [snapshots, setSnapshots] = useState<TabGroupSnapshot[]>([]);
  // 스냅샷 전용 collapse 상태 관리
  const [snapshotCollapsedState, setSnapshotCollapsedState] = useState<Record<string, boolean>>({});
  // 🚀 그룹화되지 않은 탭 접기/펼치기 상태
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);

  // 초기 마운트 시에만 로드
  useEffect(() => {
    loadTabGroups();
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 저장된 스냅샷 로드
   */
  const loadSnapshots = async () => {
    const savedSnapshots = await getAllSnapshots();
    setSnapshots(savedSnapshots);
  };

  // 🚀 최적화: 이벤트 위임을 위한 통합 핸들러
  const handleGroupClick = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const groupId = target.getAttribute('data-group-id');
      if (!groupId) return;

      const numericId = parseInt(groupId, 10);

      // 현재 탭 그룹인 경우 (숫자 ID) - Chrome 상태도 함께 토글
      if (!isNaN(numericId)) {
        const result = await toggleGroup(numericId);
        if (!result.success) {
          showModal({
            title: t('messages.error'),
            message: t('messages.toggleFailed'),
            variant: 'error',
          });
        }
        return;
      }

      // 저장된 스냅샷의 경우 로컬 상태만 변경
      // ✅ FIX: undefined인 경우 true로 간주하여 첫 클릭에서 false(열림)로 변경
      setSnapshotCollapsedState((prev) => ({
        ...prev,
        [groupId]: prev[groupId] === undefined ? false : !prev[groupId],
      }));
    },
    [toggleGroup, showModal, t],
  );

  const handleTabClick = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const tabId = target.getAttribute('data-tab-id');
      if (tabId) {
        const result = await activateTab(parseInt(tabId, 10));
        if (!result.success) {
          showModal({
            title: t('messages.error'),
            message: t('messages.activateTabFailed'),
            variant: 'error',
          });
        }
      }
    },
    [activateTab, showModal, t],
  );

  const handleSaveClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const groupId = event.currentTarget.getAttribute('data-group-id');
      if (groupId) {
        handleSaveSnapshot(parseInt(groupId, 10));
      }
    },
    [groups],
  );

  const handleRestoreClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const snapshotId = event.currentTarget.getAttribute('data-snapshot-id');
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (snapshot) {
        handleRestoreSnapshot(snapshot);
      }
    },
    [snapshots],
  );

  const handleDeleteClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const snapshotId = event.currentTarget.getAttribute('data-snapshot-id');
    if (snapshotId) {
      handleDeleteSnapshot(snapshotId);
    }
  }, []);

  /**
   * 탭 그룹 스냅샷 저장 - 확인 모달 표시
   */
  const handleSaveSnapshot = async (groupId: number) => {
    // 그룹 정보 가져오기
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // 확인 모달 표시
    showModal({
      title: t('actions.confirm'),
      message: t('messages.snapshotSaveConfirm', {
        groupTitle: group.title,
        tabCount: group.tabs.length,
      }),
      variant: 'info',
      onConfirm: () => confirmSaveSnapshot(groupId),
    });
  };

  /**
   * 스냅샷 저장 실행
   */
  const confirmSaveSnapshot = async (groupId: number) => {
    closeModal();

    try {
      const snapshot = await createSnapshotFromGroup(groupId);
      if (snapshot) {
        await loadSnapshots();
        showModal({
          title: t('messages.success'),
          message: t('messages.snapshotSaved'),
          variant: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      showModal({
        title: t('messages.error'),
        message: t('messages.snapshotError'),
        variant: 'error',
      });
    }
  };

  /**
   * 스냅샷 복원
   */
  const handleRestoreSnapshot = async (snapshot: TabGroupSnapshot) => {
    try {
      const groupId = await restoreSnapshotAsGroup(snapshot);
      if (groupId) {
        await loadTabGroups();
        showModal({
          title: t('messages.success'),
          message: t('messages.snapshotRestored'),
          variant: 'success',
        });
      } else {
        showModal({
          title: t('messages.error'),
          message: t('messages.snapshotRestoreFailed'),
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      showModal({
        title: t('messages.error'),
        message: t('messages.snapshotError'),
        variant: 'error',
      });
    }
  };

  /**
   * 스냅샷 삭제
   */
  const handleDeleteSnapshot = async (snapshotId: string) => {
    showModal({
      title: t('actions.confirm'),
      message: t('messages.snapshotDeleteConfirm'),
      variant: 'warning',
      onConfirm: async () => {
        try {
          await deleteSnapshot(snapshotId);
          await loadSnapshots();
          closeModal();
        } catch (error) {
          console.error('Failed to delete snapshot:', error);
          showModal({
            title: t('messages.error'),
            message: t('messages.snapshotError'),
            variant: 'error',
          });
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[12px] w-full max-w-3xl h-[95vh] max-h-[95vh] flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold ai-gradient-text">{t('modal.tabGroups.title')}</h2>
              <InfoTooltip
                title={t('modal.tabGroups.infoTitle')}
                description={t('modal.tabGroups.infoDescription')}
                features={t('modal.tabGroups.infoFeatures', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>
            <button onClick={onClose} className="glass-button-primary !p-1.5 !px-2.5">
              ✕
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'current'
                  ? 'bg-purple-500/40 glass-text shadow-lg ring-2 ring-purple-400/50'
                  : 'glass-card glass-text opacity-50 hover:opacity-80'
              }`}
            >
              {t('modal.tabGroups.currentTabs')}
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-purple-500/40 glass-text shadow-lg ring-2 ring-purple-400/50'
                  : 'glass-card glass-text opacity-50 hover:opacity-80'
              }`}
            >
              {t('modal.tabGroups.savedGroups')} ({snapshots.length})
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="glass-text opacity-70">{t('actions.loading')}</p>
            </div>
          ) : activeTab === 'current' ? (
            <div className="space-y-1.5">
              {/* 현재 탭 그룹들 */}
              {groups.length > 0 ? (
                groups.map((group) => (
                  <TabGroupItem
                    key={group.id}
                    group={group}
                    onGroupClick={handleGroupClick}
                    onSaveClick={handleSaveClick}
                    onTabClick={handleTabClick}
                  />
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="glass-text opacity-70">{t('modal.tabGroups.noGroups')}</p>
                </div>
              )}

              {/* 그룹화되지 않은 탭들 - 아코디언 형식으로 변경 */}
              {ungroupedTabs.length > 0 && (
                <div className="glass-card overflow-hidden">
                  {/* 헤더 - 클릭하여 접기/펼치기 */}
                  <div
                    onClick={() => setUngroupedCollapsed(!ungroupedCollapsed)}
                    className="flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all group border-b border-white/5"
                  >
                    {/* 아코디언 화살표 */}
                    <div className="text-white/60 group-hover:text-white transition-colors mr-2 group-hover:scale-110">
                      <svg
                        className={`w-3 h-3 transition-transform ${ungroupedCollapsed ? '' : 'rotate-90'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* 회색 인디케이터 (그룹 없음 표시) */}
                    <div className="w-3 h-3 rounded flex-shrink-0 mr-2 ring-1 ring-white/10 bg-gray-500" />

                    {/* 제목과 카운트 */}
                    <div className="flex-1 min-w-0 mr-2 flex items-baseline gap-1">
                      <h3 className="text-xs font-medium glass-text truncate leading-tight">{t('modal.tabGroups.ungrouped')}</h3>
                      <span className="text-[10px] glass-text opacity-40 flex-shrink-0">
                        {ungroupedTabs.length} {t('modal.tabGroups.tabs')}
                      </span>
                    </div>
                  </div>

                  {/* 탭 목록 - 접혔을 때만 숨김 */}
                  {!ungroupedCollapsed && (
                    <div className="px-2 pb-1 pt-0.5 space-y-0.5 border-l-2 border-white/5 ml-2">
                      {ungroupedTabs.map((tab) => (
                        <div
                          key={tab.id}
                          data-tab-id={tab.id}
                          onClick={handleTabClick}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 hover:border-l-2 hover:border-purple-400/50 transition-all cursor-pointer group ml-2"
                        >
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
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* 🚀 최적화 5: SnapshotItem 컴포넌트 사용 */}
              {snapshots.length > 0 ? (
                snapshots.map((snapshot) => (
                  <SnapshotItem
                    key={snapshot.id}
                    snapshot={snapshot}
                    isCollapsed={snapshotCollapsedState[snapshot.id] ?? true}
                    onToggleClick={handleGroupClick}
                    onRestoreClick={handleRestoreClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="glass-text opacity-70">{t('modal.tabGroups.noSnapshots')}</p>
                  <p className="text-xs glass-text opacity-50 mt-2">{t('modal.tabGroups.noSnapshotsTip')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText="OK"
        cancelText={confirmModal.variant === 'warning' || confirmModal.variant === 'info' ? t('actions.cancel') : undefined}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeModal}
      />
    </div>
  );
});
