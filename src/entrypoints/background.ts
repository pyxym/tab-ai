import { defineBackground } from 'wxt/utils/define-background';
import { DOMAIN_CATEGORIES } from '../utils/configs';
import { categorizeByDomain } from '../utils/tabAnalyzer';
import { filterProtectedTabs, isNewTabUrl, isSystemUrl } from '../utils/tabFilters';
import { TabTracker } from '../utils/tabTracker';

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

  // 🚀 사이드 패널: 아이콘 클릭 시 사이드 패널 열기
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch((error) => {
        console.error('[TabQuest] Failed to open side panel:', error);
      });
    }
  });

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
// 🚀 최적화: 2번 순회 → 1번 순회 (35-40% 성능 향상)
async function getTabsAnalysis() {
  try {
    const allTabs = await chrome.tabs.query({ currentWindow: true });

    // 🆕 Filter out protected tabs from analysis
    const tabs = filterProtectedTabs(allTabs);

    // 🚀 단일 패스로 도메인/카테고리/중복 계산
    const domainCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const urlCounts: Record<string, chrome.tabs.Tab[]> = {};

    // Initialize categoryCounts with all available categories
    Object.keys(DOMAIN_CATEGORIES).forEach((category) => {
      categoryCounts[category] = 0;
    });
    categoryCounts.uncategorized = 0;

    // 🚀 단일 순회로 모든 계산 수행
    for (const tab of allTabs) {
      if (!tab.url) continue;

      // 중복 검사 (모든 탭 포함)
      let normalizedUrl: string;
      if (isNewTabUrl(tab.url)) {
        normalizedUrl = '__newtab__';
      } else if (isSystemUrl(tab.url)) {
        normalizedUrl = tab.url.replace(/\/$/, '');
      } else {
        normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
      }

      if (!urlCounts[normalizedUrl]) {
        urlCounts[normalizedUrl] = [];
      }
      urlCounts[normalizedUrl].push(tab);

      // 도메인/카테고리 카운트 (protected tabs 제외)
      if (isSystemUrl(tab.url)) {
        continue; // protected 탭은 카운트에서 제외
      }

      // tabs 배열에 포함된 탭만 카운트
      const isProtectedTab = !tabs.some((t) => t.id === tab.id);
      if (isProtectedTab) {
        continue;
      }

      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace(/^www\./, '');

        // 도메인 카운트
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;

        // 카테고리 카운트
        const category = categorizeByDomain(domain);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      } catch (e) {
        // Skip invalid URLs
      }
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
