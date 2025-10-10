// Smart Organize와 Apply Grouping 모두에서 사용되는 통합 탭 정리 로직
import { useCategoryStore } from '../store/categoryStore';
import { COLOR_TO_CHROME_GROUP, type Category } from '../types/category';
import { createAndConfigureGroup, extractDomain, filterValidTabIds, moveTabsBatch, safeUngroup } from './chromeTabHelpers';
import { filterProtectedTabs, getProtectedTabStats, isSystemUrl } from './tabFilters';

interface OrganizeResult {
  success: boolean;
  message: string;
  groupsCreated: number;
  tabsProcessed: number;
  protectedCount: number;
  protectedStats: ReturnType<typeof getProtectedTabStats>;
}

export async function organizeTabsUnified(categories: Category[]): Promise<OrganizeResult> {
  try {
    // 1. 현재 창의 모든 탭 가져오기
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 2. 보호된 탭 필터링 (Meet, Zoom 등)
    const tabs = filterProtectedTabs(allTabs);
    const protectedStats = getProtectedTabStats(allTabs);

    // 3. 시스템 탭과 정리 가능한 탭 분리 (한 번의 순회로 처리)
    const systemTabIds: number[] = [];
    const organizableTabs: chrome.tabs.Tab[] = [];

    for (const tab of tabs) {
      if (!tab.url || isSystemUrl(tab.url)) {
        if (tab.id !== undefined) {
          systemTabIds.push(tab.id);
        }
      } else {
        organizableTabs.push(tab);
      }
    }

    // 4. 모든 탭 그룹 해제 (보호되지 않은 탭만)
    const allTabIds = filterValidTabIds(tabs);
    await safeUngroup(allTabIds);

    // 5. 카테고리별로 탭 분류 (한 번의 순회로 처리)
    const { getCategoryForDomain } = useCategoryStore.getState();
    const categorizedTabs = new Map<string, chrome.tabs.Tab[]>();

    for (const tab of organizableTabs) {
      if (!tab.id || !tab.url) continue;

      const domain = extractDomain(tab.url);
      const categoryId = domain ? getCategoryForDomain(domain) : 'uncategorized';

      // Map 조회 최적화: has + get 대신 단일 get 사용
      const existing = categorizedTabs.get(categoryId);
      if (existing) {
        existing.push(tab);
      } else {
        categorizedTabs.set(categoryId, [tab]);
      }
    }

    // 6. 탭 재정렬을 위한 ID 수집 (이미 검증된 탭이므로 직접 추출)
    const reorderedTabIds: number[] = [];
    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (categoryTabs && categoryTabs.length > 0) {
        // 47-48라인에서 이미 tab.id를 검증했으므로 직접 추출
        reorderedTabIds.push(...categoryTabs.map((t) => t.id!));
      }
    }

    // 7. 병렬로 탭 이동 (성능 개선)
    if (reorderedTabIds.length > 0) {
      await moveTabsBatch(reorderedTabIds, 0);
    }

    // 8. 카테고리별 그룹 생성 (병렬 처리로 성능 개선)
    let groupsCreated = 0;
    let tabsProcessed = 0;

    // Promise.allSettled를 사용하여 병렬 처리하되, 실패해도 계속 진행
    const groupPromises = categories.map(async (category) => {
      const categoryTabs = categorizedTabs.get(category.id);
      if (!categoryTabs || categoryTabs.length === 0) return null;

      // 이미 검증된 탭이므로 직접 추출 (filterValidTabIds 호출 제거)
      const tabIds = categoryTabs.map((t) => t.id!);
      // 🎯 UX 개선: 탭 그룹을 닫힌 상태(collapsed)로 생성하여 깔끔한 정리
      const groupId = await createAndConfigureGroup(tabIds, category.name, COLOR_TO_CHROME_GROUP[category.color], true);

      if (groupId !== null) {
        return { groupsCreated: 1, tabsProcessed: tabIds.length };
      }
      return null;
    });

    const results = await Promise.allSettled(groupPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        groupsCreated += result.value.groupsCreated;
        tabsProcessed += result.value.tabsProcessed;
      }
    }

    // 9. 시스템 탭을 끝으로 이동 (병렬 처리로 성능 개선)
    if (systemTabIds.length > 0) {
      await Promise.all(
        systemTabIds.map((tabId) =>
          chrome.tabs.move(tabId, { index: -1 }).catch(() => {
            // 개별 실패는 무시
          }),
        ),
      );
    }

    // 10. 결과 메시지 생성
    const message =
      groupsCreated > 0
        ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups` +
          (protectedStats.count > 0 ? ` (${protectedStats.count} tabs protected)` : '')
        : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: organizableTabs.length,
      protectedCount: protectedStats.count,
      protectedStats,
    };
  } catch (error) {
    throw error;
  }
}
