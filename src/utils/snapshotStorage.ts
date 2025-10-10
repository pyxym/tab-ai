import { storage } from 'wxt/utils/storage';
import type { SavedTab, TabGroupSnapshot } from '../types/snapshot';
import { SNAPSHOTS_STORAGE_KEY } from '../types/snapshot';

/**
 * 모든 스냅샷 가져오기
 */
export async function getAllSnapshots(): Promise<TabGroupSnapshot[]> {
  const snapshots = await storage.getItem<TabGroupSnapshot[]>(`local:${SNAPSHOTS_STORAGE_KEY}`);
  return snapshots || [];
}

/**
 * 스냅샷 저장하기
 */
export async function saveTabGroupSnapshot(snapshot: TabGroupSnapshot): Promise<void> {
  const snapshots = await getAllSnapshots();
  snapshots.push(snapshot);
  await storage.setItem(`local:${SNAPSHOTS_STORAGE_KEY}`, snapshots);
}

/**
 * 스냅샷 업데이트
 */
export async function updateSnapshot(snapshotId: string, updates: Partial<TabGroupSnapshot>): Promise<void> {
  const snapshots = await getAllSnapshots();
  const index = snapshots.findIndex((s) => s.id === snapshotId);
  if (index !== -1) {
    snapshots[index] = { ...snapshots[index], ...updates, updatedAt: Date.now() };
    await storage.setItem(`local:${SNAPSHOTS_STORAGE_KEY}`, snapshots);
  }
}

/**
 * 스냅샷 삭제
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  const snapshots = await getAllSnapshots();
  const filtered = snapshots.filter((s) => s.id !== snapshotId);
  await storage.setItem(`local:${SNAPSHOTS_STORAGE_KEY}`, filtered);
}

/**
 * 현재 탭 그룹에서 스냅샷 생성
 */
export async function createSnapshotFromGroup(groupId: number, customName?: string): Promise<TabGroupSnapshot | null> {
  try {
    // 탭 그룹 정보 가져오기
    const group = await chrome.tabGroups.get(groupId);
    const tabs = await chrome.tabs.query({ groupId: groupId });

    // 탭 정보 저장
    const savedTabs: SavedTab[] = tabs.map((tab) => ({
      url: tab.url || '',
      title: tab.title || 'Untitled',
      favIconUrl: tab.favIconUrl,
    }));

    const snapshot: TabGroupSnapshot = {
      id: `snapshot-${Date.now()}`,
      name: customName || group.title || 'Untitled Snapshot',
      groupTitle: group.title || 'Untitled Group',
      color: group.color as any, // Chrome의 color를 ExtendedColorEnum으로 사용
      tabs: savedTabs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveTabGroupSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return null;
  }
}

/**
 * 스냅샷에서 탭 그룹 복원
 */
export async function restoreSnapshotAsGroup(snapshot: TabGroupSnapshot): Promise<number | null> {
  try {
    if (snapshot.tabs.length === 0) {
      return null;
    }

    // 첫 번째 탭 생성
    const firstTab = await chrome.tabs.create({
      url: snapshot.tabs[0].url,
      active: false,
    });

    if (!firstTab.id) {
      return null;
    }

    // 탭 그룹 생성
    const groupId = await chrome.tabs.group({
      tabIds: [firstTab.id],
    });

    // 그룹 설정 업데이트
    await chrome.tabGroups.update(groupId, {
      title: snapshot.groupTitle,
      color: snapshot.color as chrome.tabGroups.ColorEnum,
      collapsed: false,
    });

    // 나머지 탭들 생성 및 그룹에 추가
    for (let i = 1; i < snapshot.tabs.length; i++) {
      const tab = await chrome.tabs.create({
        url: snapshot.tabs[i].url,
        active: false,
      });

      if (tab.id) {
        await chrome.tabs.group({
          groupId: groupId,
          tabIds: [tab.id],
        });
      }
    }

    return groupId;
  } catch (error) {
    console.error('Failed to restore snapshot:', error);
    return null;
  }
}
