# Meet 탭 완전 제외 처리

## 목표

Google Meet 및 기타 화상회의 서비스 탭을 모든 TabQuest 작업에서 완전히 제외하여 충돌 방지

## 현재 문제점

**위치**:
- [src/utils/unifiedOrganizer.ts](../../src/utils/unifiedOrganizer.ts)
- [src/utils/tabTracker.ts](../../src/utils/tabTracker.ts)
- [src/entrypoints/background.ts](../../src/entrypoints/background.ts)

**문제**:
- Meet 탭도 Smart Organize 대상에 포함
- Meet 탭도 사용 시간 추적 대상
- Meet 탭도 분석 대상에 포함
- → 탭 조작 시 WebRTC 연결 중단 가능

## 해결 방안

화상회의 서비스 도메인을 정의하고, 모든 TabQuest 작업에서 해당 탭 필터링

---

## 구현 가이드

### 1. 파일 생성

새 유틸리티 파일 생성: `src/utils/tabFilters.ts`

```typescript
/**
 * Tab filtering utilities
 * Protects critical tabs from TabQuest operations
 */

/**
 * Protected domains that should be excluded from TabQuest operations
 * Includes video conferencing, online editors, and other critical services
 */
export const PROTECTED_DOMAINS = [
  // Video conferencing
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'webex.com',
  'whereby.com',
  'jitsi.org',
  'discord.com',

  // Online editors (optional - uncomment if needed)
  // 'docs.google.com/document',
  // 'docs.google.com/spreadsheets',
  // 'docs.google.com/presentation',
  // 'figma.com',
  // 'miro.com',
];

/**
 * Check if a tab should be protected from TabQuest operations
 * @param tab Chrome tab object
 * @returns true if tab should be protected
 */
export function isProtectedTab(tab: chrome.tabs.Tab): boolean {
  if (!tab.url) return false;

  // Skip system URLs
  if (tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://')) {
    return true;
  }

  try {
    const url = new URL(tab.url);
    const hostname = url.hostname;

    return PROTECTED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Filter out protected tabs from a tab list
 * @param tabs Array of Chrome tabs
 * @returns Filtered array without protected tabs
 */
export function filterProtectedTabs(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] {
  return tabs.filter(tab => !isProtectedTab(tab));
}

/**
 * Get statistics about protected tabs
 * @param tabs Array of Chrome tabs
 * @returns Object with protected tab count and details
 */
export function getProtectedTabStats(tabs: chrome.tabs.Tab[]): {
  count: number;
  tabs: chrome.tabs.Tab[];
  domains: string[];
} {
  const protectedTabs = tabs.filter(tab => isProtectedTab(tab));
  const domains = protectedTabs
    .map(tab => {
      if (!tab.url) return null;
      try {
        return new URL(tab.url).hostname;
      } catch {
        return null;
      }
    })
    .filter((domain): domain is string => domain !== null);

  return {
    count: protectedTabs.length,
    tabs: protectedTabs,
    domains: Array.from(new Set(domains)),
  };
}
```

---

### 2. Tab Tracker 수정

**파일**: `src/utils/tabTracker.ts`

**변경 위치 1**: Import 추가 (파일 상단)
```typescript
import { isProtectedTab } from './tabFilters';
```

**변경 위치 2**: `handleTabChange` 메서드 수정
```typescript
// 기존 코드 (79-98행)
static async handleTabChange(newTabId: number) {
  try {
    await this.stopTracking();
    const tab = await chrome.tabs.get(newTabId);

    // 🆕 보호된 탭 제외
    if (isProtectedTab(tab)) {
      console.log('[TabTracker] Skipping protected tab:', tab.url);
      return;
    }

    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
      this.activeTabId = newTabId;
      this.activeStartTime = Date.now();
      await this.incrementTabAccess(tab);
    }
  } catch (error) {
    // Error handling remains the same
  }
}
```

**변경 위치 3**: `updateTabUsage` 메서드 수정
```typescript
// 기존 코드 (121-192행) - 메서드 시작 부분에 추가
private static async updateTabUsage(tabId: number, timeSpent: number) {
  try {
    const tab = await chrome.tabs.get(tabId);

    // 🆕 보호된 탭 제외
    if (!tab.url || isProtectedTab(tab)) {
      return;
    }

    // 나머지 기존 코드...
    const domain = new URL(tab.url).hostname.replace(/^www\./, '');
    // ...
  } catch (error) {
    console.error('[TabTracker] Error updating tab usage:', error);
  }
}
```

---

### 3. Unified Organizer 수정

**파일**: `src/utils/unifiedOrganizer.ts`

**변경 위치 1**: Import 추가
```typescript
import { filterProtectedTabs, getProtectedTabStats } from './tabFilters';
```

**변경 위치 2**: `organizeTabsUnified` 함수 수정
```typescript
// 기존 코드 (4-117행)
export async function organizeTabsUnified(categories: any[]) {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 보호된 탭 필터링
    const tabs = filterProtectedTabs(allTabs);
    const protectedStats = getProtectedTabStats(allTabs);

    if (protectedStats.count > 0) {
      console.log(
        `[TabQuest] Protected ${protectedStats.count} tabs from organization:`,
        protectedStats.domains
      );
    }

    // 나머지 코드는 tabs 변수 사용 (기존 로직 유지)
    // First, ungroup all tabs
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
    // ...

    // 🆕 메시지에 보호된 탭 정보 추가
    const message = groupsCreated > 0
      ? `Successfully organized ${tabsProcessed} tabs into ${groupsCreated} groups` +
        (protectedStats.count > 0 ? ` (${protectedStats.count} tabs protected)` : '')
      : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length,
      protectedCount: protectedStats.count, // 🆕 추가 정보
    };
  } catch (error) {
    throw error;
  }
}
```

