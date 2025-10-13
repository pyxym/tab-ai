# TabQuest 성능 모니터링 가이드

컴퓨터가 뜨거워지거나 느려질 때 TabQuest의 리소스 사용량을 확인하는 방법입니다.

## 🔍 1단계: Chrome 작업 관리자로 확인

### 열기
- **Windows/Linux**: `Shift + Esc`
- **Mac**: `Window` 메뉴 → `작업 관리자`
- **모든 OS**: Chrome 메뉴 (⋮) → `도구 더보기` → `작업 관리자`

### 확인 항목

**"확장 프로그램: TabQuest" 행을 찾아서**:

| 항목 | 정상 범위 | 주의 | 경고 |
|------|----------|------|------|
| **메모리** | 20-50 MB | 50-100 MB | 100+ MB |
| **CPU** | 0-5% (유휴) | 5-15% (활성) | 15%+ (지속) |
| **네트워크** | 0 KB/s | - | 지속적 전송 |

### 스크린샷 예시
```
이름                         메모리    CPU    네트워크
확장 프로그램: TabQuest      35 MB    3.2%    0 KB/s  ← 정상
```

## 📊 2단계: DevTools Performance 프로파일링

### 프로파일 기록하기

1. **TabQuest 사이드 패널 열기**
2. **우클릭** → `검사`
3. **Performance 탭** 선택
4. **Record 버튼** 클릭 🔴
5. **30초 동안 탭 조작** (생성/제거/전환)
6. **Stop 버튼** 클릭 ⏹️

### 분석 포인트

**Main Thread 타임라인 확인**:
- 🟢 **정상**: 대부분 idle (흰색 공백)
- 🟡 **주의**: 가끔 노란색 막대 (scripting)
- 🔴 **문제**: 지속적인 빨간색 막대 (long tasks)

**Call Tree 확인**:
```
Total Time  Self Time  Function
100ms       5ms        loadTabsAndAnalyze
  50ms      10ms       chrome.tabs.query
  30ms      15ms       generateInsights
  20ms      20ms       (idle)
```

**문제 함수 찾기**:
- `Self Time` > 100ms: 최적화 필요
- 반복적인 호출 (5회+ per second): 이벤트 리스너 문제

## 🎯 3단계: 일반적인 성능 문제

### 문제 1: CPU 사용률 높음 (15%+)

**증상**:
- 팬 소음 증가
- 컴퓨터 발열
- 배터리 소모 빠름

**원인**:
- 이벤트 리스너가 너무 자주 실행
- 탭이 너무 많음 (100개+)
- Virtual scrolling 미적용

**해결 방법**:
```javascript
// ❌ 나쁜 예: 필터링 없음
chrome.tabs.onUpdated.addListener(update);

// ✅ 좋은 예: 필터링 적용
chrome.tabs.onUpdated.addListener((id, changeInfo) => {
  if (changeInfo.status === 'complete') {
    update();
  }
});
```

### 문제 2: 메모리 사용량 높음 (100+ MB)

**증상**:
- TabQuest가 느려짐
- Chrome 전체가 느려짐

**원인**:
- 메모리 누수 (cleanup 누락)
- 캐시가 무한정 증가
- Virtual scrolling 미적용

**해결 방법**:
```javascript
// ❌ 나쁜 예: Cleanup 없음
useEffect(() => {
  chrome.tabs.onCreated.addListener(handler);
}, []);

// ✅ 좋은 예: Cleanup 있음
useEffect(() => {
  chrome.tabs.onCreated.addListener(handler);
  return () => {
    chrome.tabs.onCreated.removeListener(handler);
  };
}, []);
```

### 문제 3: 탭 전환이 느림

**증상**:
- 탭 클릭 후 1초+ 지연
- UI가 버벅임

**원인**:
- Debounce 없음
- 동기 Chrome API 호출
- 불필요한 전체 재로드

**해결 방법**:
```javascript
// ❌ 나쁜 예: 즉시 실행
chrome.tabs.onActivated.addListener(() => {
  loadAll(); // 전체 재로드
});

// ✅ 좋은 예: Debounced + 부분 업데이트
chrome.tabs.onActivated.addListener(
  debounce(() => {
    updateActiveTabOnly(); // 필요한 부분만
  }, 300)
);
```

## 🛠️ 4단계: 최적화 체크리스트

### 이벤트 리스너 최적화

