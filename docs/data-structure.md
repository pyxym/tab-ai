# 📊 TabQuest 데이터 구조 가이드

> 💡 **한 줄 요약**: TabQuest는 Chrome Storage API를 사용해 JSON 형태로 데이터를 저장합니다. Firebase Firestore나 다른 JSON 기반 데이터베이스로 쉽게 마이그레이션 가능합니다!

## 🗂️ 저장소 종류

TabQuest는 두 가지 저장소를 사용합니다:

### 1. 동기화 스토리지 (Sync Storage)
- **위치**: 모든 기기에 동기화
- **용도**: 사용자 설정 및 카테고리 정보
- **크기 제한**: 약 100KB
- **데이터**: 사용자가 만든 카테고리, 도메인 매핑

### 2. 로컬 스토리지 (Local Storage)
- **위치**: 현재 기기에만 저장
- **용도**: 사용 통계 및 추적 데이터
- **크기 제한**: 약 10MB
- **데이터**: 탭 사용 기록, 일별 통계, 사용자 패턴

---

## 📦 데이터 형식

모든 데이터는 **순수 JSON 형식**으로 저장됩니다. 특별한 직렬화나 암호화 없이 그대로 저장되므로 Firebase, MongoDB, PostgreSQL(JSONB) 등 어떤 데이터베이스로도 쉽게 옮길 수 있습니다!

---

## 📋 전체 데이터 스키마

```typescript
// 전체 저장소 구조
interface StorageSchema {
  // 동기화 스토리지 (모든 기기)
  'sync:categories': Category[];              // 카테고리 목록
  'sync:categoryMapping': Record<string, string>; // 도메인-카테고리 매핑

  // 로컬 스토리지 (현재 기기만)
  'local:tabUsageData': Record<string, TabUsageData>;   // 탭 사용 데이터
  'local:dailyStats': Record<string, DailyStats>;       // 일별 통계
  'local:hasSeenWelcome': boolean;                       // 환영 메시지 표시 여부
  'local:userPatterns': Record<string, UserPattern>;     // 사용자 패턴
  'local:categoryHistory': Record<string, CategoryHistory>; // 카테고리 히스토리
  'local:tabsData': TabData[];                          // 탭 데이터 배열
}
```

---

## 🔍 상세 데이터 타입

### 1. Category (카테고리)

사용자가 만든 탭 분류 카테고리입니다.

```typescript
interface Category {
  id: string;              // 고유 ID (예: "work", "social")
  name: string;            // 표시 이름 (예: "업무", "소셜")
  color: string;           // 색상 (20가지 색상 중 선택)
  domains: string[];       // 포함된 도메인 목록
  keywords: string[];      // 키워드 목록
  isDefault: boolean;      // 기본 제공 카테고리 여부
  isSystem?: boolean;      // 시스템 카테고리 여부 (삭제 불가)
  createdAt: number;       // 생성 시간 (Unix timestamp)
}
```

**실제 예시**:
```json
{
  "id": "work",
  "name": "Work",
  "color": "indigo",
  "domains": ["github.com", "slack.com", "notion.so"],
  "keywords": ["dev", "code", "api"],
  "isDefault": true,
  "isSystem": false,
  "createdAt": 1704067200000
}
```

**사용 위치**: `sync:categories`

---

### 2. CategoryMapping (도메인-카테고리 매핑)

도메인을 어떤 카테고리에 할당할지 저장합니다.

```typescript
type CategoryMapping = Record<string, string>;
// { [domain: string]: categoryId }
```

**실제 예시**:
```json
{
  "github.com": "work",
  "youtube.com": "entertainment",
  "twitter.com": "social",
  "amazon.com": "shopping"
}
```

**사용 위치**: `sync:categoryMapping`

---

### 3. TabUsageData (탭 사용 데이터)

각 도메인별 탭 사용 통계를 저장합니다.

