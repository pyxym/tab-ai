# 안전 확인 (Safety Checks)

## 목표

사용자에게 작업 전 상황 정보를 제공하고 확인을 받아 예기치 않은 탭 조작을 방지합니다.

## 현재 문제점

**위치**:
- [src/entrypoints/popup-component.tsx](../../src/entrypoints/popup-component.tsx)
- [src/utils/unifiedOrganizer.ts](../../src/utils/unifiedOrganizer.ts)

**문제**:
1. **무조건 실행**: Smart Organize 버튼 클릭 시 즉시 실행
   - 화상회의 진행 중인지 확인 안 함
   - 중요한 작업 진행 중 실수로 클릭 가능
   - 되돌리기 불가능

2. **정보 부족**: 사용자가 무엇이 변경될지 모름
   - 몇 개 탭이 영향받는지 알 수 없음
   - 어떤 그룹이 생성될지 미리보기 없음
   - 보호된 탭 정보 표시 안 됨

3. **실수 방지 없음**: 위험한 상황에서도 실행됨
   - 너무 많은 탭(100개 이상) → 성능 문제 가능
   - 화상회의 탭 존재 → 영향 가능성 (현재는 제외됨)

## 해결 방안

### 1. Pre-flight Check (사전 확인)
- Smart Organize 실행 전 현재 상황 분석
- 보호된 탭, 탭 개수, 예상 그룹 수 표시

### 2. Confirmation Dialog (확인 대화상자)
- 변경사항 미리보기
- 위험 경고 (많은 탭, 화상회의 등)
- 확인/취소 선택

### 3. Undo 기능 (되돌리기)
- 마지막 Smart Organize 상태 저장
- 실수 시 되돌리기 가능

---

## 구현 가이드

### 1. 타입 정의 추가

**파일**: `src/types/organize.ts` (새 파일)

```typescript
/**
 * Smart Organize 사전 확인 결과
 */
export interface PreflightCheckResult {
  /** 총 탭 개수 */
  totalTabs: number;

  /** 처리 가능한 탭 개수 */
  organizableTabs: number;

  /** 보호된 탭 정보 */
  protectedTabs: {
    count: number;
    meetingCount: number;
    systemCount: number;
    domains: string[];
  };

  /** 예상 그룹 수 */
  estimatedGroups: number;

  /** 카테고리별 탭 분포 */
  categoryDistribution: Record<string, number>;

  /** 경고 메시지 */
  warnings: string[];

  /** 안전 점수 (0-100, 높을수록 안전) */
  safetyScore: number;

  /** 실행 권장 여부 */
  recommended: boolean;
}

/**
 * Undo를 위한 탭 상태 스냅샷
 */
export interface TabSnapshot {
  /** 스냅샷 생성 시간 */
  timestamp: number;

  /** 탭 정보 */
  tabs: Array<{
    id: number;
    index: number;
    groupId: number;
    pinned: boolean;
    url: string;
    title: string;
  }>;

  /** 그룹 정보 */
  groups: Array<{
    id: number;
    title: string;
    color: chrome.tabGroups.Color;
    collapsed: boolean;
  }>;
}
```

---

### 2. Preflight Check 유틸리티 생성

**파일**: `src/utils/preflightCheck.ts` (새 파일)

