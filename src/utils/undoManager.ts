import { TabSnapshot } from '../types/organize';

const UNDO_STORAGE_KEY = 'tabquest_undo_snapshot';

/**
 * 현재 탭 상태의 스냅샷 생성
 */
export async function createSnapshot(): Promise<TabSnapshot> {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const allGroups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });

  const snapshot: TabSnapshot = {
    timestamp: Date.now(),
    tabs: allTabs.map((tab) => ({
      id: tab.id!,
      index: tab.index,
      groupId: tab.groupId ?? -1,
      pinned: tab.pinned,
      url: tab.url || '',
      title: tab.title || '',
    })),
    groups: allGroups.map((group) => ({
      id: group.id,
      title: group.title || '',
      color: group.color,
      collapsed: group.collapsed,
    })),
  };

  return snapshot;
}

/**
 * 스냅샷 저장
 */
export async function saveSnapshot(snapshot: TabSnapshot): Promise<void> {
  await chrome.storage.local.set({ [UNDO_STORAGE_KEY]: snapshot });
  console.log('[UndoManager] 스냅샷 저장됨:', snapshot.timestamp);
}

/**
 * 스냅샷 복원
 */
export async function restoreSnapshot(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(UNDO_STORAGE_KEY);
    const snapshot = result[UNDO_STORAGE_KEY] as TabSnapshot | undefined;

    if (!snapshot) {
      console.log('[UndoManager] 복원할 스냅샷이 없습니다.');
      return false;
    }

    // 현재 그룹 모두 해제
    const currentTabs = await chrome.tabs.query({ currentWindow: true });
    const currentTabIds = currentTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (currentTabIds.length > 0) {
      await chrome.tabs.ungroup(currentTabIds);
    }

    // 탭 순서 복원
    for (const tabSnapshot of snapshot.tabs) {
      const currentTab = currentTabs.find((t) => t.id === tabSnapshot.id);
      if (currentTab && currentTab.index !== tabSnapshot.index) {
        try {
          await chrome.tabs.move(tabSnapshot.id, { index: tabSnapshot.index });
        } catch (error) {
          console.warn('[UndoManager] 탭 이동 실패:', tabSnapshot.id, error);
        }
      }
    }

    // 그룹 재생성 및 탭 할당
    const groupMapping = new Map<number, number>(); // old groupId → new groupId

    for (const groupSnapshot of snapshot.groups) {
      // 이 그룹에 속한 탭들 찾기
      const tabsInGroup = snapshot.tabs.filter((t) => t.groupId === groupSnapshot.id).map((t) => t.id);

      if (tabsInGroup.length > 0) {
        try {
          // 그룹 생성
          const newGroupId = await chrome.tabs.group({ tabIds: tabsInGroup });
          groupMapping.set(groupSnapshot.id, newGroupId);

          // 그룹 속성 설정
          await chrome.tabGroups.update(newGroupId, {
            title: groupSnapshot.title,
            color: groupSnapshot.color,
            collapsed: groupSnapshot.collapsed,
          });
        } catch (error) {
          console.warn('[UndoManager] 그룹 생성 실패:', groupSnapshot.id, error);
        }
      }
    }

    // 고정 탭 복원
    for (const tabSnapshot of snapshot.tabs) {
      const currentTab = currentTabs.find((t) => t.id === tabSnapshot.id);
      if (currentTab && currentTab.pinned !== tabSnapshot.pinned) {
        try {
          await chrome.tabs.update(tabSnapshot.id, { pinned: tabSnapshot.pinned });
        } catch (error) {
          console.warn('[UndoManager] 탭 고정 상태 복원 실패:', tabSnapshot.id, error);
        }
      }
    }

    console.log('[UndoManager] 스냅샷 복원 완료');
    return true;
  } catch (error) {
    console.error('[UndoManager] 스냅샷 복원 실패:', error);
    return false;
  }
}

/**
 * 저장된 스냅샷이 있는지 확인
 */
export async function hasSnapshot(): Promise<boolean> {
  const result = await chrome.storage.local.get(UNDO_STORAGE_KEY);
  return !!result[UNDO_STORAGE_KEY];
}

/**
 * 스냅샷 삭제
 */
export async function clearSnapshot(): Promise<void> {
  await chrome.storage.local.remove(UNDO_STORAGE_KEY);
  console.log('[UndoManager] 스냅샷 삭제됨');
}