```typescript
interface TabUsageData {
  url?: string;            // 탭 URL (선택적)
  domain: string;          // 도메인 (예: "github.com")
  title?: string;          // 탭 제목
  category?: string;       // 카테고리 ID
  firstSeen?: number;      // 처음 본 시간 (Unix timestamp)
  lastAccessed: number;    // 마지막 접근 시간
  timeSpent: number;       // 현재 세션 사용 시간 (밀리초)
  totalTimeSpent: number;  // 총 누적 사용 시간 (밀리초)
  accessCount: number;     // 접근 횟수
  activations: number;     // 활성화 횟수
}
```

**실제 예시**:
```json
{
  "url": "https://github.com/anthropics/claude-code",
  "domain": "github.com",
  "title": "Claude Code - GitHub",
  "category": "work",
  "firstSeen": 1704067200000,
  "lastAccessed": 1704153600000,
  "timeSpent": 3600000,
  "totalTimeSpent": 86400000,
  "accessCount": 45,
  "activations": 12
}
```

**사용 위치**: `local:tabUsageData`
**저장 형식**: Record (객체) - 도메인이 키
```json
{
  "github.com": { /* TabUsageData */ },
  "youtube.com": { /* TabUsageData */ },
  "twitter.com": { /* TabUsageData */ }
}
```

---

### 4. DailyStats (일별 통계)

매일의 탭 사용 통계를 저장합니다.

```typescript
interface DailyStats {
  date: string;                          // 날짜 (YYYY-MM-DD)
  tabsOpened: number;                    // 열린 탭 수
  tabsClosed: number;                    // 닫힌 탭 수
  tabsOrganized: number;                 // 정리한 탭 수
  activeTime: number;                    // 활성 시간 (밀리초)
  productivityScore: number;             // 생산성 점수 (0-100)
  totalTabs?: number;                    // 총 탭 수
  totalTimeSpent?: number;               // 총 사용 시간 (밀리초)
  categoryBreakdown?: Record<string, number>; // 카테고리별 시간
  domainBreakdown?: Record<string, number>;   // 도메인별 시간
  topDomains: Array<{                    // 상위 도메인
    domain: string;
    count: number;
    timeSpent: number;
  }>;
}
```

**실제 예시**:
```json
{
  "date": "2025-01-12",
  "tabsOpened": 45,
  "tabsClosed": 38,
  "tabsOrganized": 12,
  "activeTime": 21600000,
  "productivityScore": 78,
  "totalTabs": 23,
  "totalTimeSpent": 28800000,
  "categoryBreakdown": {
    "work": 18000000,
    "social": 3600000,
    "entertainment": 7200000
  },
  "domainBreakdown": {
    "github.com": 12000000,
    "slack.com": 6000000,
    "youtube.com": 7200000
  },
  "topDomains": [
    {
      "domain": "github.com",
      "count": 15,
      "timeSpent": 12000000
    },
    {
      "domain": "youtube.com",
      "count": 8,
      "timeSpent": 7200000
    }
  ]
}
```

**사용 위치**: `local:dailyStats`
**저장 형식**: Record (객체) - 날짜가 키
```json
{
  "2025-01-12": { /* DailyStats */ },
  "2025-01-11": { /* DailyStats */ },
  "2025-01-10": { /* DailyStats */ }
}
```

---

### 5. UserPattern (사용자 패턴)

사용자의 도메인 사용 패턴을 학습한 데이터입니다.

```typescript
interface UserPattern {
  domain: string;          // 도메인
  category: string;        // 추론된 카테고리
  confidence: number;      // 신뢰도 (0-1)
  lastUpdated: number;     // 마지막 업데이트 시간
  frequency: number;       // 사용 빈도
}
```

**실제 예시**:
```json
{
  "domain": "github.com",
  "category": "work",
  "confidence": 0.95,
  "lastUpdated": 1704153600000,
  "frequency": 150
}
```

**사용 위치**: `local:userPatterns`
**저장 형식**: Record (객체) - 도메인이 키

---

### 6. CategoryHistory (카테고리 히스토리)

카테고리 관련 액션 히스토리입니다.

