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

/**
 * 탭 사용 추적 설정
 */
export const TAB_TRACKING_CONFIG = {
  /** 활성 탭으로 간주할 최소 시간 (밀리초) - 30초 이상만 추적 */
  MIN_ACTIVE_TIME: 30000,
  /** 추적 데이터 정리 주기 (일) */
  CLEANUP_DAYS: 30,
  /** 통계 업데이트 간격 (밀리초) */
  STATS_UPDATE_INTERVAL: 60000, // 1분
  /** Debounce 대기 시간 (밀리초) - 짧은 시간 내 중복 저장 방지 */
  DEBOUNCE_DELAY: 3000, // 3초
  /** 알람 주기 (분) - chrome.alarms API용 */
  ALARM_PERIOD_MINUTES: 1, // 1분
} as const;

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

/**
 * 도메인별 카테고리 분류 설정
 * 탭 자동 분류 및 생산성 점수 계산에 사용
 * DEFAULT_CATEGORIES (category.ts)와 동기화되어야 함
 */
export const DOMAIN_CATEGORIES = {
  /** 업무 관련 도메인 */
  work: ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'localhost', 'vercel.app', 'netlify.app', 'jira.atlassian.com', 'slack.com', 'notion.so', 'figma.com', 'linear.app'],
  /** 소셜 미디어 도메인 */
  social: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'discord.com', 'telegram.org', 'whatsapp.com', 'threads.net', 'mastodon.social'],
  /** 엔터테인먼트 도메인 */
  entertainment: ['youtube.com', 'netflix.com', 'twitch.tv', 'spotify.com', 'soundcloud.com', 'vimeo.com', 'hulu.com', 'disneyplus.com', 'primevideo.com', 'hbomax.com'],
  /** 쇼핑 도메인 */
  shopping: ['amazon.com', 'ebay.com', 'aliexpress.com', 'etsy.com', 'walmart.com', 'target.com', 'bestbuy.com', 'shopify.com', 'wish.com', 'ikea.com'],
  /** 뉴스 및 미디어 도메인 */
  news: ['cnn.com', 'bbc.com', 'reddit.com', 'hackernews.com', 'nytimes.com', 'reuters.com', 'bloomberg.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com', 'medium.com'],
  /** 교육 도메인 */
  education: ['coursera.org', 'udemy.com', 'khanacademy.org', 'edx.org', 'udacity.com', 'pluralsight.com', 'wikipedia.org', 'skillshare.com', 'masterclass.com', 'duolingo.com'],
  /** 금융 도메인 */
  finance: ['bankofamerica.com', 'chase.com', 'paypal.com', 'coinbase.com', 'robinhood.com', 'mint.com', 'personalcapital.com', 'binance.com', 'kraken.com', 'wise.com'],
  /** 생산성 도구 도메인 */
  productivity: ['google.com', 'outlook.com', 'gmail.com', 'calendar.google.com', 'trello.com', 'asana.com', 'todoist.com', 'evernote.com', 'monday.com', 'clickup.com'],
  /** 리서치 및 학술 도메인 */
  research: ['scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'jstor.org', 'researchgate.net', 'academia.edu', 'sciencedirect.com'],
  /** AI 및 도구 도메인 */
  ai: ['openai.com', 'anthropic.com', 'claude.ai', 'chatgpt.com', 'chat.openai.com', 'gemini.google.com', 'bard.google.com', 'huggingface.co', 'midjourney.com', 'stability.ai', 'cohere.com'],
  /** 게임 도메인 */
  gaming: ['steam.com', 'epicgames.com', 'gog.com', 'itch.io', 'playstation.com', 'xbox.com', 'nintendo.com', 'riotgames.com', 'blizzard.com', 'ea.com'],
  /** 건강 및 피트니스 도메인 */
  health: ['fitbit.com', 'myfitnesspal.com', 'webmd.com', 'healthline.com', 'mayoclinic.org', 'nih.gov', 'strava.com', 'peloton.com'],
  /** 여행 도메인 */
  travel: ['booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com', 'kayak.com', 'hotels.com', 'skyscanner.com', 'lonelyplanet.com'],
  /** 음식 및 배달 도메인 */
  food: ['ubereats.com', 'doordash.com', 'grubhub.com', 'deliveroo.com', 'yelp.com', 'zomato.com', 'foodpanda.com', 'seamless.com'],
  /** 레퍼런스 및 문서 도메인 */
  reference: ['stackoverflow.com', 'github.com', 'developer.mozilla.org', 'w3schools.com', 'devdocs.io', 'docs.python.org', 'react.dev', 'nodejs.org'],
} as const;

/**
 * 키워드 기반 카테고리 분류 설정
 * 도메인 매칭 실패 시 키워드로 추가 분류
 * DEFAULT_CATEGORIES의 keywords 필드와 동기화되어야 함
 */
export const KEYWORD_CATEGORIES = {
  work: ['dev', 'code', 'api', 'project', 'design', 'task', 'deploy'],
  social: ['social', 'chat', 'message', 'post', 'community'],
  entertainment: ['video', 'watch', 'stream', 'music', 'movie', 'show', 'podcast'],
  shopping: ['shop', 'store', 'buy', 'cart', 'order', 'deal', 'product'],
  news: ['news', 'blog', 'article', 'media', 'press', 'tech'],
  education: ['learn', 'course', 'study', 'education', 'tutorial', 'training', 'class'],
  finance: ['bank', 'finance', 'money', 'payment', 'invest', 'crypto', 'trading'],
  productivity: ['email', 'calendar', 'task', 'todo', 'note', 'organize', 'plan'],
  research: ['research', 'paper', 'academic', 'study', 'journal', 'science'],
  ai: ['ai', 'chatbot', 'assistant', 'gpt', 'claude', 'gemini', 'llm', 'ml', 'artificial'],
  gaming: ['game', 'gaming', 'play', 'steam', 'esports', 'gamer', 'console'],
  health: ['health', 'fitness', 'medical', 'workout', 'exercise', 'nutrition', 'wellness'],
  travel: ['travel', 'hotel', 'flight', 'booking', 'trip', 'vacation', 'tourism'],
  food: ['food', 'restaurant', 'delivery', 'recipe', 'cooking', 'dining', 'meal'],
  reference: ['documentation', 'reference', 'docs', 'manual', 'guide', 'api', 'spec'],
} as const;
