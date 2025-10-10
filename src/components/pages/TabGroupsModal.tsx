import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categorySelectors, useCategoryStore } from '../../store/categoryStore';
import { COLOR_TO_CHROME_GROUP } from '../../types/category';
import type { TabGroupSnapshot } from '../../types/snapshot';
import { createSnapshotFromGroup, deleteSnapshot, getAllSnapshots, restoreSnapshotAsGroup } from '../../utils/snapshotStorage';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FavIcon } from '../ui/FavIcon';
import { InfoTooltip } from '../ui/InfoTooltip';

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

  // 최적화된 선택자 사용 - 카테고리 데이터만 구독
  const categories = useCategoryStore(categorySelectors.categories);
  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [ungroupedTabs, setUngroupedTabs] = useState<chrome.tabs.Tab[]>([]);
  const [snapshots, setSnapshots] = useState<TabGroupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  // 모달 내에서의 collapse 상태 관리 (groupId or snapshotId -> boolean)
  const [modalCollapsedState, setModalCollapsedState] = useState<Record<string | number, boolean>>({});

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

      // 모달 내 초기 상태: 브라우저 그룹 상태와 동기화
      const initialCollapsedState: Record<string | number, boolean> = {};
      groupsWithTabs.forEach((group) => {
        initialCollapsedState[group.id] = group.collapsed; // 브라우저 그룹 상태 반영
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
   * 현재 탭 그룹의 경우 Chrome 브라우저 그룹 상태도 함께 변경
   */
  const toggleModalGroup = async (groupId: string | number) => {
    // 현재 탭 그룹인 경우 (숫자 ID)
    if (typeof groupId === 'number') {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        // Chrome 브라우저 그룹 상태 토글
        await toggleChromeGroup(groupId, group.collapsed);
        return;
      }
    }

    // 저장된 스냅샷의 경우 모달 상태만 변경
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-3xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-3 py-2 border-b border-white/20">
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
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="glass-text opacity-70">{t('actions.loading')}</p>
            </div>
          ) : activeTab === 'current' ? (
            <div className="space-y-1.5">
              {/* 현재 탭 그룹들 */}
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.id} className="glass-card overflow-hidden">
                    {/* 그룹 헤더 - 클릭 가능 */}
                    <div
                      onClick={() => toggleModalGroup(group.id)}
                      className="flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all group border-b border-white/5"
                    >
                      {/* 아코디언 - 브라우저 그룹 상태와 연동 */}
                      <button
                        className="text-white/60 hover:text-white transition-colors mr-2 group-hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModalGroup(group.id);
                        }}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${group.collapsed ? '' : 'rotate-90'}`}
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
                        style={{ backgroundColor: getGroupColorHex(group.color) }}
                      />

                      {/* 제목과 카운트 - 한 줄로 */}
                      <div className="flex-1 min-w-0 mr-2 flex items-baseline gap-1">
                        <h3 className="text-xs font-medium glass-text truncate leading-tight">{group.title}</h3>
                        <span className="text-[10px] glass-text opacity-40 flex-shrink-0">
                          {group.tabs.length} {t('modal.tabGroups.tabs')}
                        </span>
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveSnapshot(group.id);
                          }}
                          className="p-1 rounded text-white/60 hover:text-white hover:bg-purple-500/20 transition-all"
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChromeGroup(group.id, group.collapsed);
                          }}
                          className="p-1 rounded text-white/60 hover:text-white hover:bg-blue-500/20 transition-all"
                          title={group.collapsed ? 'Chrome에서 펼치기' : 'Chrome에서 접기'}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {group.collapsed ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* 그룹 내 탭들 - 브라우저 그룹 상태에 따라 표시 */}
                    {!group.collapsed && (
                      <div className="px-2 pb-1 pt-0.5 space-y-0.5 border-l-2 border-white/5 ml-2">
                        {group.tabs.map((tab) => (
                          <div
                            key={tab.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 hover:border-l-2 hover:border-purple-400/50 transition-all cursor-pointer group ml-2"
                            onClick={() => tab.id && activateTab(tab.id)}
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
                ))
              ) : (
                <div className="glass-card p-6 text-center">
                  <p className="glass-text opacity-70">{t('modal.tabGroups.noGroups')}</p>
                </div>
              )}

              {/* 그룹화되지 않은 탭들 */}
              {ungroupedTabs.length > 0 && (
                <div className="glass-card px-2.5 py-1.5">
                  <div className="flex items-center mb-0.5">
                    <h3 className="text-xs font-medium glass-text flex-1 leading-tight">{t('modal.tabGroups.ungrouped')}</h3>
                    <span className="text-[10px] glass-text opacity-40">
                      {ungroupedTabs.length} {t('modal.tabGroups.tabs')}
                    </span>
                  </div>
                  <div className="space-y-0.5 ml-5">
                    {ungroupedTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="glass-card !p-1 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => tab.id && activateTab(tab.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          <FavIcon url={tab.favIconUrl || tab.url} size={10} className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] glass-text truncate leading-tight">
                              {tab.title || t('modal.tabCategoryOrganizer.untitled')}
                            </p>
                          </div>
                          {tab.active && <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0 animate-pulse"></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* 저장된 스냅샷 목록 */}
              {snapshots.length > 0 ? (
                snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="glass-card overflow-hidden">
                    {/* 스냅샷 헤더 - 클릭 가능 */}
                    <div
                      onClick={() => toggleModalGroup(snapshot.id)}
                      className="flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-transparent transition-all group border-b border-white/5"
                    >
                      {/* 아코디언 화살표 */}
                      <button
                        className="text-white/60 hover:text-white transition-colors mr-2 group-hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModalGroup(snapshot.id);
                        }}
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${modalCollapsedState[snapshot.id] ? '' : 'rotate-90'}`}
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
                        style={{ backgroundColor: getGroupColorHex(snapshot.color as any) }}
                      />

                      {/* 제목과 카운트 - 한 줄로 */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreSnapshot(snapshot);
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSnapshot(snapshot.id);
                          }}
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
                    {!modalCollapsedState[snapshot.id] && (
                      <div className="px-2 pb-1 pt-0.5 space-y-0.5 border-l-2 border-white/5 ml-2">
                        {snapshot.tabs.slice(0, 5).map((tab, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 hover:border-l-2 hover:border-purple-400/50 transition-all group ml-2"
                          >
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
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
