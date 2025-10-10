import { DOMAIN_CATEGORIES, KEYWORD_CATEGORIES, PRODUCTIVITY_SCORE_CONFIG } from './configs';

export interface DuplicateGroup {
  url: string;
  tabs: chrome.tabs.Tab[];
  count: number;
  recommendation: string;
}

// Categorize tabs by domain
export function categorizeByDomain(domain: string): string {
  // 도메인 기반 카테고리 매칭
  for (const [category, domains] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domains.some((d) => domain.includes(d))) {
      return category;
    }
  }

  // 키워드 기반 추가 카테고리 매칭
  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.some((keyword) => domain.includes(keyword))) {
      return category;
    }
  }

  return 'uncategorized';
}

// Find duplicate tabs
export function findDuplicates(tabs: chrome.tabs.Tab[]): DuplicateGroup[] {
  const urlMap = new Map<string, chrome.tabs.Tab[]>();
  const duplicates: DuplicateGroup[] = [];

  // Group tabs by normalized URL
  tabs.forEach((tab) => {
    if (tab.url) {
      // Normalize URL (remove trailing slash, fragments, and common tracking params)
      const normalizedUrl = normalizeUrl(tab.url);

      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(tab);
    }
  });

  // Create duplicate groups
  urlMap.forEach((tabList, url) => {
    if (tabList.length > 1) {
      duplicates.push({
        url,
        tabs: tabList,
        count: tabList.length,
        recommendation: generateDuplicateRecommendation(tabList),
      });
    }
  });

  return duplicates;
}

// Normalize URL for duplicate detection
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => urlObj.searchParams.delete(param));

    // Remove fragment
    urlObj.hash = '';

    // Remove trailing slash
    let normalized = urlObj.toString().replace(/\/$/, '');

    // Remove www subdomain for comparison
    normalized = normalized.replace('://www.', '://');

    return normalized;
  } catch {
    return url;
  }
}

// Generate recommendation for duplicate tabs
function generateDuplicateRecommendation(tabs: chrome.tabs.Tab[]): string {
  // Find the most recently accessed or active tab
  const activeTab = tabs.find((t) => t.active);
  const pinnedTab = tabs.find((t) => t.pinned);

  if (pinnedTab && !activeTab) {
    return `Keep the pinned tab and close ${tabs.length - 1} duplicates`;
  }

  if (activeTab) {
    return `Keep the active tab and close ${tabs.length - 1} duplicates`;
  }

  return `Close ${tabs.length - 1} duplicate tabs`;
}

// Calculate productivity score based on tabs
export function calculateProductivityScore(tabs: chrome.tabs.Tab[]): number {
  let score = PRODUCTIVITY_SCORE_CONFIG.BASE_SCORE;

  // Too many tabs reduces productivity
  if (tabs.length > 30) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_30;
  else if (tabs.length > 20) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_20;
  else if (tabs.length > 15) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_15;

  // Count categories
  const categories = new Set(
    tabs.map((tab) => {
      if (tab.url) {
        const domain = new URL(tab.url).hostname;
        return categorizeByDomain(domain);
      }
      return 'uncategorized';
    }),
  );

  // Penalty for too many entertainment/social tabs
  const socialEntertainmentCount = tabs.filter((tab) => {
    if (tab.url) {
      const domain = new URL(tab.url).hostname;
      const category = categorizeByDomain(domain);
      return category === 'social' || category === 'entertainment';
    }
    return false;
  }).length;

  const socialRatio = socialEntertainmentCount / tabs.length;
  if (socialRatio > 0.5) score -= PRODUCTIVITY_SCORE_CONFIG.SOCIAL_RATIO_PENALTIES.OVER_50_PERCENT;
  else if (socialRatio > 0.3) score -= PRODUCTIVITY_SCORE_CONFIG.SOCIAL_RATIO_PENALTIES.OVER_30_PERCENT;

  // Bonus for work/productivity tabs
  const productivityCount = tabs.filter((tab) => {
    if (tab.url) {
      const domain = new URL(tab.url).hostname;
      const category = categorizeByDomain(domain);
      return category === 'work' || category === 'productivity' || category === 'docs';
    }
    return false;
  }).length;

  const productivityRatio = productivityCount / tabs.length;
  if (productivityRatio > 0.5) score += PRODUCTIVITY_SCORE_CONFIG.PRODUCTIVITY_RATIO_BONUS.OVER_50_PERCENT;

  // Penalty for many duplicates
  const duplicates = findDuplicates(tabs);
  if (duplicates.length > 5) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.OVER_5;
  else if (duplicates.length > 3) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.OVER_3;
  else if (duplicates.length > 0) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.ANY;

  return Math.max(0, Math.min(100, score));
}
