# TabQuest 성능 테스팅 가이드

## 📋 개요

TabQuest의 성능을 측정하고 개선 효과를 검증하기 위한 테스팅 가이드입니다.

---

## 🎯 측정 목표

### 주요 성능 지표 (KPI)

1. **Smart Organize 실행 시간**
   - 목표: < 3초 (100개 탭)
   - 측정 단위: 밀리초(ms)

2. **Storage I/O 횟수**
   - 목표: < 100회/시간
   - 측정 단위: 횟수/시간

3. **CPU 사용률**
   - 평균: < 2%
   - 피크 (Organize 중): < 10%
   - 측정 단위: 퍼센트(%)

4. **메모리 사용량**
   - Background Script: < 100MB
   - 측정 단위: 메가바이트(MB)

5. **Meet 영향 시간**
   - 목표: 0초 (완전 제외)
   - 측정 단위: 초(s)

---

## 🛠️ 테스트 환경 설정

### 필요 도구

1. **Chrome DevTools**
   - Performance 탭
   - Memory 탭
   - Application > Storage

2. **확장 프로그램 개발자 모드**
   - chrome://extensions
   - Developer mode 활성화

3. **테스트 데이터 생성 스크립트**

---

## 📊 테스트 시나리오

### Scenario 1: Smart Organize 성능 테스트

#### 목적
100개 탭 환경에서 Smart Organize 실행 시간 측정

#### 준비
1. 테스트 탭 생성 스크립트 실행:
```javascript
// Chrome DevTools Console에서 실행
async function createTestTabs(count = 100) {
  const domains = [
    'https://github.com',
    'https://stackoverflow.com',
    'https://youtube.com',
    'https://twitter.com',
    'https://reddit.com',
    'https://medium.com',
    'https://dev.to',
    'https://hackernews.com',
  ];

  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    await chrome.tabs.create({ url: `${domain}?test=${i}`, active: false });
    // 탭 생성 간 짧은 대기 (브라우저 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log(`Created ${count} test tabs`);
}

// 100개 탭 생성
createTestTabs(100);
```

#### 실행
1. Chrome DevTools > Performance 탭 열기
2. Record 시작
3. TabQuest Popup에서 "Smart Organize" 클릭
4. 작업 완료 후 Record 중지

#### 측정 항목
- **총 실행 시간**: Record 시작부터 종료까지
- **Scripting Time**: JavaScript 실행 시간
- **Rendering Time**: 레이아웃 재계산 시간
- **API Call Count**: chrome.tabs.* 호출 횟수

#### 합격 기준
- ✅ 총 실행 시간 < 3초
- ✅ Scripting Time < 2초
- ✅ Long Task 없음 (50ms 이상 차단)

---

### Scenario 2: Storage I/O 부하 테스트

#### 목적
1시간 동안의 Storage Read/Write 횟수 측정

#### 준비
1. TabQuest 설치 및 활성화
2. 일반적인 브라우징 패턴 시뮬레이션
   - 탭 20-30개 열기
   - 5-10분마다 탭 전환
   - 10-20분마다 새 탭 열기

