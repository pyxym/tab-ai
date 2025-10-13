/**
 * 🚀 Chrome API 성능 최적화 유틸리티
 * - API 호출 배칭 및 캐싱
 * - 불필요한 중복 호출 방지
 * - 메모리 효율적인 캐시 관리
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Chrome API 호출 결과 캐시
 * LRU(Least Recently Used) 방식으로 메모리 관리
 */
class ChromeAPICache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;
  private defaultTTL = 1000; // 1초

  /**
   * 캐시에서 데이터 가져오기
   */
  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 접근한 항목을 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      // 가장 오래된 항목 제거
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 특정 키 패턴의 캐시 무효화
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new ChromeAPICache();

/**
 * 🚀 캐시된 탭 쿼리
 * 같은 쿼리 조건으로 짧은 시간 내에 여러 번 호출되는 경우 캐시된 결과 반환
 */
export async function getCachedTabs(
  queryInfo: chrome.tabs.QueryInfo = {},
  ttl: number = 500
): Promise<chrome.tabs.Tab[]> {
  const cacheKey = `tabs:${JSON.stringify(queryInfo)}`;

  // 캐시 확인
  const cached = apiCache.get<chrome.tabs.Tab[]>(cacheKey, ttl);
  if (cached) {
    return cached;
  }

  // API 호출
  const tabs = await chrome.tabs.query(queryInfo);

  // 캐시 저장
  apiCache.set(cacheKey, tabs);

  return tabs;
}

/**
 * 🚀 배칭된 탭 업데이트
 * 여러 탭을 개별적으로 업데이트하는 대신 배칭하여 성능 향상
 */
export async function batchUpdateTabs(
  updates: Array<{ tabId: number; updateProperties: chrome.tabs.UpdateProperties }>
): Promise<chrome.tabs.Tab[]> {
  // 병렬 처리로 성능 향상
  const results = await Promise.all(
    updates.map(({ tabId, updateProperties }) =>
      chrome.tabs.update(tabId, updateProperties).catch(err => {
        console.error(`[batchUpdateTabs] Failed to update tab ${tabId}:`, err);
        return null;
      })
    )
  );

  // 캐시 무효화
  apiCache.invalidate('tabs:');

  return results.filter((tab): tab is chrome.tabs.Tab => tab !== null);
}

/**
 * 🚀 배칭된 탭 이동
 * 여러 탭을 한 번에 이동하여 API 호출 최소화
 */
export async function batchMoveTabs(
  moves: Array<{ tabIds: number[]; moveProperties: chrome.tabs.MoveProperties }>
): Promise<void> {
  await Promise.all(
    moves.map(({ tabIds, moveProperties }) =>
      chrome.tabs.move(tabIds, moveProperties).catch(err => {
        console.error(`[batchMoveTabs] Failed to move tabs:`, err);
      })
    )
  );

  // 캐시 무효화
  apiCache.invalidate('tabs:');
}

/**
 * 🚀 배칭된 탭 그룹화
 * 여러 탭을 효율적으로 그룹화
 */
export async function batchGroupTabs(
  groups: Array<{ tabIds: number[]; groupId?: number }>
): Promise<number[]> {
  const groupIds = await Promise.all(
    groups.map(({ tabIds, groupId }) =>
      chrome.tabs.group({ tabIds, groupId }).catch(err => {
        console.error(`[batchGroupTabs] Failed to group tabs:`, err);
        return -1;
      })
    )
  );

  // 캐시 무효화
  apiCache.invalidate('tabs:');
  apiCache.invalidate('groups:');

  return groupIds.filter(id => id !== -1);
}

/**
 * 🚀 캐시된 탭 그룹 쿼리
 */
export async function getCachedTabGroups(
  queryInfo: chrome.tabGroups.QueryInfo = {},
  ttl: number = 500
): Promise<chrome.tabGroups.TabGroup[]> {
  const cacheKey = `groups:${JSON.stringify(queryInfo)}`;

  const cached = apiCache.get<chrome.tabGroups.TabGroup[]>(cacheKey, ttl);
  if (cached) {
    return cached;
  }

  const groups = await chrome.tabGroups.query(queryInfo);
  apiCache.set(cacheKey, groups);

  return groups;
}

/**
 * 🚀 Debounced 탭 쿼리
 * 짧은 시간 내에 여러 번 호출되는 경우 마지막 호출만 실행
 */
let tabQueryTimeout: ReturnType<typeof setTimeout> | null = null;

export function debouncedGetTabs(
  queryInfo: chrome.tabs.QueryInfo = {},
  delay: number = 300
): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => {
    if (tabQueryTimeout) {
      clearTimeout(tabQueryTimeout);
    }

    tabQueryTimeout = setTimeout(async () => {
      const tabs = await getCachedTabs(queryInfo);
      resolve(tabs);
    }, delay);
  });
}

/**
 * 탭 변경 이벤트 리스너 등록 시 캐시 무효화
 */
export function setupCacheInvalidation(): void {
  chrome.tabs.onCreated.addListener(() => apiCache.invalidate('tabs:'));
  chrome.tabs.onRemoved.addListener(() => apiCache.invalidate('tabs:'));
  chrome.tabs.onUpdated.addListener(() => apiCache.invalidate('tabs:'));
  chrome.tabs.onMoved.addListener(() => apiCache.invalidate('tabs:'));
  chrome.tabs.onAttached.addListener(() => apiCache.invalidate('tabs:'));
  chrome.tabs.onDetached.addListener(() => apiCache.invalidate('tabs:'));

  if (chrome.tabGroups) {
    chrome.tabGroups.onCreated?.addListener(() => apiCache.invalidate('groups:'));
    chrome.tabGroups.onRemoved?.addListener(() => apiCache.invalidate('groups:'));
    chrome.tabGroups.onUpdated?.addListener(() => apiCache.invalidate('groups:'));
    chrome.tabGroups.onMoved?.addListener(() => apiCache.invalidate('groups:'));
  }
}

/**
 * 캐시 초기화 (테스트 또는 디버깅용)
 */
export function clearAPICache(): void {
  apiCache.clear();
}

/**
 * 🚀 병렬 탭 정보 가져오기
 * 여러 탭의 정보를 병렬로 가져와 성능 향상
 */
export async function getTabsInfo(tabIds: number[]): Promise<chrome.tabs.Tab[]> {
  const results = await Promise.all(
    tabIds.map(tabId =>
      chrome.tabs.get(tabId).catch(err => {
        console.error(`[getTabsInfo] Failed to get tab ${tabId}:`, err);
        return null;
      })
    )
  );

  return results.filter((tab): tab is chrome.tabs.Tab => tab !== null);
}