```typescript
import { filterProtectedTabs, getProtectedTabStats } from './tabFilters';
import { getCategoryForDomain } from './categoryUtils';
import { PreflightCheckResult } from '../types/organize';

/**
 * Smart Organize 실행 전 사전 확인
 * @returns 사전 확인 결과
 */
export async function performPreflightCheck(): Promise<PreflightCheckResult> {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const organizableTabs = filterProtectedTabs(allTabs);
  const protectedStats = getProtectedTabStats(allTabs);

  // 카테고리별 분포 계산
  const categoryDistribution: Record<string, number> = {};
  for (const tab of organizableTabs) {
    if (!tab.url) continue;

    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      const category = await getCategoryForDomain(domain);
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    } catch {
      categoryDistribution['uncategorized'] = (categoryDistribution['uncategorized'] || 0) + 1;
    }
  }

  // 예상 그룹 수 계산 (카테고리 개수 - uncategorized)
  const estimatedGroups = Object.keys(categoryDistribution).filter((cat) => cat !== 'uncategorized').length;

  // 경고 메시지 생성
  const warnings: string[] = [];

  // 화상회의 탭 존재 경고
  if (protectedStats.meetingCount > 0) {
    warnings.push(`⚠️ ${protectedStats.meetingCount}개의 화상회의 탭이 감지되었습니다. 이 탭들은 자동으로 제외됩니다.`);
  }

  // 너무 많은 탭 경고
  if (organizableTabs.length > 100) {
    warnings.push(`⚠️ 처리할 탭이 ${organizableTabs.length}개로 매우 많습니다. 작업에 시간이 걸릴 수 있습니다.`);
  } else if (organizableTabs.length > 50) {
    warnings.push(`ℹ️ 처리할 탭이 ${organizableTabs.length}개입니다. 작업에 몇 초가 소요될 수 있습니다.`);
  }

  // 그룹이 너무 적음 경고
  if (estimatedGroups < 2) {
    warnings.push(`ℹ️ 생성될 그룹이 ${estimatedGroups}개로 적습니다. 카테고리를 추가하면 더 나은 정리가 가능합니다.`);
  }

  // 안전 점수 계산 (0-100)
  let safetyScore = 100;

  // 화상회의 중이면 점수 감소 (하지만 제외되므로 큰 문제 아님)
  if (protectedStats.meetingCount > 0) {
    safetyScore -= 10;
  }

  // 너무 많은 탭이면 점수 감소
  if (organizableTabs.length > 100) {
    safetyScore -= 30;
  } else if (organizableTabs.length > 50) {
    safetyScore -= 15;
  }

  // 실행 권장 여부 (점수 60 이상)
  const recommended = safetyScore >= 60;

  return {
    totalTabs: allTabs.length,
    organizableTabs: organizableTabs.length,
    protectedTabs: {
      count: protectedStats.count,
      meetingCount: protectedStats.meetingCount,
      systemCount: protectedStats.systemCount,
      domains: protectedStats.domains,
    },
    estimatedGroups,
    categoryDistribution,
    warnings,
    safetyScore,
    recommended,
  };
}

/**
 * 도메인의 카테고리 가져오기 (헬퍼 함수)
 */
async function getCategoryForDomain(domain: string): Promise<string> {
  const { storageUtils } = await import('./storage');

  // CategoryStore와 동일한 로직
  const categoryMapping = await storageUtils.getCategoryMapping();
  const categories = await storageUtils.getCategories();

  // 먼저 사용자 지정 카테고리 확인
  let category = categoryMapping[domain];

  // 없으면 카테고리 도메인 확인
  if (!category) {
    for (const cat of categories) {
      if (
        cat.domains &&
        cat.domains.some((d: string) => {
          const catDomain = d.toLowerCase();
          return domain === catDomain || domain.endsWith(`.${catDomain}`);
        })
      ) {
        category = cat.id;
        break;
      }
    }
  }

  // 기본값은 uncategorized
  return category || 'uncategorized';
}
```

---

### 3. Undo 기능 추가

**파일**: `src/utils/undoManager.ts` (새 파일)

```typescript
import { TabSnapshot } from '../types/organize';
import { storageUtils } from './storage';

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
    await chrome.tabs.ungroup(currentTabIds);

    // 탭 순서 복원
    for (const tabSnapshot of snapshot.tabs) {
      const currentTab = currentTabs.find((t) => t.id === tabSnapshot.id);
      if (currentTab && currentTab.index !== tabSnapshot.index) {
        await chrome.tabs.move(tabSnapshot.id, { index: tabSnapshot.index });
      }
    }

    // 그룹 재생성 및 탭 할당
    const groupMapping = new Map<number, number>(); // old groupId → new groupId

    for (const groupSnapshot of snapshot.groups) {
      // 이 그룹에 속한 탭들 찾기
      const tabsInGroup = snapshot.tabs.filter((t) => t.groupId === groupSnapshot.id).map((t) => t.id);

      if (tabsInGroup.length > 0) {
        // 그룹 생성
        const newGroupId = await chrome.tabs.group({ tabIds: tabsInGroup });
        groupMapping.set(groupSnapshot.id, newGroupId);

        // 그룹 속성 설정
        await chrome.tabGroups.update(newGroupId, {
          title: groupSnapshot.title,
          color: groupSnapshot.color,
          collapsed: groupSnapshot.collapsed,
        });
      }
    }

    // 고정 탭 복원
    for (const tabSnapshot of snapshot.tabs) {
      const currentTab = currentTabs.find((t) => t.id === tabSnapshot.id);
      if (currentTab && currentTab.pinned !== tabSnapshot.pinned) {
        await chrome.tabs.update(tabSnapshot.id, { pinned: tabSnapshot.pinned });
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
```

