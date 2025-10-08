// Direct tab organization without background script
import { storageUtils } from './storage';
import { isSystemUrl } from './tabFilters';
import { COLOR_TO_CHROME_GROUP, type Category } from '../types/category';

export async function organizeTabsDirectly(categories: Category[]) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // First, ungroup all tabs
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // Some tabs already ungrouped
      }
    }

    // Get saved category mappings
    const categoryMapping = await storageUtils.getCategoryMapping();

    // Group tabs by category
    const categoryGroups = new Map<string, number[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      // Default to uncategorized
      let categoryId = 'uncategorized';

      // Skip system URLs (chrome://, edge://, etc.)
      if (isSystemUrl(tab.url)) {
        // These system URLs will remain ungrouped
        continue;
      }

      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');

        // First check if user has assigned a category to this specific domain
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
        console.error(`[TabQuest Direct] Error parsing URL: ${tab.url}`);
        // For invalid URLs, treat as uncategorized
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
        await chrome.tabGroups.update(groupId, {
          title: category.name,
          color: COLOR_TO_CHROME_GROUP[category.color],
          collapsed: false,
        });

        // Move group to maintain order
        await chrome.tabGroups.move(groupId, { index: -1 });

        groupsCreated++;
      } catch (error) {
        console.error(`[TabQuest Direct] Failed to create group for ${category.name}:`, error);
      }
    }

    const message = groupsCreated > 0 ? `Successfully organized tabs into ${groupsCreated} category groups` : 'No groups created';

    return {
      success: true,
      message,
      groupsCreated,
      tabsProcessed: tabs.length,
    };
  } catch (error) {
    console.error('[TabQuest Direct] Organization failed:', error);
    throw error;
  }
}

// Simple domain-based organization
export async function organizeTabsByDomain() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // First, ungroup all tabs
    const allTabIds = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

    if (allTabIds.length > 0) {
      try {
        await chrome.tabs.ungroup(allTabIds);
      } catch (e) {
        // Ignore errors
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
        console.error(`[TabQuest Direct] Error parsing URL: ${tab.url}`);
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
          await chrome.tabGroups.update(groupId, {
            title: domain,
            color: colors[colorIndex % colors.length],
            collapsed: false,
          });
          groupsCreated++;
          colorIndex++;
        } catch (error) {
          console.error(`[TabQuest Direct] Failed to create group for ${domain}:`, error);
        }
      }
    }

    return {
      success: true,
      message: `Created ${groupsCreated} groups`,
      groupsCreated,
      tabsProcessed: tabs.length,
    };
  } catch (error) {
    console.error('[TabQuest Direct] Domain organization failed:', error);
    throw error;
  }
}
