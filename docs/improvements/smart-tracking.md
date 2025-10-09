# Smart Tracking (스마트 추적)

## 목표

탭 추적 로직을 최적화하여 Storage I/O를 97% 감소시키고, 불필요한 백그라운드 작업을 제거하여 성능을 개선합니다.

## 현재 문제점

**위치**: [src/utils/tabTracker.ts](../../src/utils/tabTracker.ts)

**문제**:
1. **과도한 Storage Write**: 6초마다 무조건 Storage에 기록 (Line 61)
   - 비활성 탭도 추적 → 불필요한 I/O
   - 변경사항 없어도 저장 → 중복 I/O
   - Storage 한도 초과 위험

2. **의미 없는 데이터 수집**: 0.1분(6초) 단위 업데이트는 의미 없음
   - 사용자에게 의미 있는 최소 단위: 30초
   - 6초 미만 데이터는 노이즈

3. **비효율적 알람**: chrome.alarms API 오용
   - 6초마다 알람 발생 → 불필요한 Service Worker 활성화
   - 배터리 소모 증가

## 해결 방안

### 1. 임계값 기반 저장 (Threshold-based Save)
- 최소 30초 이상 활성화된 탭만 저장
- 의미 있는 데이터만 수집

### 2. Debounced 저장 (지연 저장)
- 탭 변경 시 즉시 저장하지 않고 대기
- 짧은 시간 내 여러 번 변경 시 한 번만 저장

### 3. Lazy 저장 (게으른 저장)
- 탭이 충분히 오래 활성화된 경우에만 저장
- 빠른 탭 전환은 무시

---

## 구현 가이드

### 1. configs.ts 수정

**파일**: `src/utils/configs.ts`

**변경 위치**: TAB_TRACKING_CONFIG 수정 (42-49행)
```typescript
/**
 * 탭 사용 추적 설정
 */
export const TAB_TRACKING_CONFIG = {
  /** 활성 탭으로 간주할 최소 시간 (밀리초) */
  MIN_ACTIVE_TIME: 30000, // 🆕 1초 → 30초로 증가

  /** 추적 데이터 정리 주기 (일) */
  CLEANUP_DAYS: 30,

  /** 통계 업데이트 간격 (밀리초) */
  STATS_UPDATE_INTERVAL: 60000, // 1분 유지 (실제로는 사용 안 함)

  /** 🆕 Debounce 대기 시간 (밀리초) */
  DEBOUNCE_DELAY: 3000, // 3초

  /** 🆕 알람 주기 (분) - chrome.alarms API용 */
  ALARM_PERIOD_MINUTES: 1, // 1분
} as const;
```

---

### 2. tabTracker.ts 수정

**파일**: `src/utils/tabTracker.ts`

#### 변경 위치 1: Import 추가 및 상수 정의 (상단)
```typescript
import { storageUtils } from './storage';
import { isProtectedTab, isSystemUrl } from './tabFilters';
import { TAB_TRACKING_CONFIG } from './configs'; // 🆕 추가

// ... 기존 interface 정의 ...

export class TabTracker {
  private static activeTabId: number | null = null;
  private static activeStartTime: number | null = null;
  private static updateInterval: NodeJS.Timeout | null = null;

  // 🆕 추가: Debounce를 위한 타이머
  private static saveTimer: NodeJS.Timeout | null = null;

  // 🆕 추가: 마지막 저장 시간 추적
  private static lastSaveTime: number = 0;
```

#### 변경 위치 2: initialize 메서드 수정 (32-78행)
```typescript
// 추적 초기화
static async initialize() {
  try {
    // 탭 활성화 추적
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      await this.handleTabChange(activeInfo.tabId);
    });

    // 탭 업데이트 추적 (URL 변경)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url && tabId === this.activeTabId) {
        await this.handleTabChange(tabId);
      }
    });

    // 창 포커스 변경 추적
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // 브라우저 포커스 잃음
        await this.stopTracking();
      } else {
        // 브라우저 포커스 획득, 활성 탭 추적 재개
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await this.handleTabChange(activeTab.id);
        }
      }
    });

    // 🆕 변경: 알람 주기 증가 (6초 → 1분)
    chrome.alarms.create('tabTrackerUpdate', {
      periodInMinutes: TAB_TRACKING_CONFIG.ALARM_PERIOD_MINUTES,
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'tabTrackerUpdate') {
        this.updateActiveTabTime();
      }
    });

    // 초기화 시 현재 활성 탭 추적
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await this.handleTabChange(activeTab.id);
    }
  } catch (error) {
    console.error('[TabTracker] 초기화 오류:', error);
    throw error;
  }
}
```