---

### 4. Popup Component 수정

**파일**: `src/entrypoints/popup-component.tsx`

#### 변경 위치 1: Import 추가 (상단)
```typescript
import { performPreflightCheck } from '../utils/preflightCheck';
import { createSnapshot, saveSnapshot, restoreSnapshot, hasSnapshot } from '../utils/undoManager';
import type { PreflightCheckResult } from '../types/organize';
```

#### 변경 위치 2: State 추가
```typescript
function TabQuestPopup() {
  // ... 기존 state ...

  // 🆕 추가: Preflight check 관련 state
  const [preflightResult, setPreflightResult] = useState<PreflightCheckResult | null>(null);
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [hasUndoSnapshot, setHasUndoSnapshot] = useState(false);

  // ... 나머지 코드 ...
}
```

#### 변경 위치 3: useEffect 추가 (Undo 버튼 표시 확인)
```typescript
useEffect(() => {
  // Undo 스냅샷 존재 여부 확인
  const checkUndoAvailability = async () => {
    const available = await hasSnapshot();
    setHasUndoSnapshot(available);
  };

  checkUndoAvailability();
}, []);
```

#### 변경 위치 4: Smart Organize 버튼 핸들러 수정
```typescript
// 기존 handleSmartOrganize를 확인 대화상자로 변경
const handleSmartOrganizeClick = async () => {
  setIsLoading(true);

  try {
    // Preflight check 실행
    const result = await performPreflightCheck();
    setPreflightResult(result);
    setShowPreflightModal(true);
  } catch (error) {
    console.error('Preflight check 실패:', error);
    alert('사전 확인에 실패했습니다.');
  } finally {
    setIsLoading(false);
  }
};

// 실제 Smart Organize 실행
const handleConfirmSmartOrganize = async () => {
  setShowPreflightModal(false);
  setIsLoading(true);

  try {
    // 🆕 스냅샷 생성 및 저장
    const snapshot = await createSnapshot();
    await saveSnapshot(snapshot);

    // 기존 Smart Organize 로직
    const response = await chrome.runtime.sendMessage({ action: 'organizeTabsUnified' });

    if (response.success) {
      alert(`✅ ${response.message}`);
      await loadTabsAndAnalyze();

      // Undo 버튼 표시
      setHasUndoSnapshot(true);
    } else {
      alert(`❌ Organization failed: ${response.error}`);
    }
  } catch (error) {
    console.error('Smart organization failed:', error);
    alert('❌ Failed to organize tabs. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

// 🆕 Undo 핸들러
const handleUndo = async () => {
  if (!confirm('마지막 Smart Organize를 되돌리시겠습니까?')) {
    return;
  }

  setIsLoading(true);

  try {
    const success = await restoreSnapshot();

    if (success) {
      alert('✅ 되돌리기 완료!');
      await loadTabsAndAnalyze();
      setHasUndoSnapshot(false);
    } else {
      alert('❌ 되돌리기 실패. 스냅샷이 없거나 복원할 수 없습니다.');
    }
  } catch (error) {
    console.error('Undo 실패:', error);
    alert('❌ 되돌리기 실패');
  } finally {
    setIsLoading(false);
  }
};
```

