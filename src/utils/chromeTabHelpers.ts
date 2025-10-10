/**
 * Chrome Tab API Helper Functions
 * 재사용 가능한 Chrome 탭 관련 유틸리티 함수들
 */

/**
 * 탭 ID 필터링 헬퍼
 */
export function filterValidTabIds(tabs: chrome.tabs.Tab[]): number[] {
  return tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
}

/**
 * 병렬로 여러 탭 이동 (성능 최적화)
 * Chrome API는 배열을 지원하므로 단일 호출로 처리
 */
export async function moveTabsBatch(tabIds: number[], startIndex: number): Promise<void> {
  if (tabIds.length === 0) return;

  try {
    // Chrome API는 tabId 배열을 지원 - N개 호출을 1개로 감소
    await chrome.tabs.move(tabIds, { index: startIndex });
  } catch (error) {
    // 실패 시 개별 처리로 폴백 (호환성)
    await Promise.all(
      tabIds.map((tabId, offset) =>
        chrome.tabs.move(tabId, { index: startIndex + offset }).catch(() => {
          // 개별 실패는 무시하고 계속 진행
        }),
      ),
    );
  }
}

/**
 * 안전한 탭 그룹 해제
 */
export async function safeUngroup(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return;

  try {
    await chrome.tabs.ungroup(tabIds);
  } catch (e) {
    // 이미 그룹 해제된 탭이 있을 수 있음 - 에러 무시
  }
}

/**
 * 탭 그룹 생성 및 설정
 */
export async function createAndConfigureGroup(
  tabIds: number[],
  title: string,
  color: chrome.tabGroups.ColorEnum,
  collapsed: boolean = false,
): Promise<number | null> {
  if (tabIds.length === 0) return null;

  try {
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title,
      color,
      collapsed,
    });
    return groupId;
  } catch (error) {
    console.error(`Failed to create group "${title}":`, error);
    return null;
  }
}

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