```typescript
interface CategoryHistory {
  categoryId: string;                    // 카테고리 ID
  action: 'created' | 'updated' | 'deleted' | 'assigned'; // 액션 타입
  timestamp: number;                     // 시간
  details?: {                            // 상세 정보
    domain?: string;
    tabCount?: number;
    previousCategory?: string;
  };
}
```

**실제 예시**:
```json
{
  "categoryId": "work",
  "action": "assigned",
  "timestamp": 1704153600000,
  "details": {
    "domain": "github.com",
    "tabCount": 5,
    "previousCategory": "uncategorized"
  }
}
```

**사용 위치**: `local:categoryHistory`

---

### 7. TabData (탭 데이터)

현재 탭들의 스냅샷 데이터입니다.

```typescript
interface TabData {
  id: number;              // Chrome 탭 ID
  url: string;             // 탭 URL
  title: string;           // 탭 제목
  favIconUrl?: string;     // 파비콘 URL
  categoryId?: string;     // 카테고리 ID
  lastAccessed: number;    // 마지막 접근 시간
  accessCount: number;     // 접근 횟수
  timeSpent: number;       // 사용 시간 (밀리초)
}
```

**실제 예시**:
```json
{
  "id": 123,
  "url": "https://github.com/anthropics/claude-code",
  "title": "Claude Code - GitHub",
  "favIconUrl": "https://github.com/favicon.ico",
  "categoryId": "work",
  "lastAccessed": 1704153600000,
  "accessCount": 12,
  "timeSpent": 3600000
}
```

**사용 위치**: `local:tabsData`
**저장 형식**: Array (배열)

---

## 🔥 Firebase Firestore 호환성

### ✅ 완벽하게 호환 가능합니다!

TabQuest의 모든 데이터는 순수 JSON이므로 Firestore로 쉽게 마이그레이션할 수 있습니다.

### 추천 Firestore 컬렉션 구조

```
users/{userId}
  ├─ categories (subcollection)
  │   ├─ {categoryId} → Category
  │   └─ ...
  │
  ├─ categoryMappings (document)
  │   └─ mappings: { [domain]: categoryId }
  │
  ├─ tabUsage (subcollection)
  │   ├─ {domain} → TabUsageData
  │   └─ ...
  │
  ├─ dailyStats (subcollection)
  │   ├─ {date} → DailyStats
  │   └─ ...
  │
  ├─ userPatterns (subcollection)
  │   ├─ {domain} → UserPattern
  │   └─ ...
  │
  └─ settings (document)
      └─ hasSeenWelcome: boolean
```

### 마이그레이션 코드 예시

```typescript
// Chrome Storage → Firestore
async function migrateToFirestore(userId: string) {
  const db = firebase.firestore();

  // 1. 카테고리 마이그레이션
  const categories = await storageUtils.getCategories();
  const batch = db.batch();

  categories.forEach(category => {
    const ref = db.collection('users').doc(userId)
                  .collection('categories').doc(category.id);
    batch.set(ref, category);
  });

  // 2. 탭 사용 데이터 마이그레이션
  const tabUsageData = await storageUtils.getTabUsageData();
  Object.entries(tabUsageData).forEach(([domain, data]) => {
    const ref = db.collection('users').doc(userId)
                  .collection('tabUsage').doc(domain);
    batch.set(ref, data);
  });

  // 3. 일별 통계 마이그레이션
  const dailyStats = await storageUtils.getDailyStats();
  Object.entries(dailyStats).forEach(([date, stats]) => {
    const ref = db.collection('users').doc(userId)
                  .collection('dailyStats').doc(date);
    batch.set(ref, stats);
  });

  await batch.commit();
  console.log('마이그레이션 완료!');
}
```

---

## 💾 다른 데이터베이스 호환성

### PostgreSQL (JSONB)

```sql
-- 테이블 생성
CREATE TABLE tab_usage_data (
  domain VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 데이터 삽입
INSERT INTO tab_usage_data (domain, data)
VALUES ('github.com', '{"url": "https://github.com", ...}'::JSONB);

-- 쿼리 예시
SELECT * FROM tab_usage_data
WHERE data->>'category' = 'work'
AND (data->>'totalTimeSpent')::bigint > 3600000;
```