#### 변경 위치 3: stopTracking 메서드 수정 (106-114행)
```typescript
// 현재 탭 추적 중지
static async stopTracking() {
  // 🆕 추가: Debounce 타이머 취소
  if (this.saveTimer) {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  if (this.activeTabId && this.activeStartTime) {
    const timeSpent = Date.now() - this.activeStartTime;

    // 🆕 변경: 임계값 체크 - 30초 이상만 저장
    if (timeSpent >= TAB_TRACKING_CONFIG.MIN_ACTIVE_TIME) {
      await this.updateTabUsage(this.activeTabId, timeSpent);
    } else {
      console.log(
        `[TabTracker] 짧은 활성화 시간 무시: ${Math.round(timeSpent / 1000)}초 (최소: ${TAB_TRACKING_CONFIG.MIN_ACTIVE_TIME / 1000}초)`
      );
    }
  }

  this.activeTabId = null;
  this.activeStartTime = null;
}
```

#### 변경 위치 4: updateActiveTabTime 메서드 수정 (117-123행)
```typescript
// 활성 탭 시간 업데이트
static async updateActiveTabTime() {
  if (this.activeTabId && this.activeStartTime) {
    const timeSpent = Date.now() - this.activeStartTime;

    // 🆕 변경: 임계값 체크 - 30초 이상만 업데이트
    if (timeSpent >= TAB_TRACKING_CONFIG.MIN_ACTIVE_TIME) {
      // 🆕 추가: Debounced 저장 사용
      this.debouncedSave(this.activeTabId, timeSpent);
    }
  }
}
```

#### 변경 위치 5: 새로운 메서드 추가 (updateActiveTabTime 다음)
```typescript
/**
 * 🆕 새로운 메서드: Debounced 저장
 * 짧은 시간 내 여러 번 저장 요청 시 한 번만 저장
 */
private static debouncedSave(tabId: number, timeSpent: number) {
  // 기존 타이머 취소
  if (this.saveTimer) {
    clearTimeout(this.saveTimer);
  }

  // 새 타이머 설정
  this.saveTimer = setTimeout(async () => {
    // 최소 저장 간격 체크 (3초)
    const now = Date.now();
    if (now - this.lastSaveTime < TAB_TRACKING_CONFIG.DEBOUNCE_DELAY) {
      console.log('[TabTracker] 너무 빈번한 저장 요청 무시 (Debounce)');
      return;
    }

    await this.updateTabUsage(tabId, timeSpent);
    this.lastSaveTime = now;
    this.activeStartTime = Date.now(); // 시작 시간 리셋
  }, TAB_TRACKING_CONFIG.DEBOUNCE_DELAY);
}
```

---

### 3. 추가 최적화 (선택사항)

#### In-Memory Cache 추가

탭 데이터를 메모리에 캐시하고 주기적으로만 Storage에 저장:

```typescript
export class TabTracker {
  // ... 기존 코드 ...

  // 🆕 메모리 캐시
  private static tabDataCache: Record<string, TabUsageData> = {};
  private static isDirty: boolean = false;

  /**
   * 🆕 메모리 캐시에서 데이터 가져오기
   */
  private static async getTabDataFromCache(domain: string): Promise<TabUsageData | null> {
    // 캐시에 있으면 반환
    if (this.tabDataCache[domain]) {
      return this.tabDataCache[domain];
    }

    // 없으면 Storage에서 가져와 캐시에 저장
    const tabUsageData = await storageUtils.getTabUsageData();
    if (tabUsageData[domain]) {
      this.tabDataCache[domain] = tabUsageData[domain];
      return tabUsageData[domain];
    }

    return null;
  }

  /**
   * 🆕 메모리 캐시 업데이트
   */
  private static updateCache(domain: string, data: TabUsageData) {
    this.tabDataCache[domain] = data;
    this.isDirty = true;
  }

  /**
   * 🆕 캐시를 Storage에 플러시
   */
  private static async flushCache() {
    if (!this.isDirty) {
      console.log('[TabTracker] 캐시 변경사항 없음, Storage 저장 스킵');
      return;
    }

    console.log('[TabTracker] 캐시를 Storage에 플러시');
    await storageUtils.setTabUsageData(this.tabDataCache);
    this.isDirty = false;
  }
}
```

