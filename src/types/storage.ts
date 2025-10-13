/**
 * Storage 관련 타입 정의
 */

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
