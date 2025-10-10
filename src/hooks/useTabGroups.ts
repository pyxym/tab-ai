import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 탭 그룹 정보 타입
 */
export interface TabGroup {
  id: number;
  title: string;
  color: chrome.tabGroups.ColorEnum;
  collapsed: boolean;
  tabs: chrome.tabs.Tab[];
  windowId: number;
}

/**
 * 탭 그룹 관리 커스텀 훅
 * 탭 그룹 로드, 토글 로직을 재사용 가능하게 추출
 */
export const useTabGroups = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [ungroupedTabs, setUngroupedTabs] = useState<chrome.tabs.Tab[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 모든 탭 그룹과 탭 정보 로드
   */
  const loadTabGroups = useCallback(async () => {
    try {
      setLoading(true);

      // 모든 창의 탭 그룹 가져오기
      const tabGroups = await chrome.tabGroups.query({});

      // 모든 탭 가져오기
      const allTabs = await chrome.tabs.query({});

      // 그룹별 탭 매핑
      const groupsWithTabs: TabGroup[] = tabGroups.map((group) => {
        const groupTabs = allTabs.filter((tab) => tab.groupId === group.id);

        return {
          id: group.id,
          title: group.title || t('modal.tabGroups.untitledGroup'),
          color: group.color,
          collapsed: group.collapsed,
          tabs: groupTabs,
          windowId: group.windowId,
        };
      });

      // 현재 창의 그룹화되지 않은 탭들만 표시
      const currentWindow = await chrome.windows.getCurrent();
      const ungrouped = allTabs.filter((tab) => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE && tab.windowId === currentWindow.id);

      setGroups(groupsWithTabs);
      setUngroupedTabs(ungrouped);
    } catch (error) {
      console.error('Failed to load tab groups:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [t]);

  /**
   * Chrome 탭 그룹 상태 토글 (낙관적 업데이트)
   */
  const toggleGroup = useCallback(
    async (groupId: number): Promise<{ success: boolean; error?: Error }> => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) {
        return { success: false, error: new Error('Group not found') };
      }

      // 낙관적 업데이트: UI 즉시 변경
      const newCollapsedState = !group.collapsed;
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: newCollapsedState } : g)));

      try {
        // Chrome API 호출
        await chrome.tabGroups.update(groupId, { collapsed: newCollapsedState });
        return { success: true };
      } catch (error) {
        console.error('Failed to toggle Chrome group:', error);
        // 실패 시 롤백
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: group.collapsed } : g)));
        return { success: false, error: error as Error };
      }
    },
    [groups],
  );

  /**
   * 탭 활성화
   */
  const activateTab = useCallback(async (tabId: number): Promise<{ success: boolean; error?: Error }> => {
    try {
      await chrome.tabs.update(tabId, { active: true });
      return { success: true };
    } catch (error) {
      console.error('Failed to activate tab:', error);
      return { success: false, error: error as Error };
    }
  }, []);

  return {
    groups,
    ungroupedTabs,
    loading,
    loadTabGroups,
    toggleGroup,
    activateTab,
  };
};
