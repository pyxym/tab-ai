/**
 * Storage 관련 타입 정의
 */

/**
 * 탭 사용 데이터
 */
export interface TabUsageData {
  url?: string; // 탭 URL
  domain: string; // 도메인
  title?: string; // 탭 제목
  category?: string; // 카테고리
  firstSeen?: number; // 처음 본 시간
  lastAccessed: number; // 마지막 접근 시간
  timeSpent: number; // 현재 세션 사용 시간
  totalTimeSpent: number; // 총 누적 사용 시간
  accessCount: number; // 접근 횟수
  activations: number; // 활성화 횟수
}

/**
 * 일별 통계 데이터
 */
export interface DailyStats {
  date: string;
  tabsOpened: number;
  tabsClosed: number;
  tabsOrganized: number;
  activeTime: number;
  productivityScore: number;
  totalTabs?: number;
  totalTimeSpent?: number;
  categoryBreakdown?: Record<string, number>;
  domainBreakdown?: Record<string, number>;
  topDomains: Array<{
    domain: string;
    count: number;
    timeSpent: number;
  }>;
}

/**
 * 사용자 패턴 데이터
 */
export interface UserPattern {
  domain: string;
  category: string;
  confidence: number;
  lastUpdated: number;
  frequency: number;
}

/**
 * 카테고리 히스토리
 */
export interface CategoryHistory {
  categoryId: string;
  action: 'created' | 'updated' | 'deleted' | 'assigned';
  timestamp: number;
  details?: {
    domain?: string;
    tabCount?: number;
    previousCategory?: string;
  };
}

/**
 * 탭 데이터
 */
export interface TabData {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  categoryId?: string;
  lastAccessed: number;
  accessCount: number;
  timeSpent: number;
}
