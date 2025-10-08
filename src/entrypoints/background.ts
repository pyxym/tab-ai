import { defineBackground } from 'wxt/utils/define-background';
import { storageUtils } from '../utils/storage';
import { filterProtectedTabs, getProtectedTabStats, isSystemUrl, isNewTabUrl } from '../utils/tabFilters';
import { TabTracker } from '../utils/tabTracker';
import { DOMAIN_CATEGORIES } from '../utils/configs';
import { categorizeByDomain } from '../utils/tabAnalyzer';
import { COLOR_TO_CHROME_GROUP, type Category } from '../types/category';

export default defineBackground(() => {
  // Initialize tab tracking
  TabTracker.initialize().catch((error) => {
    console.error('[TabQuest] Failed to initialize tab tracking:', error);
  });

  // Clean up old data daily
  setInterval(
    () => {
      TabTracker.cleanupOldData();
    },
    24 * 60 * 60 * 1000,
  ); // Once per day

  // Message handler for tab organization
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ success: true, message: 'pong' });
      return true;
    }

    if (request.action === 'smartOrganize' || request.action === 'aiOrganize') {
      organizeTabsSimple()
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ success: false, message: error.message });
        });
      return true;
    }

    if (request.action === 'getTabsAnalysis') {
      getTabsAnalysis()
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ error: error.message });
        });
      return true;
    }

    if (request.action === 'organizeByCategories') {
      if (!request.categories) {
        sendResponse({ success: false, message: 'No categories provided' });
        return false;
      }
      organizeTabsByCategories(request.categories)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({ success: false, message: error.message });
        });
      return true;
    }

    return false;
  });
});

// Simple tab organization function
async function organizeTabsSimple() {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 Filter out protected tabs (Meet, Zoom, etc.)
    const tabs = filterProtectedTabs(allTabs);

    // Ungroup all tabs first
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // Some tabs were already ungrouped
      }
    }

    // Group tabs by domain
    const domainGroups = new Map<string, number[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // Skip system URLs
      if (isSystemUrl(tab.url)) {
        continue;
      }

      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace(/^www\./, '');

        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain)!.push(tab.id);
      } catch (error) {
        console.error(`[TabQuest] Error parsing URL: ${tab.url}`);
      }
    }

    // Create groups for domains with 2+ tabs
    let groupsCreated = 0;
    const colors: chrome.tabGroups.ColorEnum[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    let colorIndex = 0;

    for (const [domain, tabIds] of domainGroups) {
      if (tabIds.length >= 2) {
        try {
          const groupId = await chrome.tabs.group({ tabIds });
          const abbreviation = domain.split('.')[0].toUpperCase().slice(0, 3);

          await chrome.tabGroups.update(groupId, {
            title: abbreviation,
            color: colors[colorIndex % colors.length],
            collapsed: false,
          });
          groupsCreated++;
          colorIndex++;
        } catch (error) {
          console.error(`[TabQuest] Failed to create group for ${domain}:`, error);
        }
      }
    }

    return {
      success: true,
      message:
        groupsCreated > 0
          ? `Successfully organized ${tabs.length} tabs into ${groupsCreated} groups`
          : 'No groups created (need at least 2 tabs from the same domain)',
      groupsCreated,
      tabsProcessed: tabs.length,
    };
  } catch (error) {
    console.error('[TabQuest] Organization failed:', error);
    throw error;
  }
}