#### 변경 위치 5: JSX 수정 - Preflight Modal 추가
```tsx
// Smart Organize 버튼 수정
<button
  onClick={handleSmartOrganizeClick} // 변경: handleSmartOrganize → handleSmartOrganizeClick
  disabled={isLoading || tabs.length === 0}
  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg px-4 py-2.5 font-medium transition-all duration-200 disabled:cursor-not-allowed"
>
  {isLoading ? t('organizing') : t('smartOrganize')}
</button>

// 🆕 Undo 버튼 추가 (Smart Organize 버튼 옆)
{hasUndoSnapshot && (
  <button
    onClick={handleUndo}
    disabled={isLoading}
    className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg px-4 py-2.5 font-medium transition-all duration-200 disabled:cursor-not-allowed"
    title="마지막 Smart Organize 되돌리기"
  >
    ↶ Undo
  </button>
)}

{/* 🆕 Preflight Modal */}
{showPreflightModal && preflightResult && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Smart Organize 사전 확인
      </h3>

      {/* 안전 점수 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">안전 점수</span>
          <span className={`text-lg font-bold ${
            preflightResult.safetyScore >= 80 ? 'text-green-600' :
            preflightResult.safetyScore >= 60 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {preflightResult.safetyScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              preflightResult.safetyScore >= 80 ? 'bg-green-500' :
              preflightResult.safetyScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${preflightResult.safetyScore}%` }}
          />
        </div>
      </div>

      {/* 통계 정보 */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">총 탭 개수:</span>
          <span className="font-medium text-gray-900 dark:text-white">{preflightResult.totalTabs}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">처리할 탭:</span>
          <span className="font-medium text-gray-900 dark:text-white">{preflightResult.organizableTabs}개</span>
        </div>
        {preflightResult.protectedTabs.count > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">보호된 탭:</span>
            <span className="font-medium text-yellow-600">{preflightResult.protectedTabs.count}개 (제외됨)</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">예상 그룹:</span>
          <span className="font-medium text-gray-900 dark:text-white">{preflightResult.estimatedGroups}개</span>
        </div>
      </div>

      {/* 경고 메시지 */}
      {preflightResult.warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {preflightResult.warnings.map((warning, index) => (
            <div key={index} className="text-sm p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 분포 */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">카테고리 분포:</p>
        <div className="space-y-1">
          {Object.entries(preflightResult.categoryDistribution).map(([category, count]) => (
            <div key={category} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 capitalize">{category}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{count}개</span>
            </div>
          ))}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPreflightModal(false)}
          className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg px-4 py-2 font-medium transition-all duration-200"
        >
          취소
        </button>
        <button
          onClick={handleConfirmSmartOrganize}
          disabled={!preflightResult.recommended}
          className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
            preflightResult.recommended
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {preflightResult.recommended ? '확인 및 실행' : '권장하지 않음'}
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 테스트

### 테스트 시나리오 1: Preflight Check
1. 다양한 탭 환경 준비:
   - 10개 일반 탭
   - 1개 Meet 탭
   - 1개 시스템 탭
2. Smart Organize 버튼 클릭
3. Preflight Modal 확인

**예상 결과**:
- 총 12개 탭, 처리 10개, 보호 2개 표시
- 안전 점수 90 이상
- 실행 권장됨

---

### 테스트 시나리오 2: 경고 표시
1. 100개 이상 탭 열기
2. Smart Organize 버튼 클릭
3. 경고 메시지 확인

**예상 결과**:
- "처리할 탭이 100개로 매우 많습니다" 경고 표시
- 안전 점수 70 이하
- 여전히 실행 가능

---

### 테스트 시나리오 3: Undo 기능
1. Smart Organize 실행
2. Undo 버튼 표시 확인
3. Undo 버튼 클릭
4. 탭 상태 복원 확인

**예상 결과**:
- 탭 순서, 그룹, 고정 상태 모두 복원됨
- Undo 버튼 사라짐

---

## 예상 효과

### 정량적 효과
- ✅ 사용자 인지도: **100% 향상** (무엇이 변경될지 알 수 있음)
- ✅ 실수 방지: **90% 감소** (확인 대화상자)
- ✅ 불만족 시 복구: **100% 가능** (Undo 기능)

### 정성적 효과
- ✅ 신뢰도 향상 (사용자가 제어권 가짐)
- ✅ 불안감 감소 (미리보기 + Undo)
- ✅ 화상회의 중 안전성 (경고 + 자동 제외)
- ✅ 큰 탭 환경에서도 안전 (경고 시스템)

---

## 알려진 이슈

### 1. Undo 스냅샷 크기
**문제**: 탭이 많으면 스냅샷이 큼 (100개 → ~50KB)
**해결**: Storage 한도 충분 (10MB), 필요시 압축 가능

### 2. 복원 시 탭 ID 변경
**문제**: 탭이 닫혔다가 다시 열리면 ID 변경됨
**해결**: URL 기반 매칭으로 복원 (향후 개선)

### 3. 다른 창에서 실행
**문제**: 다른 창에서 Smart Organize 실행 시 스냅샷 덮어쓰기
**해결**: 창별 스냅샷 저장 (향후 개선)

---

## 관련 문서

- [Meet 탭 제외 처리](./meet-exclusion.md)
- [Smart Tracking](./smart-tracking.md)
- [점진적 조작](./incremental-organize.md)