---

### 4. Background Script 수정

**파일**: `src/entrypoints/background.ts`

**변경 위치 1**: Import 추가
```typescript
import { filterProtectedTabs } from '../utils/tabFilters';
```

**변경 위치 2**: `organizeTabsSimple` 함수 수정
```typescript
// 기존 코드 (63-139행)
async function organizeTabsSimple() {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 보호된 탭 필터링
    const tabs = filterProtectedTabs(allTabs);

    // 나머지 코드는 tabs 변수 사용...
  } catch (error) {
    console.error('[TabQuest] Organization failed:', error);
    throw error;
  }
}
```

**변경 위치 3**: `getTabsAnalysis` 함수 수정
```typescript
// 기존 코드 (142-234행)
async function getTabsAnalysis() {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 보호된 탭 필터링
    const tabs = filterProtectedTabs(allTabs);

    // 나머지 분석 로직은 tabs 변수 사용...

    return {
      totalTabs: tabs.length,
      domainCounts,
      categoryCounts,
      duplicates,
    };
  } catch (error) {
    console.error('[TabQuest] Analysis failed:', error);
    throw error;
  }
}
```

**변경 위치 4**: `organizeTabsByCategories` 함수 수정
```typescript
// 기존 코드 (238-337행)
async function organizeTabsByCategories(categories: any[]) {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 보호된 탭 필터링
    const tabs = filterProtectedTabs(allTabs);

    // 나머지 코드는 tabs 변수 사용...
  } catch (error) {
    console.error('[TabQuest] Category organization failed:', error);
    throw error;
  }
}
```

---

### 5. Popup Component 수정 (선택사항)

**파일**: `src/entrypoints/popup-component.tsx`

보호된 탭 정보를 UI에 표시하려면:

**변경 위치**: `loadTabsAndAnalyze` 함수 수정
```typescript
async function loadTabsAndAnalyze() {
  // Load current tabs
  const allTabs = await chrome.tabs.query({});
  const tabs = filterProtectedTabs(allTabs); // 🆕

  setTabs(
    tabs.map((tab) => ({
      id: tab.id!,
      title: tab.title || '',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl,
      lastAccessed: Date.now(),
    })),
  );

  // Get analysis from background
  const response = await chrome.runtime.sendMessage({ action: 'getTabsAnalysis' });
  setAnalysis(response);

  // Calculate and set productivity score
  const score = calculateProductivityScore(tabs); // 🆕 tabs 사용
  setProductivityScore(score);

  // Generate insights based on analysis
  generateInsights(tabs, response); // 🆕 tabs 사용
}
```

---

## 테스트

### 테스트 시나리오 1: Meet 탭 추적 제외
1. Google Meet 회의 시작
2. 다른 탭들 탐색
3. Chrome DevTools Console 확인
4. "[TabTracker] Skipping protected tab" 로그 확인

**예상 결과**:
- Meet 탭 활성화 시 추적 안 됨
- Storage에 meet.google.com 데이터 없음

---

### 테스트 시나리오 2: Smart Organize 제외
1. 10개 일반 탭 + 1개 Meet 탭 열기
2. Smart Organize 실행
3. Console에서 보호 메시지 확인
4. Meet 탭이 그룹에 포함 안 됨 확인

**예상 결과**:
- 9개 탭만 그룹화됨
- Meet 탭은 원래 위치 유지
- 비디오/오디오 끊김 없음

---

### 테스트 시나리오 3: Analysis 제외
1. Meet 탭 + 여러 탭 열기
2. Popup 열어 통계 확인
3. totalTabs 수가 Meet 제외한 수인지 확인

**예상 결과**:
- Meet 탭이 카운트에서 제외됨
- 중복 검사 대상에서 제외됨

---

## 예상 효과

### 정량적 효과
- ✅ Meet 탭 조작: **100% 방지**
- ✅ Meet 추적 부하: **완전 제거**
- ✅ Smart Organize 시 Meet 영향: **0초**

### 정성적 효과
- ✅ Meet 통화 중 안정성 확보
- ✅ 화면 공유 중단 방지
- ✅ WebRTC 연결 유지

---

## 알려진 이슈

### 1. 새로운 화상회의 서비스 추가
**문제**: PROTECTED_DOMAINS 목록이 고정됨
**해결**: 향후 설정 UI에서 사용자가 추가 가능하도록 개선 예정

### 2. 서브도메인 패턴
**문제**: `*.zoom.us` 같은 패턴 모두 차단됨
**해결**: 현재는 의도된 동작. 필요시 더 정교한 패턴 매칭 추가 가능

---

## 관련 문서

- [Smart Tracking](./smart-tracking.md)
- [Safety Checks](./safety-checks.md)
- [Google Meet 충돌 분석](../googlemeet-conflict-analysis.md)
