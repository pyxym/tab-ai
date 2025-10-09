/**
 * Storage 관련 타입 정의
 */

/**
 * 탭 사용 데이터
 */
export interface TabUsageData {
  lastAccessed: number;
  accessCount: number;
  timeSpent: number;
  domain: string;
  title?: string;
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