// Get tabs analysis
async function getTabsAnalysis() {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 Filter out protected tabs from analysis
    const tabs = filterProtectedTabs(allTabs);

    // Count by domain
    const domainCounts: Record<string, number> = {};
    // Initialize categoryCounts with all available categories
    const categoryCounts: Record<string, number> = {};
    Object.keys(DOMAIN_CATEGORIES).forEach((category) => {
      categoryCounts[category] = 0;
    });
    categoryCounts.uncategorized = 0;

    for (const tab of tabs) {
      if (!tab.url) continue;

      // Skip all system URLs (including newtabs)
      if (isSystemUrl(tab.url)) {
        continue;
      }

      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace(/^www\./, '');
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;

        // Use categorizeByDomain from tabAnalyzer for consistent categorization
        const category = categorizeByDomain(domain);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      } catch (e) {
        // Skip invalid URLs
      }
    }

    // Find duplicates (include ALL tabs including system tabs for duplicate detection)
    const urlCounts: Record<string, chrome.tabs.Tab[]> = {};

    for (const tab of allTabs) {
      if (!tab.url) continue;

      let normalizedUrl: string;

      // 모든 새 탭을 동일하게 처리
      if (isNewTabUrl(tab.url)) {
        normalizedUrl = '__newtab__';
      } else if (isSystemUrl(tab.url)) {
        // System URLs are normalized by their full URL
        normalizedUrl = tab.url.replace(/\/$/, '');
      } else {
        normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
      }

      if (!urlCounts[normalizedUrl]) {
        urlCounts[normalizedUrl] = [];
      }
      urlCounts[normalizedUrl].push(tab);
    }

    // Convert to duplicates array
    const duplicates = Object.entries(urlCounts)
      .filter(([_, tabs]) => tabs.length > 1)
      .map(([url, tabs]) => ({
        domain: url === '__newtab__' ? 'New Tab' : new URL(tabs[0].url!).hostname,
        count: tabs.length,
        tabs,
      }));

    // Count actual tab groups in current window
    const groups = await chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    const groupCount = groups.length;

    return {
      totalTabs: tabs.length,
      domainCounts,
      categoryCounts,
      duplicates,
      groupCount, // Add actual tab group count
    };
  } catch (error) {
    console.error('[TabQuest] Analysis failed:', error);
    throw error;
  }
}

// Organize tabs by categories
async function organizeTabsByCategories(categories: Category[]) {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 Filter out protected tabs and get stats
    const tabs = filterProtectedTabs(allTabs);
    const protectedStats = getProtectedTabStats(allTabs);

    // Ungroup all tabs first
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // Some tabs were already ungrouped
      }
    }

    // Get saved category mappings
    const categoryMapping = await storageUtils.getCategoryMapping();

    // Group tabs by category
    const categoryGroups = new Map<string, number[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      let categoryId = 'uncategorized';

      // Skip system URLs
      if (isSystemUrl(tab.url)) {
        continue;
      }

      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');

        // Check user mappings first
        if (categoryMapping[domain]) {
          categoryId = categoryMapping[domain];
        } else {
          // Then check category domains
          for (const category of categories) {
            if (
              category.domains.some((d: string) => {
                const catDomain = d.toLowerCase();
                return domain === catDomain || domain.endsWith(`.${catDomain}`);
              })
            ) {
              categoryId = category.id;
              break;
            }
          }
        }
      } catch (error) {
        categoryId = 'uncategorized';
      }

      if (!categoryGroups.has(categoryId)) {
        categoryGroups.set(categoryId, []);
      }
      categoryGroups.get(categoryId)!.push(tab.id);
    }

    // Create groups in category order
    let groupsCreated = 0;
    for (const category of categories) {
      const tabIds = categoryGroups.get(category.id);
      if (!tabIds || tabIds.length === 0) continue;

      try {
        const groupId = await chrome.tabs.group({ tabIds });
        const abbreviation = category.name
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('')
          .slice(0, 3);

        await chrome.tabGroups.update(groupId, {
          title: abbreviation,
          color: COLOR_TO_CHROME_GROUP[category.color],
          collapsed: false,
        });

        await chrome.tabGroups.move(groupId, { index: -1 });

        groupsCreated++;
      } catch (error) {
        console.error(`[TabQuest] Failed to create group for ${category.name}:`, error);
      }
    }

    return {
      success: true,
      message: groupsCreated > 0 ? `Successfully organized tabs into ${groupsCreated} category groups` : 'No groups created',
      groupsCreated,
      tabsProcessed: tabs.length,
      protectedStats, // 🆕 상세 통계 추가
    };
  } catch (error) {
    console.error('[TabQuest] Category organization failed:', error);
    throw error;
  }
}