- [ ] `tabs.onUpdated`에 필터링 적용했는가?
- [ ] Debounce 적용했는가? (최소 300ms)
- [ ] Cleanup 함수로 리스너 제거했는가?
- [ ] 불필요한 전체 재로드를 피했는가?

### 렌더링 최적화

- [ ] Virtual scrolling 적용했는가? (100+ 아이템)
- [ ] React.memo 사용했는가? (자주 렌더링되는 컴포넌트)
- [ ] useMemo/useCallback 적절히 사용했는가?
- [ ] Key prop을 안정적으로 설정했는가?

### 메모리 최적화

- [ ] useEffect cleanup 함수 작성했는가?
- [ ] 캐시에 크기 제한이 있는가? (LRU)
- [ ] setTimeout/setInterval을 cleanup 했는가?
- [ ] 큰 데이터를 localStorage에 저장하지 않았는가?

## 📈 5단계: 성능 벤치마크

### 권장 성능 목표

**탭 개수별 목표**:

| 탭 개수 | 메모리 | CPU (유휴) | CPU (활성) | 초기 로드 |
|---------|--------|------------|------------|-----------|
| 10개 | 20-30 MB | 0-1% | 2-5% | < 100ms |
| 50개 | 30-40 MB | 0-2% | 3-8% | < 200ms |
| 100개 | 40-60 MB | 0-3% | 5-12% | < 500ms |
| 200개+ | 60-80 MB | 0-5% | 8-15% | < 1000ms |

### 벤치마크 테스트 방법

```javascript
// 콘솔에서 실행
console.time('tab-load');
await chrome.tabs.query({});
console.timeEnd('tab-load');
// 목표: < 50ms (100개 탭 기준)

console.time('full-reload');
await loadTabsAndAnalyze();
console.timeEnd('full-reload');
// 목표: < 500ms (100개 탭 기준)
```

## 🚨 6단계: 긴급 대응

### 즉각적인 개선 방법

**1. Chrome 작업 관리자에서 TabQuest 종료**:
- TabQuest 행 선택 → `프로세스 종료` 버튼

**2. 확장 프로그램 임시 비활성화**:
- `chrome://extensions/`
- TabQuest 토글 OFF

**3. 탭 개수 줄이기**:
- 불필요한 탭 닫기
- 북마크로 저장 후 닫기
- 다른 창으로 분산

**4. Chrome 재시작**:
- Chrome 완전 종료
- 메모리 정리 후 재시작

## 🔧 개발자용: 성능 디버깅

### Performance Monitor 활성화

```typescript
// src/utils/performanceMonitor.ts 사용
import { startPerformanceTrace, stopPerformanceTrace } from '../utils/performanceMonitor';

startPerformanceTrace('expensive-operation');
// ... 코드 실행 ...
stopPerformanceTrace('expensive-operation');
// → 콘솔에 실행 시간 출력
```

### Chrome DevTools Layers

1. DevTools → `More tools` → `Layers`
2. 레이어 수 확인 (많을수록 성능 저하)
3. 목표: < 50 레이어

### React DevTools Profiler

1. React DevTools 설치
2. `Profiler` 탭
3. 🔴 Record
4. 탭 조작
5. ⏹️ Stop
6. 렌더링 시간 분석
   - 목표: 대부분 < 16ms (60 FPS)

## 📝 성능 이슈 리포트 작성

성능 문제를 발견했다면 다음 정보와 함께 리포트해주세요:

```markdown
### 환경
- Chrome 버전:
- OS:
- TabQuest 버전:
- 열린 탭 개수:

### 증상
- [ ] CPU 사용률 높음 (%)
- [ ] 메모리 사용량 높음 (MB)
- [ ] UI 버벅임
- [ ] 기타:

### Chrome 작업 관리자 스크린샷
(첨부)

### DevTools Performance 프로파일
(Export → 첨부)

### 재현 방법
1.
2.
3.
```

## 🎯 결론

**정상 상태 체크리스트**:
- ✅ CPU: 유휴 시 0-5%, 활성 시 5-15%
- ✅ 메모리: 20-80MB (탭 개수에 따라)
- ✅ 네트워크: 거의 0 (이벤트 기반)
- ✅ 팬 소음 없음
- ✅ UI 부드러움 (60 FPS)

문제가 지속되면 GitHub Issues에 리포트해주세요!
