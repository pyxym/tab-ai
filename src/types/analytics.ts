/**
 * Analytics and Dashboard related type definitions
 */

/**
 * 탭 데이터 타입
 * 개별 탭의 사용 통계 정보
 */
export interface TabData {
  id: number; // 탭 ID
  url: string; // 탭 URL
  title: string; // 탭 제목
  domain: string; // 도메인
  category: string; // 카테고리
  lastAccessed: number; // 마지막 접근 시간
  accessCount: number; // 접근 횟수
  totalTimeSpent?: number; // 총 사용 시간 (선택적)
}