### MongoDB

```javascript
// 컬렉션 구조
db.users.insertOne({
  userId: "user123",
  categories: [ /* Category[] */ ],
  categoryMapping: { /* Record */ },
  tabUsageData: { /* Record */ },
  dailyStats: { /* Record */ }
});

// 쿼리 예시
db.users.aggregate([
  { $match: { userId: "user123" } },
  { $project: {
      workTabs: {
        $filter: {
          input: { $objectToArray: "$tabUsageData" },
          cond: { $eq: ["$$this.v.category", "work"] }
        }
      }
  }}
]);
```

### SQLite (JSON1 extension)

```sql
-- 테이블 생성
CREATE TABLE storage (
  key TEXT PRIMARY KEY,
  value TEXT CHECK(json_valid(value))
);

-- 데이터 삽입
INSERT INTO storage (key, value)
VALUES ('local:tabUsageData', '{"github.com": {...}}');

-- JSON 쿼리
SELECT json_extract(value, '$.github\.com.totalTimeSpent')
FROM storage
WHERE key = 'local:tabUsageData';
```

---

## 📏 데이터 크기 추정

### 일반적인 사용자 (50개 탭, 30일 추적)

| 데이터 타입 | 개수 | 예상 크기 | 설명 |
|-------------|------|-----------|------|
| Categories | 10개 | ~2KB | 기본 + 사용자 정의 |
| CategoryMapping | 50개 | ~1KB | 도메인-카테고리 매핑 |
| TabUsageData | 50개 | ~25KB | 도메인별 사용 통계 |
| DailyStats | 14일 | ~20KB | 일별 통계 (14일 유지) |
| UserPatterns | 30개 | ~5KB | 학습된 패턴 |
| CategoryHistory | 100개 | ~10KB | 히스토리 |
| **총합** | - | **~63KB** | 전체 데이터 |

### 파워 유저 (200개 탭, 14일 추적)

| 데이터 타입 | 개수 | 예상 크기 |
|-------------|------|-----------|
| Categories | 20개 | ~4KB |
| CategoryMapping | 200개 | ~4KB |
| TabUsageData | 200개 | ~100KB |
| DailyStats | 14일 | ~30KB |
| UserPatterns | 100개 | ~15KB |
| CategoryHistory | 200개 | ~20KB |
| **총합** | - | **~173KB** |

💡 **참고**: Chrome Storage Local 제한은 10MB이므로 충분한 여유가 있습니다!

---

## 🔒 데이터 보안 및 프라이버시

### 현재 상태
- ❌ **암호화 없음**: 모든 데이터는 평문(plain text) JSON으로 저장
- ✅ **로컬 저장**: 데이터는 사용자 기기에만 저장 (서버 전송 없음)
- ✅ **Chrome 보호**: Chrome의 프로필 보호 기능으로 다른 사용자 접근 차단

### 보안 강화 방법 (선택사항)

```typescript
// AES 암호화 예시
import CryptoJS from 'crypto-js';

async function encryptData(data: any, password: string) {
  const jsonStr = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonStr, password).toString();
  return encrypted;
}

async function decryptData(encrypted: string, password: string) {
  const decrypted = CryptoJS.AES.decrypt(encrypted, password);
  const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
  return JSON.parse(jsonStr);
}

// 사용 예시
const password = await generateUserPassword();
const encryptedData = await encryptData(tabUsageData, password);
await storageUtils.setItem('local:tabUsageData', encryptedData);
```

---

## 🛠️ 데이터 관리 유틸리티

### 데이터 내보내기 (Export)