그리고 `updateTabUsage` 메서드를 수정:

```typescript
private static async updateTabUsage(tabId: number, timeSpent: number) {
  try {
    // ... 기존 탭 가져오기 코드 ...

    const domain = new URL(tab.url).hostname.replace(/^www\./, '');

    // 🆕 캐시에서 기존 데이터 가져오기
    const existing = (await this.getTabDataFromCache(domain)) || {
      url: tab.url,
      domain: domain,
      title: tab.title || '',
      category: category,
      firstSeen: Date.now(),
      lastAccessed: Date.now(),
      totalTimeSpent: 0,
      accessCount: 0,
      activations: 0,
    };

    // 데이터 업데이트
    existing.lastAccessed = Date.now();
    existing.totalTimeSpent += timeSpent;
    existing.title = tab.title || existing.title;
    existing.category = category;

    // 🆕 캐시에 저장 (Storage는 나중에)
    this.updateCache(domain, existing);

    // 일일 통계 업데이트
    await this.updateDailyStats(category, domain, timeSpent);

    // 🆕 주기적으로 캐시 플러시 (1분마다)
    // initialize의 alarms 리스너에서 호출
  } catch (error) {
    console.error('[TabTracker] 탭 사용 업데이트 오류:', error);
  }
}
```

그리고 `initialize`의 알람 리스너 수정:

```typescript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tabTrackerUpdate') {
    this.updateActiveTabTime();
    this.flushCache(); // 🆕 캐시 플러시 추가
  }
});
```

---

## 테스트

### 테스트 시나리오 1: 짧은 탭 전환 무시
1. 여러 탭을 빠르게 전환 (각 탭 5-10초)
2. Storage Inspector로 Write 횟수 확인

**예상 결과**:
- 30초 미만 탭은 Storage에 저장 안 됨
- Console에 "짧은 활성화 시간 무시" 로그 출력
- Storage Write 횟수 감소

---

### 테스트 시나리오 2: Debounce 동작 확인
1. 탭을 30초 이상 활성화
2. 여러 번 다른 탭으로 전환 후 돌아오기
3. Storage Write 타이밍 확인

**예상 결과**:
- 3초 이내 여러 저장 요청은 한 번만 실행
- Console에 "너무 빈번한 저장 요청 무시" 로그 출력

---

### 테스트 시나리오 3: Storage I/O 측정
1. TabQuest 설치 후 1시간 사용
2. Chrome Storage Inspector로 I/O 횟수 측정

**기존**:
- Write: 600회/시간 (6초마다)
- Read: 600회/시간

**개선 후**:
- Write: 20회/시간 미만 (97% 감소)
- Read: 60회/시간 미만

---

## 예상 효과

### 정량적 효과
- ✅ Storage Write: **97% 감소** (600회/시간 → 20회/시간)
- ✅ Storage Read: **90% 감소** (600회/시간 → 60회/시간)
- ✅ Service Worker 활성화: **90% 감소** (6초 → 1분)
- ✅ 배터리 소모: **30-50% 감소**
- ✅ 의미 있는 데이터만 수집: **100%**

### 정성적 효과
- ✅ 다른 확장 프로그램과의 충돌 위험 감소
- ✅ Storage 한도 초과 위험 제거
- ✅ 데이터 품질 향상 (노이즈 제거)
- ✅ 백그라운드 성능 개선

---

## 알려진 이슈

### 1. 초기 캐시 워밍
**문제**: 첫 실행 시 캐시가 비어있어 Storage Read 발생
**해결**: initialize 시 전체 데이터를 캐시로 로드

### 2. 캐시 동기화
**문제**: 여러 창에서 동시에 사용 시 캐시 불일치 가능
**해결**: chrome.storage.onChanged 리스너로 동기화

### 3. 메모리 사용량
**문제**: 캐시가 메모리를 차지함
**해결**: 적절한 캐시 크기 제한 (최대 1000개 도메인)

---

## 관련 문서

- [Meet 탭 제외 처리](./meet-exclusion.md)
- [Safety Checks](./safety-checks.md)
- [Category 캐시](./category-cache.md)
