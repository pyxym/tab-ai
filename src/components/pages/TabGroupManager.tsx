import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from 'wxt/utils/storage';
import { useConfirmModal } from '../../hooks/useConfirmModal';
import { useTabGroups } from '../../hooks/useTabGroups';
import { useCategoryStore } from '../../store/categoryStore';
import type { TabGroupSnapshot } from '../../types/snapshot';
import { SNAPSHOTS_STORAGE_KEY } from '../../types/snapshot';
import { getColorHex } from '../../utils/colorUtils';
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

  // Category store for assigning uncategorized
  const assignDomainToCategory = useCategoryStore((state) => state.assignDomainToCategory);

  const [activeTab, setActiveTab] = useState<'current' | 'saved'>('current');
  const [snapshots, setSnapshots] = useState<TabGroupSnapshot[]>([]);
  // 스냅샷 전용 collapse 상태 관리
  const [snapshotCollapsedState, setSnapshotCollapsedState] = useState<Record<string, boolean>>({});
  // 🚀 그룹화되지 않은 탭 접기/펼치기 상태
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  // Export 모달 상태
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());

  // Debug: Log component state
  useEffect(() => {
    console.log('[TabGroupManager] 🔧 Component rendered - activeTab:', activeTab, 'snapshots:', snapshots.length);
  });

  // 초기 마운트 시에만 로드
  useEffect(() => {
    console.log('[TabGroupManager] 🔧 Component mounted, loading data...');
    loadTabGroups();
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 저장된 스냅샷 로드
   */
  const loadSnapshots = async () => {
    console.log('[loadSnapshots] 🔄 Loading snapshots from storage...');
    const savedSnapshots = await getAllSnapshots();
    console.log('[loadSnapshots] 🔄 Loaded snapshots:', savedSnapshots.length, 'items');
    console.log('[loadSnapshots] 🔄 Snapshot details:', savedSnapshots);
    setSnapshots(savedSnapshots);
    console.log('[loadSnapshots] 🔄 State updated with', savedSnapshots.length, 'snapshots');
  };

  /**
   * Export current tab groups (show selection modal)
   */
  const handleExportCurrentGroups = useCallback(() => {
    if (groups.length === 0) {
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.noGroupsToExport'),
        variant: 'error',
      });
      return;
    }

    // 모달 열기 전 모든 그룹 선택
    setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    setShowExportModal(true);
  }, [groups, showModal, t]);

  /**
   * Export selected groups
   */
  const confirmExportSelectedGroups = async () => {
    setShowExportModal(false);

    if (selectedGroupIds.size === 0) {
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.noGroupsSelected'),
        variant: 'error',
      });
      return;
    }

    try {
      const selectedGroups = groups.filter((g) => selectedGroupIds.has(g.id));

      // Convert to snapshot format
      const snapshots = selectedGroups.map((group) => ({
        id: `export-${Date.now()}-${group.id}`,
        name: group.title,
        color: group.color,
        createdAt: Date.now(),
        tabs: group.tabs.map((tab) => ({
          url: tab.url || '',
          title: tab.title || '',
          favIconUrl: tab.favIconUrl,
        })),
      }));

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        snapshotCount: snapshots.length,
        snapshots: snapshots,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tabquest-groups-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showModal({
        title: t('messages.success'),
        message: t('modal.tabGroups.exportSuccess', { count: snapshots.length }),
        variant: 'success',
      });
    } catch (error) {
      console.error('Export selected groups failed:', error);
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.exportError'),
        variant: 'error',
      });
    }
  };

  /**
   * Toggle group selection for export
   */
  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  /**
   * Toggle all groups selection
   */
  const toggleAllGroups = () => {
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    }
  };

  /**
   * Import snapshots from JSON file
   */
  const handleImportSnapshots = useCallback(() => {
    console.log('[Import] 🔵 handleImportSnapshots button clicked!');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    console.log('[Import] 🔵 File input created, waiting for user to select file...');
    input.onchange = async (e: Event) => {
      console.log('[Import] 🔵 File input onchange triggered!');
      const file = (e.target as HTMLInputElement).files?.[0];
      console.log('[Import] 🔵 Selected file:', file?.name, file?.size, 'bytes');
      if (!file) {
        console.log('[Import] ❌ No file selected, aborting');
        return;
      }

      try {
        console.log('[Import] 🔵 Reading file contents...');
        const text = await file.text();
        console.log('[Import] 🔵 File text length:', text.length);
        console.log('[Import] 🔵 File contents:', text.substring(0, 200));

        console.log('[Import] 🔵 Parsing JSON...');
        const importData = JSON.parse(text);
        console.log('[Import] 🔵 Parsed import data:', importData);

        // Validate import data structure
        console.log('[Import] 🔵 Validating import data structure...');
        if (!importData.snapshots || !Array.isArray(importData.snapshots)) {
          console.log('[Import] ❌ Invalid file format - no snapshots array');
          throw new Error('Invalid file format');
        }

        // Validate each snapshot has required fields
        console.log('[Import] 🔵 Validating each snapshot...');
        const validSnapshots = importData.snapshots.filter((snapshot: any) => {
          const isValid =
            snapshot.id &&
            snapshot.name &&
            snapshot.color &&
            snapshot.createdAt &&
            Array.isArray(snapshot.tabs) &&
            snapshot.tabs.every((tab: any) => tab.url && tab.title);
          console.log(`[Import] 🔵 Snapshot "${snapshot?.name}" valid:`, isValid);
          return isValid;
        });

        console.log('[Import] 🔵 Valid snapshots count:', validSnapshots.length);

        if (validSnapshots.length === 0) {
          console.log('[Import] ❌ No valid snapshots found');
          throw new Error('No valid snapshots found');
        }

        // Show confirmation modal
        console.log('[Import] 🔵 Showing confirmation modal...');
        showModal({
          title: t('actions.confirm'),
          message: t('modal.tabGroups.importConfirm', {
            count: validSnapshots.length,
            total: importData.snapshots.length,
          }),
          variant: 'info',
          onConfirm: () => confirmImport(validSnapshots),
        });
      } catch (error) {
        console.error('[Import] ❌ Import failed with error:', error);
        showModal({
          title: t('messages.error'),
          message: t('modal.tabGroups.importError'),
          variant: 'error',
        });
      }
    };
    console.log('[Import] 🔵 Triggering file input click...');
    input.click();
    console.log('[Import] 🔵 File input clicked, waiting for user selection...');
  }, [showModal, t]);

  /**
   * Confirm and execute import
   */
  const confirmImport = async (importedSnapshots: TabGroupSnapshot[]) => {
    console.log('[Import] 🟢 confirmImport called with', importedSnapshots.length, 'snapshots');
    console.log('[Import] 🟢 Closing modal...');
    closeModal();

    try {
      console.log('[Import] 🟢 Starting import with snapshots:', importedSnapshots);

      // Get existing snapshots
      const existingSnapshots = await getAllSnapshots();
      console.log('[Import] Existing snapshots:', existingSnapshots);

      // 각 스냅샷에 새로운 ID를 부여하여 중복 방지 (이름+탭수로 중복 체크)
      const existingSignatures = new Set(existingSnapshots.map((s) => `${s.name}-${s.tabs.length}`));
      console.log('[Import] Existing signatures:', Array.from(existingSignatures));

      const newSnapshots = importedSnapshots
        .filter((s) => {
          const signature = `${s.name}-${s.tabs.length}`;
          const isDuplicate = existingSignatures.has(signature);
          console.log(`[Import] Checking "${s.name}": signature="${signature}", isDuplicate=${isDuplicate}`);
          return !isDuplicate;
        })
        .map((s) => ({
          ...s,
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
        }));

      console.log('[Import] New snapshots after filtering:', newSnapshots);

      if (newSnapshots.length === 0) {
        console.log('[Import] No new snapshots to import (all duplicates)');
        showModal({
          title: t('messages.error'),
          message: t('modal.tabGroups.importDuplicates'),
          variant: 'error',
        });
        return;
      }

      // Save all snapshots using WXT storage
      const allSnapshots = [...existingSnapshots, ...newSnapshots];
      console.log('[Import] Saving all snapshots:', allSnapshots);
      await storage.setItem(`local:${SNAPSHOTS_STORAGE_KEY}`, allSnapshots);

      // Verify save
      const savedSnapshots = await storage.getItem<TabGroupSnapshot[]>(`local:${SNAPSHOTS_STORAGE_KEY}`);
      console.log('[Import] Verified saved snapshots:', savedSnapshots);

      // Reload
      await loadSnapshots();
      console.log('[Import] Reloaded snapshots state');

      showModal({
        title: t('messages.success'),
        message: t('modal.tabGroups.importSuccess', { count: newSnapshots.length }),
        variant: 'success',
      });
    } catch (error) {
      console.error('[Import] Import execution failed:', error);
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.importError'),
        variant: 'error',
      });
    }
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
   * Export individual group
   */
  const handleExportGroup = async (groupId: number) => {
    // 그룹 정보 가져오기
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    // 확인 모달 표시
    showModal({
      title: t('actions.confirm'),
      message: t('modal.tabGroups.exportGroupConfirm', {
        groupTitle: group.title,
        tabCount: group.tabs.length,
      }),
      variant: 'info',
      onConfirm: () => confirmExportGroup(groupId),
    });
  };

  /**
   * Confirm and execute group export
   */
  const confirmExportGroup = async (groupId: number) => {
    closeModal();

    try {
      // 그룹 정보 가져오기
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // 스냅샷 형식으로 변환
      const snapshot = {
        id: `export-${Date.now()}-${groupId}`,
        name: group.title,
        color: group.color,
        createdAt: Date.now(),
        tabs: group.tabs.map((tab) => ({
          url: tab.url || '',
          title: tab.title || '',
          favIconUrl: tab.favIconUrl,
        })),
      };

      // Export data with metadata
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        snapshotCount: 1,
        snapshots: [snapshot],
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${group.title.replace(/[^a-zA-Z0-9가-힣]/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showModal({
        title: t('messages.success'),
        message: t('modal.tabGroups.exportGroupSuccess', { groupTitle: group.title }),
        variant: 'success',
      });
    } catch (error) {
      console.error('Export group failed:', error);
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.exportError'),
        variant: 'error',
      });
    }
  };

  /**
   * Handle export button click
   */
  const handleExportClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const target = event.currentTarget;
      const groupId = target.getAttribute('data-group-id');
      if (groupId) {
        handleExportGroup(parseInt(groupId, 10));
      }
    },
    [groups, showModal, closeModal, t],
  );

  /**
   * 탭 그룹 삭제
   */
  const handleDeleteGroup = async (groupId: number) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    showModal({
      title: t('actions.confirm'),
      message: t('modal.tabGroups.deleteGroupConfirm', {
        groupTitle: group.title,
        tabCount: group.tabs.length,
      }),
      variant: 'warning',
      onConfirm: () => confirmDeleteGroup(groupId),
    });
  };

  const confirmDeleteGroup = async (groupId: number) => {
    closeModal();

    try {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // 그룹 해제 전에 각 탭의 도메인을 추출
      const domains = new Set<string>();
      for (const tab of group.tabs) {
        if (tab.url) {
          try {
            const url = new URL(tab.url);
            const domain = url.hostname.replace(/^www\./, '');
            domains.add(domain);
          } catch (e) {
            // Invalid URL, skip
          }
        }
      }

      // 그룹 해제 (탭들은 유지) - chrome.tabs.ungroup 사용
      const tabIds = group.tabs.map((tab) => tab.id!).filter((id) => id !== undefined);
      if (tabIds.length > 0) {
        await chrome.tabs.ungroup(tabIds);
      }

      // 모든 도메인을 Uncategorized로 할당
      for (const domain of domains) {
        try {
          await assignDomainToCategory(domain, 'uncategorized');
        } catch (e) {
          console.error('Failed to assign domain to uncategorized:', domain, e);
        }
      }

      // 그룹 목록 새로고침
      await loadTabGroups();

      showModal({
        title: t('messages.success'),
        message: t('modal.tabGroups.deleteGroupSuccess', { groupTitle: group.title }),
        variant: 'success',
      });
    } catch (error) {
      console.error('Delete group failed:', error);
      showModal({
        title: t('messages.error'),
        message: t('modal.tabGroups.deleteGroupError'),
        variant: 'error',
      });
    }
  };

  /**
   * Handle delete group button click
   */
  const handleDeleteGroupClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const target = event.currentTarget;
      const groupId = target.getAttribute('data-group-id');
      if (groupId) {
        handleDeleteGroup(parseInt(groupId, 10));
      }
    },
    [groups, showModal, closeModal, t],
  );

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

            {/* Export/Import 버튼 + Close 버튼 */}
            <div className="flex items-center gap-1.5">
              {/* Export 버튼 */}
              <button
                onClick={handleExportCurrentGroups}
                disabled={groups.length === 0}
                className="glass-button-primary !p-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-all"
                title={t('modal.tabGroups.exportCurrentGroupsTooltip')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>

              {/* Import 버튼 */}
              <button
                onClick={handleImportSnapshots}
                className="glass-button-primary !p-1.5 hover:bg-purple-500/20 transition-all"
                title={t('modal.tabGroups.importTooltip')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </button>

              {/* 구분선 */}
              <div className="w-px h-4 bg-white/20"></div>

              {/* Close 버튼 */}
              <button onClick={onClose} className="glass-button-primary !p-1.5 !px-2.5">
                ✕
              </button>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                console.log('[TabGroupManager] 🔧 Switching to "current" tab');
                setActiveTab('current');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'current'
                  ? 'bg-purple-500/40 glass-text shadow-lg ring-2 ring-purple-400/50'
                  : 'glass-card glass-text opacity-50 hover:opacity-80'
              }`}
            >
              {t('modal.tabGroups.currentTabs')}
            </button>
            <button
              onClick={() => {
                console.log('[TabGroupManager] 🔧 Switching to "saved" tab');
                setActiveTab('saved');
              }}
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
                    onExportClick={handleExportClick}
                    onDeleteClick={handleDeleteGroupClick}
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
                    <div className="px-2 pb-1 pt-0.5 space-y-0.5 relative ml-2">
                      {/* 🎨 개선된 트리 라인 - 더 진하고 선명하게 */}
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-400/60 via-gray-400/40 to-gray-400/20"></div>

                      {ungroupedTabs.map((tab) => (
                        <div
                          key={tab.id}
                          data-tab-id={tab.id}
                          onClick={handleTabClick}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-purple-500/10 transition-all cursor-pointer group ml-2 relative"
                        >
                          {/* 🎨 개별 탭 연결선 - 더 선명하게 */}
                          <div className="absolute left-[-8px] top-1/2 w-2 h-[1px] bg-gray-400/50"></div>
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

      {/* Export 그룹 선택 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="glass-main rounded-xl p-6 max-w-md w-full max-h-[70vh] flex flex-col">
            <h3 className="text-lg font-semibold glass-text mb-4">{t('modal.tabGroups.selectGroupsToExport')}</h3>

            {/* 전체 선택 체크박스 */}
            <label className="flex items-center gap-2 mb-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={selectedGroupIds.size === groups.length && groups.length > 0}
                onChange={toggleAllGroups}
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-sm glass-text font-medium">{t('modal.tabGroups.selectAll')}</span>
              <span className="text-xs glass-text opacity-60">({groups.length})</span>
            </label>

            {/* 그룹 리스트 - 스크롤 가능 영역 */}
            <div className="flex-1 overflow-y-auto space-y-1.5 mb-4 min-h-0">
              {groups.map((group) => (
                <label key={group.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.has(group.id)}
                    onChange={() => toggleGroupSelection(group.id)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: getColorHex(group.color) }} />
                  <span className="text-sm glass-text flex-1 truncate">{group.title}</span>
                  <span className="text-xs glass-text opacity-60">{group.tabs.length} tabs</span>
                </label>
              ))}
            </div>

            {/* 버튼들 - 하단 고정 */}
            <div className="flex gap-2 flex-shrink-0 pt-2">
              <button onClick={() => setShowExportModal(false)} className="flex-1 glass-button-secondary py-2 text-sm">
                {t('actions.cancel')}
              </button>
              <button
                onClick={confirmExportSelectedGroups}
                disabled={selectedGroupIds.size === 0}
                className="flex-1 glass-button-primary py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('modal.tabGroups.exportSelected', { count: selectedGroupIds.size })}
              </button>
            </div>
          </div>
        </div>
      )}

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
