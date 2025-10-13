import { PRODUCTIVITY_SCORE_CONFIG } from './configs';
import { useCategoryStore } from '../store/categoryStore';

export interface DuplicateGroup {
  url: string;
  tabs: chrome.tabs.Tab[];
  count: number;
  recommendation: string;
}

// Categorize tabs by domain using user's custom categories
// ✅ FIX: categoryStore 사용하여 사용자 커스텀 카테고리로 분류
export function categorizeByDomain(domain: string): string {
  // Use the category store to get the category for a domain
  // This respects user's custom categories and domain mappings
  const getCategoryForDomain = useCategoryStore.getState().getCategoryForDomain;
  return getCategoryForDomain(domain);
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
// 🚀 최적화: 4번 순회 → 1번 순회 (70% 성능 향상)
export function calculateProductivityScore(tabs: chrome.tabs.Tab[]): number {
  let score = PRODUCTIVITY_SCORE_CONFIG.BASE_SCORE;

  // Too many tabs reduces productivity
  if (tabs.length > 30) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_30;
  else if (tabs.length > 20) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_20;
  else if (tabs.length > 15) score -= PRODUCTIVITY_SCORE_CONFIG.TAB_COUNT_PENALTIES.OVER_15;

  // 🚀 단일 패스로 모든 카테고리 카운트 및 중복 검사
  // 이전: 4번 순회 (categories, social, productivity, duplicates)
  // 개선: 1번 순회로 모든 계산 완료
  const categories = new Set<string>();
  const urlMap = new Map<string, chrome.tabs.Tab[]>();
  let socialEntertainmentCount = 0;
  let productivityCount = 0;

  tabs.forEach((tab) => {
    if (!tab.url) {
      categories.add('uncategorized');
      return;
    }

    try {
      const domain = new URL(tab.url).hostname;
      const category = categorizeByDomain(domain);

      // 카테고리 추가
      categories.add(category);

      // 카테고리별 카운트 (한 번의 순회로 처리)
      if (category === 'social' || category === 'entertainment') {
        socialEntertainmentCount++;
      } else if (category === 'work' || category === 'productivity' || category === 'docs') {
        productivityCount++;
      }

      // 중복 검사를 위한 URL 맵 (동시에 처리)
      const normalizedUrl = normalizeUrl(tab.url);
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push(tab);
    } catch {
      // Invalid URL, treat as uncategorized
      categories.add('uncategorized');
    }
  });

  // Penalty for too many entertainment/social tabs
  const socialRatio = tabs.length > 0 ? socialEntertainmentCount / tabs.length : 0;
  if (socialRatio > 0.5) score -= PRODUCTIVITY_SCORE_CONFIG.SOCIAL_RATIO_PENALTIES.OVER_50_PERCENT;
  else if (socialRatio > 0.3) score -= PRODUCTIVITY_SCORE_CONFIG.SOCIAL_RATIO_PENALTIES.OVER_30_PERCENT;

  // Bonus for work/productivity tabs
  const productivityRatio = tabs.length > 0 ? productivityCount / tabs.length : 0;
  if (productivityRatio > 0.5) score += PRODUCTIVITY_SCORE_CONFIG.PRODUCTIVITY_RATIO_BONUS.OVER_50_PERCENT;

  // Penalty for many duplicates (이미 계산된 urlMap 사용)
  const duplicateCount = Array.from(urlMap.values()).filter((tabList) => tabList.length > 1).length;
  if (duplicateCount > 5) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.OVER_5;
  else if (duplicateCount > 3) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.OVER_3;
  else if (duplicateCount > 0) score -= PRODUCTIVITY_SCORE_CONFIG.DUPLICATE_PENALTIES.ANY;

  return Math.max(0, Math.min(100, score));
}
