// Smart Organize와 Apply Grouping 모두에서 사용되는 통합 탭 정리 로직
import { useCategoryStore } from '../store/categoryStore';
import { COLOR_TO_CHROME_GROUP, type Category } from '../types/category';
import { createAndConfigureGroup, extractDomain, filterValidTabIds, moveTabsBatch, safeUngroup } from './chromeTabHelpers';
import { filterProtectedTabs, getProtectedTabStats, isSystemUrl, isNewTabUrl } from './tabFilters';

interface OrganizeResult {
  success: boolean;
  message: string;
  groupsCreated: number;
  tabsProcessed: number;
  protectedCount: number;
  protectedStats: ReturnType<typeof getProtectedTabStats>;
  duplicatesRemoved: number;
  duplicateDetails: Array<{ url: string; count: number }>;
}

export async function organizeTabsUnified(categories: Category[]): Promise<OrganizeResult> {
  try {
    // 1. 현재 창의 모든 탭 가져오기
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 2. 중복 탭 감지 및 제거 (pinned, active 탭 보호)
    const urlMap = new Map<string, chrome.tabs.Tab[]>();
    const duplicateDetails: Array<{ url: string; count: number }> = [];

    for (const tab of allTabs) {
      if (!tab.url) continue;

      // URL 정규화
      let normalizedUrl: string;
      if (isNewTabUrl(tab.url)) {
        normalizedUrl = '__newtab__';
      } else if (isSystemUrl(tab.url)) {
        normalizedUrl = tab.url.replace(/\/$/, '');
      } else {
        normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
      }

      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(tab);
    }

    // 중복 탭 찾기 및 닫기
    const tabsToClose: number[] = [];
    for (const [url, tabGroup] of urlMap) {
      if (tabGroup.length > 1) {
        // 정렬: pinned 우선, active 우선, 그 다음 오래된 탭 우선
        tabGroup.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.active !== b.active) return a.active ? -1 : 1;
          return (a.id || 0) - (b.id || 0);
        });

        // 첫 번째 탭(pinned/active) 제외하고 나머지 닫기
        for (let i = 1; i < tabGroup.length; i++) {
          const tabId = tabGroup[i].id;
          if (tabId !== undefined) {
            tabsToClose.push(tabId);
          }
        }

        // 중복 상세 정보 저장
        if (tabsToClose.length > 0) {
          duplicateDetails.push({
            url: url === '__newtab__' ? 'New Tab' : url,
            count: tabGroup.length - 1,
          });
        }
      }
    }

    // 중복 탭 닫기
    let duplicatesRemoved = 0;
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
      duplicatesRemoved = tabsToClose.length;
    }

    // 3. 보호된 탭 필터링 (Meet, Zoom 등)
    const remainingTabs = await chrome.tabs.query({ currentWindow: true });
    const tabs = filterProtectedTabs(remainingTabs);
    const protectedStats = getProtectedTabStats(remainingTabs);

    // 4. 시스템 탭과 정리 가능한 탭 분리 (한 번의 순회로 처리)
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

    // 5. 모든 탭 그룹 해제 (보호되지 않은 탭만)
    const allTabIds = filterValidTabIds(tabs);
    await safeUngroup(allTabIds);

    // 6. 카테고리별로 탭 분류 (한 번의 순회로 처리)
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

    // 7. 탭 재정렬을 위한 ID 수집 (이미 검증된 탭이므로 직접 추출)
    const reorderedTabIds: number[] = [];
    for (const category of categories) {
      const categoryTabs = categorizedTabs.get(category.id);
      if (categoryTabs && categoryTabs.length > 0) {
        reorderedTabIds.push(...categoryTabs.map((t) => t.id!));
      }
    }

    // 8. 병렬로 탭 이동 (성능 개선)
    if (reorderedTabIds.length > 0) {
      await moveTabsBatch(reorderedTabIds, 0);
    }

    // 9. 카테고리별 그룹 생성 (병렬 처리로 성능 개선)
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

    // 10. 시스템 탭을 끝으로 이동 (병렬 처리로 성능 개선)
    if (systemTabIds.length > 0) {
      await Promise.all(
        systemTabIds.map((tabId) =>
          chrome.tabs.move(tabId, { index: -1 }).catch(() => {
            // 개별 실패는 무시
          }),
        ),
      );
    }

    // 11. 결과 메시지 생성
    const message =
      groupsCreated > 0
        ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups` +
          (protectedStats.count > 0 ? ` (${protectedStats.count} tabs protected)` : '') +
          (duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : '')
        : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: organizableTabs.length,
      protectedCount: protectedStats.count,
      protectedStats,
      duplicatesRemoved,
      duplicateDetails,
    };
  } catch (error) {
    throw error;
  }
}
