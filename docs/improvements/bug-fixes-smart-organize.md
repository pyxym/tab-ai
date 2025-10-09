# Smart Organize Bug Fixes

## Issues Fixed

### 1. ❌ System Tabs Positioning Issue
**Problem**: System tabs and new tabs were moving to the front instead of staying at the back after Smart Organize.

**Root Cause**:
- System URLs were being skipped with `continue` statement in the loop
- This left them ungrouped in their original positions
- When other tabs got grouped and moved, system tabs appeared to move forward relatively

**Solution**:
```typescript
// Separate system/new tabs that should stay at the end
const systemTabIds: number[] = [];
const organizableTabs = tabs.filter((tab) => {
  if (!tab.url || isSystemUrl(tab.url)) {
    if (tab.id !== undefined) {
      systemTabIds.push(tab.id);
    }
    return false;
  }
  return true;
});

// ... organize regular tabs ...

// 🆕 Move system/new tabs to the end
if (systemTabIds.length > 0) {
  console.log('[TabQuest] Moving system tabs to end:', systemTabIds);
  for (const tabId of systemTabIds) {
    try {
      await chrome.tabs.move(tabId, { index: -1 });
    } catch (error) {
      console.error(`[TabQuest] Failed to move system tab ${tabId}:`, error);
    }
  }
}
```

### 2. ❓ Category Mapping Investigation
**Problem**: User reported that manually assigned categories were being reset to uncategorized after Smart Organize.

**Investigation Status**:
- Added extensive debugging logs to trace category mapping flow
- Category mapping is correctly loaded from storage
- User mappings are checked FIRST before default categorization
- Need user testing with debugging logs to identify exact issue

**Debugging Added**:
```typescript
// Get saved category mappings
const categoryMapping = await storageUtils.getCategoryMapping();
console.log('[TabQuest] Category mapping:', categoryMapping);

// In the loop:
console.log('[TabQuest] Processing domain:', domain);

if (categoryMapping[domain]) {
  categoryId = categoryMapping[domain];
  console.log('[TabQuest] Found user mapping:', domain, '->', categoryId);
}
```

## Files Modified

1. `src/entrypoints/background.ts` (lines 236-362)
   - Separated system tabs from organizable tabs
   - Added explicit system tab repositioning to end
   - Added debugging logs for category mapping
   - Updated tabsProcessed count to reflect only organizable tabs

## Testing Instructions

### For System Tab Positioning:
1. Open several regular tabs and some new tabs / system tabs
2. Click "Smart Organize"
3. Verify system/new tabs are now at the END, not the front

### For Category Mapping Issue:
1. Assign a domain to a category (e.g., bank.com → finance)
2. Click "Smart Organize"
3. Open browser console → Inspect popup
4. Look for these logs:
   ```
   [TabQuest] Category mapping: {...}
   [TabQuest] Processing domain: ...
   [TabQuest] Found user mapping: ... -> ...
   ```
5. Verify the domain stays in assigned category

## Next Steps

- [ ] Test system tab positioning fix
- [ ] Test with debugging logs to confirm category mapping behavior
- [ ] If category mapping issue persists, investigate storage timing or state synchronization

## Related Issues

- Part of Phase 1 긴급 개선 사항 (Critical improvements)
- Refactoring side effects from recent changes
- May be related to organizationComplete insight not showing (separate bug)
