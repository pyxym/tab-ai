import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoryStore } from '../store/categoryStore';
import { COLOR_TO_CHROME_GROUP } from '../types/category';
import type { TabGroupSnapshot } from '../types/snapshot';
import { createSnapshotFromGroup, deleteSnapshot, getAllSnapshots, restoreSnapshotAsGroup } from '../utils/snapshotStorage';
import { ConfirmModal } from './ConfirmModal';
import { FavIcon } from './FavIcon';

/**
 * 탭 그룹 정보 타입
 */
interface TabGroup {
  id: number;
  title: string;
  color: chrome.tabGroups.ColorEnum;
  collapsed: boolean;
  tabs: chrome.tabs.Tab[];
  windowId: number; // 어느 창에 속한 그룹인지
}

/**
 * 탭 그룹 모달 Props
 */
interface TabGroupsModalProps {
  onClose: () => void;
}

/**
 * 탭 그룹 보기 모달 컴포넌트
 * 현재 창의 모든 탭 그룹과 그룹화된 탭들을 표시
 */
export const TabGroupsModal: React.FC<TabGroupsModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { categories } = useCategoryStore();
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [ungroupedTabs, setUngroupedTabs] = useState<chrome.tabs.Tab[]>([]);
  const [snapshots, setSnapshots] = useState<TabGroupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  // 모달 내에서의 collapse 상태 관리 (groupId -> boolean)
  const [modalCollapsedState, setModalCollapsedState] = useState<Record<number, boolean>>({});

  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'info' | 'warning' | 'error' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadTabGroups();
    loadSnapshots();
  }, []);

  /**
   * 저장된 스냅샷 로드
   */
  const loadSnapshots = async () => {
    const savedSnapshots = await getAllSnapshots();
    setSnapshots(savedSnapshots);
  };

  /**
   * 모든 탭 그룹과 탭 정보 로드
   */
  const loadTabGroups = async () => {
    try {
      setLoading(true);

      // 모든 창의 탭 그룹 가져오기 (현재 창뿐만 아니라 모든 창)
      const tabGroups = await chrome.tabGroups.query({});

      // 모든 탭 가져오기
      const allTabs = await chrome.tabs.query({});

      // 각 그룹에 속한 탭들 수집
      const groupsWithTabs: TabGroup[] = await Promise.all(
        tabGroups.map(async (group) => {
          const groupTabs = allTabs.filter((tab) => tab.groupId === group.id);

          // 그룹 제목에서 카테고리 찾기
          let displayTitle = group.title || t('modal.tabGroups.untitledGroup');

          // 그룹 제목이 단일 문자(약어)인 경우, 카테고리 이름으로 매칭 시도
          if (displayTitle.length === 1 || !group.title) {
            // 1순위: 색상 + 첫 글자 모두 일치하는 카테고리 찾기
            let matchedCategory = categories.find((cat) => {
              const nameMatches = cat.name.charAt(0).toUpperCase() === displayTitle.toUpperCase();
              const colorMatches = COLOR_TO_CHROME_GROUP[cat.color] === group.color;
              return nameMatches && colorMatches;
            });

            // 2순위: 색상만 일치하는 카테고리 찾기 (첫 글자가 다를 수 있음)
            if (!matchedCategory) {
              matchedCategory = categories.find((cat) => COLOR_TO_CHROME_GROUP[cat.color] === group.color);
            }

            // 3순위: 첫 글자만 일치하는 카테고리 찾기 (색상이 다를 수 있음)
            if (!matchedCategory) {
              matchedCategory = categories.find((cat) => cat.name.charAt(0).toUpperCase() === displayTitle.toUpperCase());
            }

            if (matchedCategory) {
              displayTitle = matchedCategory.name;
            }
          }

          return {
            id: group.id,
            title: displayTitle,
            color: group.color,
            collapsed: group.collapsed,
            tabs: groupTabs,
            windowId: group.windowId,
          };
        }),
      );

      // 현재 창의 그룹화되지 않은 탭들만 표시
      const currentWindow = await chrome.windows.getCurrent();
      const ungrouped = allTabs.filter((tab) => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE && tab.windowId === currentWindow.id);

      setGroups(groupsWithTabs);
      setUngroupedTabs(ungrouped);

      // 모달 내 초기 상태: 모든 그룹을 펼친 상태로 표시
      const initialCollapsedState: Record<number, boolean> = {};
      groupsWithTabs.forEach((group) => {
        initialCollapsedState[group.id] = false; // 모달에서는 기본적으로 모두 펼침
      });
      setModalCollapsedState(initialCollapsedState);
    } catch (error) {
      console.error('Failed to load tab groups:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Chrome의 실제 탭 그룹 토글 (접기/펼치기)
   */
  const toggleChromeGroup = async (groupId: number, currentCollapsed: boolean) => {
    try {
      await chrome.tabGroups.update(groupId, { collapsed: !currentCollapsed });
      // Chrome 상태 변경 후 다시 로드
      await loadTabGroups();
    } catch (error) {
      console.error('Failed to toggle group:', error);
    }
  };

  /**
   * 모달 내에서 탭 그룹 토글 (접기/펼치기)
   * Chrome의 실제 그룹 상태는 변경하지 않음
   */
  const toggleModalGroup = (groupId: number) => {
    setModalCollapsedState((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  /**
   * 탭 활성화
   */
  const activateTab = async (tabId: number) => {
    try {
      await chrome.tabs.update(tabId, { active: true });
      // popup을 열린 상태로 유지하기 위해 onClose() 호출 제거
    } catch (error) {
      console.error('Failed to activate tab:', error);
    }
  };

  /**
   * 탭 그룹 스냅샷 저장 - 확인 모달 표시
   */
  const handleSaveSnapshot = async (groupId: number) => {
    // 그룹 정보 가져오기
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // 확인 모달 표시
    setConfirmModal({
      isOpen: true,
      title: t('actions.confirm'),
      message: t('messages.snapshotSaveConfirm', {
        tabCount: group.tabs.length,
        groupCount: 1,
      }),
      variant: 'info',
      onConfirm: () => confirmSaveSnapshot(groupId),
    });
  };

  /**
   * 스냅샷 저장 실행
   */
  const confirmSaveSnapshot = async (groupId: number) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    try {
      const snapshot = await createSnapshotFromGroup(groupId);
      if (snapshot) {
        await loadSnapshots();
        setConfirmModal({
          isOpen: true,
          title: t('messages.success'),
          message: t('messages.snapshotSaved'),
          variant: 'success',
          onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      setConfirmModal({
        isOpen: true,
        title: t('messages.error'),
        message: t('messages.snapshotError'),
        variant: 'error',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
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
        setConfirmModal({
          isOpen: true,
          title: t('messages.success'),
          message: t('messages.snapshotRestored'),
          variant: 'success',
          onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: t('messages.error'),
          message: t('messages.snapshotRestoreFailed'),
          variant: 'error',
          onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        });
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      setConfirmModal({
        isOpen: true,
        title: t('messages.error'),
        message: t('messages.snapshotError'),
        variant: 'error',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  /**
   * 스냅샷 삭제
   */
  const handleDeleteSnapshot = async (snapshotId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('actions.confirm'),
      message: t('messages.snapshotDeleteConfirm'),
      variant: 'warning',
      onConfirm: async () => {
        try {
          await deleteSnapshot(snapshotId);
          await loadSnapshots();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to delete snapshot:', error);
          setConfirmModal({
            isOpen: true,
            title: t('messages.error'),
            message: t('messages.snapshotError'),
            variant: 'error',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  /**
   * 그룹 색상 hex 값 가져오기
   */
  const getGroupColorHex = (color: chrome.tabGroups.ColorEnum): string => {
    const colorMap: Record<chrome.tabGroups.ColorEnum, string> = {
      grey: '#9AA0A6',
      blue: '#4285F4',
      red: '#EA4335',
      yellow: '#FBBC04',
      green: '#34A853',
      pink: '#FF6D9D',
      purple: '#A142F4',
      cyan: '#24C1E0',
      orange: '#FF9800',
    };
    return colorMap[color] || '#9AA0A6';
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] py-2 px-4">
      <div className="glass-main rounded-[24px] w-full max-w-3xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.tabGroups.title')}</h2>
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
              ✕
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'current' ? 'bg-purple-500/30 glass-text font-semibold' : 'glass-card glass-text opacity-60 hover:opacity-100'
              }`}
            >
              {t('modal.tabGroups.currentTabs')}
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                activeTab === 'saved' ? 'bg-purple-500/30 glass-text font-semibold' : 'glass-card glass-text opacity-60 hover:opacity-100'
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
            <div className="space-y-4">
              {/* 현재 탭 그룹들 */}
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.id} className="glass-card py-2 px-3">
                    {/* 그룹 헤더 */}
                    <div className="flex items-center mb-1.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: getGroupColorHex(group.color) }} />
                      <h3 className="text-sm font-semibold glass-text mr-2">{group.title}</h3>
                      <span className="text-xs glass-text opacity-60 flex-1">
                        {group.tabs.length} {t('modal.tabGroups.tabs')}
                      </span>
                      {/* 버튼 그룹 */}
                      <div className="flex items-center gap-1">
                        {/* 스냅샷 저장 버튼 */}
                        <button
                          onClick={() => handleSaveSnapshot(group.id)}
                          className="glass-button-primary !py-1 !px-2 text-sm hover:scale-110 transition-transform"
                          title={t('modal.tabGroups.takeSnapshot')}
                        >
                          📸
                        </button>
                        {/* Chrome 실제 상태 토글 버튼 */}
                        <button
                          onClick={() => toggleChromeGroup(group.id, group.collapsed)}
                          className="glass-button-primary !py-1 !px-2 text-sm hover:scale-110 transition-transform"
                          title={group.collapsed ? 'Chrome에서 펼치기' : 'Chrome에서 접기'}
                        >
                          {group.collapsed ? '📂' : '📁'}
                        </button>
                        {/* 모달 내부 토글 버튼 */}
                        <button
                          onClick={() => toggleModalGroup(group.id)}
                          className="glass-text opacity-60 hover:opacity-100 transition-opacity py-1 px-1 text-sm"
                        >
                          {modalCollapsedState[group.id] ? '▶' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* 그룹 내 탭들 */}
                    {!modalCollapsedState[group.id] && (
                      <div className="space-y-1 ml-7">
                        {group.tabs.map((tab) => (
                          <div
                            key={tab.id}
                            className="glass-card !p-2 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => tab.id && activateTab(tab.id)}
                          >
                            <div className="flex items-center gap-2">
                              <FavIcon url={tab.favIconUrl || tab.url} size={14} className="flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs glass-text truncate leading-tight">
                                  {tab.title || t('modal.tabAssignment.untitled')}
                                </p>
                              </div>
                              {tab.active && <span className="text-green-500 text-[10px]">●</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="glass-text opacity-70">{t('modal.tabGroups.noGroups')}</p>
                </div>
              )}

              {/* 그룹화되지 않은 탭들 */}
              {ungroupedTabs.length > 0 && (
                <div className="glass-card p-3">
                  <h3 className="font-semibold glass-text mb-2 text-sm">
                    {t('modal.tabGroups.ungrouped')} ({ungroupedTabs.length})
                  </h3>
                  <div className="space-y-1">
                    {ungroupedTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="glass-card !p-2 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => tab.id && activateTab(tab.id)}
                      >
                        <div className="flex items-center gap-2">
                          <FavIcon url={tab.favIconUrl || tab.url} size={14} className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs glass-text truncate leading-tight">{tab.title || t('modal.tabAssignment.untitled')}</p>
                          </div>
                          {tab.active && <span className="text-green-500 text-[10px]">●</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 저장된 스냅샷 목록 */}
              {snapshots.length > 0 ? (
                snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="glass-card p-3">
                    {/* 스냅샷 헤더 */}
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getGroupColorHex(snapshot.color as any) }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold glass-text truncate">{snapshot.name}</h3>
                        <p className="text-[10px] glass-text opacity-50">{new Date(snapshot.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="text-xs glass-text opacity-60">
                        {snapshot.tabs.length} {t('modal.tabGroups.tabs')}
                      </span>
                      {/* 복원 버튼 */}
                      <button
                        onClick={() => handleRestoreSnapshot(snapshot)}
                        className="glass-button-primary !p-1 !px-2 text-xs"
                        title={t('modal.tabGroups.restoreSnapshot')}
                      >
                        ↻
                      </button>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.id)}
                        className="glass-button-primary !p-1 !px-2 text-xs hover:bg-red-500/30"
                        title={t('actions.delete')}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* 스냅샷 탭 목록 */}
                    <div className="space-y-1.5 ml-7">
                      {snapshot.tabs.slice(0, 5).map((tab, index) => (
                        <div key={index} className="glass-card !p-2">
                          <div className="flex items-center gap-2">
                            <FavIcon url={tab.favIconUrl || tab.url} size={16} className="flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm glass-text truncate">{tab.title}</p>
                              <p className="text-[10px] glass-text opacity-50 truncate">{tab.url}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {snapshot.tabs.length > 5 && (
                        <p className="text-xs glass-text opacity-50 ml-2">+{snapshot.tabs.length - 5} more tabs...</p>
                      )}
                    </div>
                  </div>
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

        {/* 하단 도움말 */}
        <div className="px-4 py-4 border-t border-white/20">
          <p className="text-xs glass-text opacity-80">💡 Tip: {t('modal.tabGroups.tip')}</p>
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
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
