/**
 * TabQuest 애플리케이션 설정 및 상수
 * 보호된 URL, 도메인 등 중앙 집중식 설정 관리
 */

/**
 * 보호할 시스템 URL 프리픽스 목록
 * 브라우저 내부 페이지 및 확장 프로그램 페이지
 */
export const PROTECTED_SYSTEM_PREFIXES = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'view-source:'] as const;

/**
 * TabQuest 작업에서 제외할 보호된 도메인 목록
 * 화상회의, 온라인 편집기 등 중요한 서비스 포함
 */
export const PROTECTED_DOMAINS = [
  // 화상회의 서비스
  'meet.google.com',
  'zoom.us',
  'teams.microsoft.com',
  'webex.com',
  'whereby.com',
  'jitsi.org',
  'discord.com',
] as const;

/**
 * 새 탭으로 인식할 정확한 URL 목록
 * 중복 탭 감지 시 모두 동일한 탭으로 처리
 */
export const NEW_TAB_EXACT_URLS = ['chrome://newtab/', 'edge://newtab/', 'about:blank', 'about:newtab'] as const;

/**
 * 새 탭으로 인식할 URL 프리픽스 목록
 * startsWith로 체크하여 변형된 새 탭 URL도 감지
 */
export const NEW_TAB_URL_PREFIXES = ['chrome://newtab', 'edge://newtab'] as const;

// ✅ REMOVED: TAB_TRACKING_CONFIG
// TabTracker 시스템이 제거되어 더 이상 필요하지 않습니다.

/**
 * 탭 정리 설정
 */
export const TAB_ORGANIZATION_CONFIG = {
  /** 중복 탭으로 간주할 최소 개수 */
  MIN_DUPLICATES: 2,
  /** 자동 정리 활성화 여부 */
  AUTO_ORGANIZE_ENABLED: false,
  /** 스마트 그룹핑 임계값 */
  SMART_GROUPING_THRESHOLD: 3,
} as const;

/**
 * 생산성 점수 계산 설정
 */
export const PRODUCTIVITY_SCORE_CONFIG = {
  /** 기본 점수 */
  BASE_SCORE: 100,
  /** 탭 개수별 페널티 */
  TAB_COUNT_PENALTIES: {
    OVER_30: 20,
    OVER_20: 10,
    OVER_15: 5,
  },
  /** 소셜/엔터테인먼트 비율별 페널티 */
  SOCIAL_RATIO_PENALTIES: {
    OVER_50_PERCENT: 20,
    OVER_30_PERCENT: 10,
  },
  /** 생산성 탭 비율별 보너스 */
  PRODUCTIVITY_RATIO_BONUS: {
    OVER_50_PERCENT: 10,
  },
  /** 중복 탭별 페널티 */
  DUPLICATE_PENALTIES: {
    OVER_5: 15,
    OVER_3: 10,
    ANY: 5,
  },
} as const;

/**
 * 탭 중요도 계산 설정
 */
export const TAB_IMPORTANCE_CONFIG = {
  /** 기본 점수 */
  BASE_SCORE: 50,
  /** 활성 탭 보너스 */
  ACTIVE_BONUS: 20,
  /** 고정 탭 보너스 */
  PINNED_BONUS: 30,
  /** 오디오 재생 중 보너스 */
  AUDIBLE_BONUS: 10,
  /** 최대 점수 */
  MAX_SCORE: 100,
} as const;

/**
 * 메모리 사용량 추정 설정 (MB)
 */
export const MEMORY_ESTIMATE_CONFIG = {
  /** 기본 메모리 사용량 */
  BASE_MEMORY: 50,
  /** 미디어 사이트 메모리 사용량 */
  MEDIA_SITE_MEMORY: 150,
  /** 무거운 사이트별 메모리 사용량 */
  HEAVY_SITES: {
    'youtube.com': 200,
    'netflix.com': 250,
    'facebook.com': 180,
    'gmail.com': 150,
    'docs.google.com': 120,
    'twitter.com': 100,
    'discord.com': 180,
  },
} as const;

// ✅ REMOVED: DOMAIN_CATEGORIES and KEYWORD_CATEGORIES
// 이제 모든 카테고리는 사용자가 직접 관리합니다 (categoryStore)
// 사전 정의된 카테고리는 사용자 커스텀 카테고리와 충돌을 일으키므로 제거되었습니다.