```typescript
async function exportAllData() {
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    categories: await storageUtils.getCategories(),
    categoryMapping: await storageUtils.getCategoryMapping(),
    tabUsageData: await storageUtils.getTabUsageData(),
    dailyStats: await storageUtils.getDailyStats(),
    userPatterns: await storageUtils.getUserPatterns(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tabquest-export-${Date.now()}.json`;
  a.click();
}
```

### 데이터 가져오기 (Import)

```typescript
async function importData(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);

  // 버전 확인
  if (data.version !== '1.0.0') {
    throw new Error('Unsupported data version');
  }

  // 데이터 복원
  await storageUtils.setCategories(data.categories);
  await storageUtils.setCategoryMapping(data.categoryMapping);
  await storageUtils.setTabUsageData(data.tabUsageData);
  await storageUtils.setDailyStats(data.dailyStats);
  await storageUtils.setUserPatterns(data.userPatterns);

  console.log('데이터 가져오기 완료!');
}
```

### 데이터 초기화

```typescript
// 로컬 데이터만 초기화
await storageUtils.clearLocalStorage();

// 전체 데이터 초기화
chrome.storage.sync.clear();
chrome.storage.local.clear();
```

---

## 📊 실제 Chrome Storage 저장 예시

### Chrome DevTools에서 확인하는 방법

1. 확장 프로그램 페이지: `chrome://extensions`
2. TabQuest의 "백그라운드 페이지" 클릭
3. DevTools Console에서:

```javascript
// 모든 동기화 데이터 보기
chrome.storage.sync.get(null, (data) => {
  console.log('Sync Storage:', data);
});

// 모든 로컬 데이터 보기
chrome.storage.local.get(null, (data) => {
  console.log('Local Storage:', data);
});

// 특정 키 보기
chrome.storage.local.get('local:tabUsageData', (data) => {
  console.log('Tab Usage:', JSON.stringify(data, null, 2));
});
```

### 실제 저장된 데이터 예시

```json
{
  "sync:categories": [
    {
      "id": "work",
      "name": "Work",
      "color": "indigo",
      "domains": ["github.com", "slack.com"],
      "keywords": ["dev", "code"],
      "isDefault": true,
      "createdAt": 1704067200000
    }
  ],
  "sync:categoryMapping": {
    "github.com": "work",
    "youtube.com": "entertainment"
  },
  "local:tabUsageData": {
    "github.com": {
      "domain": "github.com",
      "category": "work",
      "lastAccessed": 1704153600000,
      "totalTimeSpent": 86400000,
      "accessCount": 45
    }
  },
  "local:dailyStats": {
    "2025-01-12": {
      "date": "2025-01-12",
      "tabsOpened": 45,
      "productivityScore": 78,
      "totalTimeSpent": 28800000
    }
  }
}
```

---

## 🔄 데이터 동기화 로직

### Chrome Storage Sync 동작 방식

```typescript
// 데이터가 변경되면 자동으로 모든 기기에 동기화
await storageUtils.setCategories(newCategories);
// → 다른 기기의 Chrome에서도 자동으로 업데이트됨!

// 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes['sync:categories']) {
    console.log('카테고리가 다른 기기에서 변경됨!');
    const newCategories = changes['sync:categories'].newValue;
    // UI 업데이트
  }
});
```

---

## 📝 요약

### ✅ 장점

1. **순수 JSON** - 어떤 데이터베이스로도 쉽게 마이그레이션
2. **Firebase 호환** - Firestore와 완벽하게 호환
3. **타입 안전성** - TypeScript로 완전히 타입 정의됨
4. **자동 동기화** - Chrome Sync로 여러 기기 자동 동기화
5. **간단한 구조** - 이해하고 수정하기 쉬움

### 📌 주의사항

1. **암호화 없음** - 민감한 정보는 저장하지 않음 (URL, 도메인, 사용 시간만)
2. **크기 제한** - Sync: 100KB, Local: 10MB
3. **로컬 우선** - 큰 데이터는 로컬 스토리지 사용

### 🎯 다음 단계

- [ ] 데이터 내보내기/가져오기 UI 추가
- [ ] Firebase 백엔드 선택적 연동
- [ ] 데이터 암호화 옵션 추가 (선택사항)
- [ ] 클라우드 백업 기능 (선택사항)

---

**작성**: 2025-01-12
**버전**: 1.0.0
**난이도**: ⭐⭐ (중급 - 개발자 대상)