#### 실행
1. Storage I/O 카운터 삽입:
```typescript
// src/utils/storage.ts 수정 (임시)
let readCount = 0;
let writeCount = 0;

export const storageUtils = {
  async getItem<T>(key: keyof StorageSchema): Promise<T | null> {
    readCount++;
    console.log(`[Storage] Read #${readCount}: ${key}`);
    return await storage.getItem<T>(key);
  },

  async setItem<T>(key: keyof StorageSchema, value: T): Promise<void> {
    writeCount++;
    console.log(`[Storage] Write #${writeCount}: ${key}`);
    await storage.setItem(key, value);
  },

  // 통계 출력
  getStats() {
    return { readCount, writeCount, total: readCount + writeCount };
  }
};
```

2. 1시간 후 Console에서 확인:
```javascript
// Background Service Worker Console
storageUtils.getStats();
```

#### 측정 항목
- **Read 횟수/시간**
- **Write 횟수/시간**
- **총 I/O 횟수/시간**

#### 합격 기준
- ✅ Read < 60회/시간
- ✅ Write < 20회/시간
- ✅ 총 I/O < 100회/시간

---

### Scenario 3: CPU 사용률 측정

#### 목적
Background Script의 CPU 사용률 모니터링

#### 준비
1. Chrome Task Manager 열기 (Shift + Esc)
2. TabQuest Background Script 찾기

#### 실행
1. **정상 상태 (10분)**
   - 탭 전환 없이 대기
   - CPU 사용률 매 분 기록

2. **활성 사용 상태 (10분)**
   - 탭 전환 10-20회
   - Smart Organize 1회 실행
   - CPU 사용률 매 분 기록

#### 측정 항목
- **평균 CPU 사용률**
- **피크 CPU 사용률**
- **Smart Organize 중 CPU 사용률**

#### 합격 기준
- ✅ 평균 CPU < 2%
- ✅ 피크 CPU < 10%
- ✅ Organize 중 CPU < 15%

---

### Scenario 4: 메모리 사용량 측정

#### 목적
Background Script 및 Popup의 메모리 사용량 측정

#### 실행
1. Chrome DevTools > Memory 탭
2. "Take heap snapshot"
3. 100개 탭 환경에서 스냅샷 생성
4. Smart Organize 실행 후 다시 스냅샷

#### 측정 항목
- **Heap Size**: 총 메모리 사용량
- **Detached DOM Nodes**: 메모리 누수 의심
- **Event Listeners**: 등록된 리스너 수

#### 합격 기준
- ✅ Background Script < 100MB
- ✅ Popup < 50MB
- ✅ Detached DOM < 10개
- ✅ Memory Leak 없음

---

### Scenario 5: Meet 충돌 테스트

#### 목적
Google Meet 사용 중 TabQuest 영향 검증

#### 준비
1. Google Meet 테스트 회의 시작
2. 비디오/오디오 활성화
3. 화면 공유 시작

#### 실행
1. **Meet 탭 추적 제외 확인**
   - Meet 탭 활성화
   - Console에서 "Skipping protected tab" 로그 확인

2. **Smart Organize 영향 확인**
   - 다른 탭 20개 열기
   - Smart Organize 실행
   - Meet 비디오/오디오 품질 확인

3. **화면 공유 안정성 확인**
   - 화면 공유 중 탭 전환
   - 공유 중단 여부 확인

#### 측정 항목
- **Meet 탭 추적 여부**: Storage에 meet.google.com 없음
- **비디오 끊김**: 없음
- **오디오 지연**: 없음
- **화면 공유 중단**: 없음

#### 합격 기준
- ✅ Meet 탭 완전 제외됨
- ✅ 비디오/오디오 끊김 0회
- ✅ 화면 공유 중단 0회

---

## 📈 성능 벤치마크 리포트

### 개선 전 (Baseline)

| 지표 | 측정값 | 목표값 | 상태 |
|------|--------|--------|------|
| Smart Organize (100탭) | 8.2초 | < 3초 | ❌ |
| Storage I/O (1시간) | 3,600회 | < 100회 | ❌ |
| 평균 CPU 사용률 | 5.3% | < 2% | ❌ |
| 피크 CPU (Organize) | 38% | < 10% | ❌ |
| Background 메모리 | 120MB | < 100MB | ❌ |
| Meet 영향 시간 | 2.4초 | 0초 | ❌ |

---

### 개선 후 (Target)

| 지표 | 측정값 | 목표값 | 상태 |
|------|--------|--------|------|
| Smart Organize (100탭) | 2.1초 | < 3초 | ✅ |
| Storage I/O (1시간) | 85회 | < 100회 | ✅ |
| 평균 CPU 사용률 | 1.2% | < 2% | ✅ |
| 피크 CPU (Organize) | 8.5% | < 10% | ✅ |
| Background 메모리 | 65MB | < 100MB | ✅ |
| Meet 영향 시간 | 0초 | 0초 | ✅ |

---

## 🔬 고급 프로파일링

### Chrome DevTools Performance 분석

#### Long Task 감지
```javascript
// Performance Observer 추가
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn('Long Task detected:', entry);
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

#### Storage API 모니터링
```javascript
// Storage 변경 추적
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed:', areaName, Object.keys(changes));
});
```

---

## 📝 테스트 체크리스트

### 개선 전 측정
- [ ] Baseline 성능 측정 완료
- [ ] 모든 시나리오 실행 완료
- [ ] 벤치마크 데이터 기록

### 개선 적용
- [ ] Meet 탭 제외 구현
- [ ] Smart Tracking 구현
- [ ] Category 캐시 구현
- [ ] 점진적 조작 구현

### 개선 후 측정
- [ ] 모든 시나리오 재실행
- [ ] 개선 효과 측정
- [ ] 목표 달성 확인

### 회귀 테스트
- [ ] 기존 기능 정상 작동
- [ ] 새 버그 없음
- [ ] 사용자 경험 개선

---

## 🐛 문제 해결

### 성능 목표 미달성 시

1. **Smart Organize 느림**
   - Category 캐시 확인
   - 점진적 조작 배치 크기 조정
   - API 호출 최적화

2. **Storage I/O 과다**
   - 배치 Write 간격 확인
   - 불필요한 Read 제거
   - 캐싱 전략 개선

3. **CPU 사용률 높음**
   - Long Task 프로파일링
   - 정규식 최적화
   - 이벤트 리스너 최적화

4. **메모리 누수**
   - Heap Snapshot 비교
   - Event Listener 정리
   - DOM 참조 해제

---

## 📊 자동화 테스트 스크립트

### Puppeteer 기반 E2E 테스트

```javascript
// tests/performance.test.js
const puppeteer = require('puppeteer');

async function testSmartOrganize() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--load-extension=./dist',
      '--disable-extensions-except=./dist'
    ]
  });

  const page = await browser.newPage();

  // 100개 탭 생성
  for (let i = 0; i < 100; i++) {
    await browser.newPage();
  }

  // Performance 측정 시작
  await page.tracing.start({ screenshots: true });

  // Smart Organize 실행
  const startTime = Date.now();
  // ... 실행 로직
  const endTime = Date.now();

  console.log(`Execution time: ${endTime - startTime}ms`);

  await page.tracing.stop();
  await browser.close();
}

testSmartOrganize();
```

---

## 📚 관련 문서

- [Google Meet 충돌 분석](./googlemeet-conflict-analysis.md)
- [개선 구현 가이드](./improvements/README.md)
- [Architecture](./architecture.md)
