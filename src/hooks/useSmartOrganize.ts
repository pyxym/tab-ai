import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIStore } from '../store/aiStore';
import { categorySelectors, useCategoryStore } from '../store/categoryStore';
import { createSnapshot, saveSnapshot } from '../utils/undoManager';
import { organizeTabsUnified } from '../utils/unifiedOrganizer';

/**
 * Custom hook for smart tab organization
 * Handles organization logic and state management
 */
export function useSmartOrganize() {
  const { t } = useTranslation();

  // 최적화된 선택자 사용
  const categories = useCategoryStore(categorySelectors.categories);
  const addInsight = useAIStore((state) => state.addInsight);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const organize = useCallback(
    async (onSuccess?: () => void) => {
      if (isOrganizing) return;

      setIsOrganizing(true);

      try {
        // Create and save snapshot for undo
        const snapshot = await createSnapshot();
        await saveSnapshot(snapshot);

        // Organize tabs
        const result = await organizeTabsUnified(categories);

        if (result.success) {
          // Generate success message
          let descriptionParts: string[] = [];
          let params: any = {
            tabsProcessed: result.tabsProcessed,
            groupsCreated: result.groupsCreated,
          };

          // Main organization message
          descriptionParts.push(
            t('insights.organizationComplete.description', {
              tabsProcessed: result.tabsProcessed,
              groupsCreated: result.groupsCreated,
            }),
          );

          // Duplicate tabs message
          if (result.duplicatesRemoved > 0) {
            descriptionParts.push(
              `\n\n🗑️ ${t('insights.duplicatesRemoved.title')}\n` +
                result.duplicateDetails.map((d) => `• ${d.url}: ${d.count}개`).join('\n'),
            );
          }

          // Protected tabs message
          if (result.protectedStats) {
            const { meetingCount, systemCount, domains } = result.protectedStats;
            const protectedCount = meetingCount + systemCount;
            const meetingDomains = domains.join(', ');

            if (meetingCount > 0 && systemCount > 0) {
              descriptionParts.push(
                `\n\n🛡️ ${t('insights.organizationComplete.protectedBoth', {
                  protectedCount,
                  meetingCount,
                  systemCount,
                  meetingDomains,
                })}`,
              );
            } else if (meetingCount > 0) {
              descriptionParts.push(
                `\n\n🛡️ ${t('insights.organizationComplete.protectedMeeting', {
                  meetingCount,
                  meetingDomains,
                })}`,
              );
            } else if (systemCount > 0) {
              descriptionParts.push(`\n\n🛡️ ${t('insights.organizationComplete.protectedSystem', { systemCount })}`);
            }
          }

          addInsight({
            id: `organize-success-${Date.now()}`,
            type: 'tip',
            title: '✨ ' + t('insights.organizationComplete.title'),
            description: descriptionParts.join(''),
            priority: 'medium',
            timestamp: Date.now(),
          });

          onSuccess?.();
          return true;
        } else {
          throw new Error(result.message || 'Organization failed');
        }
      } catch (error) {
        console.error('[useSmartOrganize] Failed:', error);
        addInsight({
          id: `organize-error-${Date.now()}`,
          type: 'alert',
          title: '❌ ' + t('messages.error'),
          description: t('messages.organizationFailed'),
          priority: 'high',
          timestamp: Date.now(),
        });
        return false;
      } finally {
        setIsOrganizing(false);
      }
    },
    [isOrganizing, categories, t, addInsight],
  );

  return {
    isOrganizing,
    organize,
  };
}
