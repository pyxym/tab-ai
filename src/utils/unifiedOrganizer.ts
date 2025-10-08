// Smart Organize와 Apply Grouping 모두에서 사용되는 통합 탭 정리 로직
import { useCategoryStore } from '../store/categoryStore';
import { filterProtectedTabs, getProtectedTabStats, isSystemUrl } from './tabFilters';
import { COLOR_TO_CHROME_GROUP, type Category } from '../types/category';

export async function organizeTabsUnified(categories: Category[]) {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 보호된 탭 필터링 (Meet, Zoom 등)
    const tabs = filterProtectedTabs(allTabs);
    const protectedStats = getProtectedTabStats(allTabs);

    if (protectedStats.count > 0) {
      console.log(
        `[TabQuest] Protected ${protectedStats.count} tabs from organization:`,
        protectedStats.domains
      );
    }

    // 먼저 모든 탭 그룹 해제 (보호되지 않은 탭만)
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // 일부 탭이 이미 그룹 해제됨
      }
    }

    // 카테고리 스토어 인스턴스 가져오기
    const { getCategoryForDomain } = useCategoryStore.getState();

    // 단계 1: 모든 탭 분석 및 분류
    const categorizedTabs = new Map<string, chrome.tabs.Tab[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // 시스템 URL은 건너뜀
      if (isSystemUrl(tab.url)) {
        continue;
      }

      let categoryId = 'uncategorized';

      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        // 스토어의 getCategoryForDomain 사용 (매핑과 카테고리 도메인 모두 확인)
        categoryId = getCategoryForDomain(domain);
      } catch (error) {
        categoryId = 'uncategorized';
      }

      if (!categorizedTabs.has(categoryId)) {
        categorizedTabs.set(categoryId, []);
      }
      categorizedTabs.get(categoryId)!.push(tab);
    }

    // 단계 2: 카테고리 순서대로 탭 재정렬
    // 그룹화하기 전에 탭들이 올바른 순서로 물리적으로 배열되도록 보장
    let currentPosition = 0;
    const reorderedTabIds: number[] = [];

    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (!categoryTabs || categoryTabs.length === 0) continue;

      for (const tab of categoryTabs) {
        if (tab.id) {
          reorderedTabIds.push(tab.id);
        }
      }
    }

    // 모든 탭을 올바른 위치로 이동
    for (let i = 0; i < reorderedTabIds.length; i++) {
      try {
        await chrome.tabs.move(reorderedTabIds[i], { index: i });
      } catch (error) {
        // 탭 이동 실패, 다른 탭 계속 처리
      }
    }

    // 단계 3: 순서대로 그룹 생성 (탭들이 이미 올바른 위치에 있음)
    let groupsCreated = 0;
    let tabsProcessed = 0;

    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (!categoryTabs || categoryTabs.length === 0) continue;

      const tabIds = categoryTabs.map((t) => t.id).filter((id): id is number => id !== undefined);

      try {
        const groupId = await chrome.tabs.group({ tabIds });
        // 카테고리 이름의 약어 생성
        const abbreviation = category.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('')
          .slice(0, 3); // 최대 3글자

        await chrome.tabGroups.update(groupId, {
          title: abbreviation,
          color: COLOR_TO_CHROME_GROUP[category.color],
          collapsed: false,
        });

        groupsCreated++;
        tabsProcessed += tabIds.length;
      } catch (error) {
        // 그룹 생성 실패, 다른 그룹 계속 처리
      }
    }

    // 🆕 메시지에 보호된 탭 정보 추가
    const message =
      groupsCreated > 0
        ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups` +
          (protectedStats.count > 0 ? ` (${protectedStats.count} tabs protected)` : '')
        : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length,
      protectedCount: protectedStats.count, // 🆕 추가 정보
      protectedStats, // 🆕 상세 통계 (meetingCount, systemCount, domains)
    };
  } catch (error) {
    throw error;
  }
}
