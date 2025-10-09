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
    color: chrome.tabGroups.ColorEnum;
    collapsed: boolean;
  }>;
}
