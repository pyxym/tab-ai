import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AIInsightCard } from '../components/shared/AIInsightCard';
import { AILogo } from '../components/shared/AILogo';
import { CategoryManager } from '../components/pages/CategoryManager';
import { DashboardModal } from '../components/pages/DashboardModal';
import { HelpModal } from '../components/pages/HelpModal';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { TabGroupsModal } from '../components/pages/TabGroupsModal';
import { TabList } from '../components/pages/TabList';
import { useAIStore } from '../store/aiStore';
import { useCategoryStore } from '../store/categoryStore';
import { useTabStore } from '../store/tabStore';
import '../styles/popup.css';
import { storageUtils } from '../utils/storage';
import { calculateProductivityScore } from '../utils/tabAnalyzer';
import { isNewTabUrl, isSystemUrl } from '../utils/tabFilters';
import { createSnapshot, hasSnapshot, restoreSnapshot, saveSnapshot } from '../utils/undoManager';
import { organizeTabsUnified } from '../utils/unifiedOrganizer';

function IndexPopup() {
  const { t, ready } = useTranslation();
  const { tabs, setTabs } = useTabStore();
  const { insights, addInsight, removeInsight, setProductivityScore } = useAIStore();
  const { categories, loadCategories } = useCategoryStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTabList, setShowTabList] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTabGroups, setShowTabGroups] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [hasUndoSnapshot, setHasUndoSnapshot] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);

  useEffect(() => {
    async function init() {
      await loadCategories();
      await loadTabsAndAnalyze();
      checkFirstTimeUser();

      // Undo 스냅샷 존재 여부 확인
      const undoAvailable = await hasSnapshot();
      setHasUndoSnapshot(undoAvailable);
    }
    init();
  }, [loadCategories]);

  async function checkFirstTimeUser() {
    const hasSeenWelcome = await storageUtils.getHasSeenWelcome();
    if (!hasSeenWelcome && t) {
      // Show welcome message for first-time users
      addInsight({
        id: 'welcome-message',
        type: 'tip',
        title: t('insights.welcome.title'),
        description: t('insights.welcome.description'),
        priority: 'high',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.welcome.action'),
          action: () => setShowHelp(true),
        },
      });

      await storageUtils.setHasSeenWelcome(true);
    }
  }

  async function loadTabsAndAnalyze() {
    // Load current tabs
    const currentTabs = await chrome.tabs.query({});
    setTabs(
      currentTabs.map((tab) => ({
        id: tab.id!,
        title: tab.title || '',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
        lastAccessed: Date.now(),
      })),
    );

    // Get analysis from background
    const response = await chrome.runtime.sendMessage({ action: 'getTabsAnalysis' });
    setAnalysis(response);

    // Calculate and set productivity score
    const score = calculateProductivityScore(currentTabs);
    setProductivityScore(score);

    // Generate insights based on analysis
    generateInsights(currentTabs, response);
  }

  function generateInsights(tabs: chrome.tabs.Tab[], analysis: any) {
    // Remove only analysis-based insights (duplicates, high-tab-count, category-focus)
    // Keep user action results (organize-success, undo-success, etc.)
    const analysisInsightIds = ['duplicates', 'high-tab-count', 'category-focus'];
    analysisInsightIds.forEach((id) => {
      if (insights.some((i) => i.id === id)) {
        removeInsight(id);
      }
    });

    // Add duplicate tabs insight
    if (analysis.duplicates.length > 0) {
      const totalDuplicates = analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0);
      addInsight({
        id: 'duplicates',
        type: 'alert',
        title: t('insights.duplicates.title', { count: totalDuplicates }),
        description: t('insights.duplicates.description'),
        priority: 'high',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.duplicates.action'),
          action: async () => {
            try {
              // Get all tabs in current window
              const tabs = await chrome.tabs.query({ currentWindow: true });

              const urlMap = new Map<string, chrome.tabs.Tab[]>();

              // Group tabs by URL (include ALL tabs for duplicate detection)
              tabs.forEach((tab) => {
                if (!tab.url) return;

                let normalizedUrl: string;

                // 모든 새 탭을 동일하게 처리
                if (isNewTabUrl(tab.url)) {
                  normalizedUrl = '__newtab__';
                } else if (isSystemUrl(tab.url)) {
                  // System URLs are normalized by their full URL
                  normalizedUrl = tab.url.replace(/\/$/, '');
                } else {
                  // 일반 URL 정규화 - 후행 슬래시, 프래그먼트, 쿼리 파라미터 제거
                  normalizedUrl = tab.url.replace(/\/$/, '').split('#')[0].split('?')[0];
                }

                if (!urlMap.has(normalizedUrl)) {
                  urlMap.set(normalizedUrl, []);
                }
                urlMap.get(normalizedUrl)!.push(tab);
              });

              // Find and close duplicates
              let closedCount = 0;
              const tabsToClose: number[] = [];

              for (const [url, tabGroup] of urlMap) {
                if (tabGroup.length > 1) {
                  // Sort by id to keep the oldest tab
                  tabGroup.sort((a, b) => (a.id || 0) - (b.id || 0));

                  // Keep the first tab, mark others for closing
                  for (let i = 1; i < tabGroup.length; i++) {
                    const tabId = tabGroup[i].id;
                    if (tabId !== undefined) {
                      tabsToClose.push(tabId);
                      closedCount++;
                    }
                  }
                }
              }

              // Close all duplicate tabs at once
              if (tabsToClose.length > 0) {
                await chrome.tabs.remove(tabsToClose);

                // Remove the duplicate warning first
                removeInsight('duplicates');

                // Then show success message
                addInsight({
                  id: `duplicates-removed-${Date.now()}`,
                  type: 'tip',
                  title: t('insights.duplicatesRemoved.title'),
                  description: t('insights.duplicatesRemoved.description', { count: closedCount }),
                  priority: 'medium',
                  timestamp: Date.now(),
                });
              }

              // Reload tabs and analysis
              setTimeout(() => {
                loadTabsAndAnalyze();
              }, 500);
            } catch (error) {
              console.error('[TabQuest] Failed to remove duplicates:', error);
              alert('Failed to remove duplicate tabs. Please check console for details.');
            }
          },
        },
      });
    }

    // Add high tab count insight
    if (tabs.length > 20) {
      addInsight({
        id: 'high-tab-count',
        type: 'suggestion',
        title: t('insights.highTabCount.title', { count: tabs.length }),
        description: t('insights.highTabCount.description'),
        priority: tabs.length > 30 ? 'high' : 'medium',
        timestamp: Date.now(),
        actionable: {
          label: t('insights.highTabCount.action'),
          action: handleSmartOrganizeClick,
        },
      });
    }

    // Add category insight (exclude uncategorized)
    if (analysis.categoryCounts) {
      const topCategory = Object.entries(analysis.categoryCounts)
        .filter(([category]) => category !== 'uncategorized') // Exclude uncategorized
        .sort(([, a], [, b]) => (b as number) - (a as number))[0];

      if (topCategory && (topCategory[1] as number) > 5) {
        addInsight({
          id: 'category-focus',
          type: 'pattern',
          title: t('insights.categoryFocus.title', { category: topCategory[0] }),
          description: t('insights.categoryFocus.description', {
            count: topCategory[1] as number,
            category: topCategory[0],
          }),
          priority: 'low',
          timestamp: Date.now(),
        });
      }
    }
  }

  // Smart Organize 버튼 클릭 - 바로 실행
  async function handleSmartOrganizeClick() {
    setIsOrganizing(true);

    try {
      // 스냅샷 생성 및 저장
      const snapshot = await createSnapshot();
      await saveSnapshot(snapshot);

      // Use the unified organization function (same as Apply button)
      const result = await organizeTabsUnified(categories);

      if (result.success) {
        // 메시지 국제화 - 상황별 메시지 선택
        let descriptionKey = 'insights.organizationComplete.description';
        let params: any = {
          tabsProcessed: result.tabsProcessed,
          groupsCreated: result.groupsCreated,
        };

        if (result.protectedStats) {
          const { meetingCount, systemCount, domains } = result.protectedStats;
          const protectedCount = meetingCount + systemCount;
          const meetingDomains = domains.join(', ');

          if (meetingCount > 0 && systemCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithBoth';
            params = { ...params, meetingCount, systemCount, protectedCount, meetingDomains };
          } else if (meetingCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithMeeting';
            params = { ...params, meetingCount, meetingDomains };
          } else if (systemCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithSystem';
            params = { ...params, systemCount };
          }
        }

        const translatedTitle = t('insights.organizationComplete.title') as string;
        const translatedDescription = t(descriptionKey, params) as string;

        const insightToAdd = {
          id: `organize-success-${Date.now()}`,
          type: 'tip' as const,
          title: translatedTitle,
          description: translatedDescription,
          priority: 'medium' as const,
          timestamp: Date.now(),
        };

        addInsight(insightToAdd);

        // Undo 버튼 표시
        setHasUndoSnapshot(true);
      }
    } catch (error) {
      console.error('Failed to organize tabs:', error);
      alert('탭 정리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsOrganizing(false);
      await loadTabsAndAnalyze();
    }
  }

  // Undo 핸들러
  async function handleUndo() {
    setShowUndoModal(true);
  }

  // Undo 실행
  async function confirmUndo() {
    setShowUndoModal(false);
    setIsOrganizing(true);

    try {
      const success = await restoreSnapshot();

      if (success) {
        addInsight({
          id: `undo-success-${Date.now()}`,
          type: 'tip',
          title: `↶ ${t('actions.undo')}`,
          description: t('messages.undoSuccess'),
          priority: 'medium',
          timestamp: Date.now(),
        });
        setHasUndoSnapshot(false);
      } else {
        addInsight({
          id: `undo-failed-${Date.now()}`,
          type: 'alert',
          title: `❌ ${t('messages.error')}`,
          description: t('messages.undoFailed'),
          priority: 'high',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Undo 실패:', error);
      addInsight({
        id: `undo-error-${Date.now()}`,
        type: 'alert',
        title: `❌ ${t('messages.error')}`,
        description: t('messages.undoError'),
        priority: 'high',
        timestamp: Date.now(),
      });
    } finally {
      setIsOrganizing(false);
      await loadTabsAndAnalyze();
    }
  }

  async function handleViewDashboard() {
    setShowDashboard(true);
  }

  async function handleAIOrganize() {
    if (isOrganizing) {
      return;
    }

    setIsOrganizing(true);

    try {
      // Use the unified organization function
      const result = await organizeTabsUnified(categories);

      if (!result) {
        throw new Error('No response from background script');
      }

      if (result.success) {
        // 메시지 국제화 - 상황별 메시지 선택
        let descriptionKey = 'insights.organizationComplete.description';
        let params: any = {
          tabsProcessed: result.tabsProcessed,
          groupsCreated: result.groupsCreated,
        };

        if (result.protectedStats) {
          const { meetingCount, systemCount, domains } = result.protectedStats;
          const protectedCount = meetingCount + systemCount;
          const meetingDomains = domains.join(', ');

          if (meetingCount > 0 && systemCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithBoth';
            params = { ...params, meetingCount, systemCount, protectedCount, meetingDomains };
          } else if (meetingCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithMeeting';
            params = { ...params, meetingCount, meetingDomains };
          } else if (systemCount > 0) {
            descriptionKey = 'insights.organizationComplete.descriptionWithSystem';
            params = { ...params, systemCount };
          }
        }

        addInsight({
          id: `ai-organize-${Date.now()}`,
          type: 'tip',
          title: t('insights.organizationComplete.title') as string,
          description: t(descriptionKey, params) as string,
          priority: 'high',
          timestamp: Date.now(),
        });

        // Add learning insight
        if ((result as any).aiInsights?.learningEnabled) {
          addInsight({
            id: `ai-learning-${Date.now()}`,
            type: 'pattern',
            title: '🧠 AI is learning your preferences',
            description: `AI has learned from ${(result as any).aiInsights.totalDomains || 0} domains. The more you use it, the smarter it gets!`,
            priority: 'low',
            timestamp: Date.now() + 1000,
          });
        }

        // 보호된 탭 정보는 메인 메시지에 이미 포함되어 있으므로 별도 카드 제거
      } else {
        addInsight({
          id: `ai-organize-error-${Date.now()}`,
          type: 'alert',
          title: '❌ Smart Organization Failed',
          description: result.message,
          priority: 'high',
          timestamp: Date.now(),
        });
      }

      // Delay reload to ensure state is properly updated
      setTimeout(() => {
        loadTabsAndAnalyze();
      }, 500);
    } catch (error: any) {
      console.error('Smart organization failed:', error);

      // Check if it's a timeout error
      if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
        // Try fallback to smartOrganize
        try {
          const fallbackResult = await chrome.runtime.sendMessage({
            action: 'smartOrganize',
          });
          if (fallbackResult?.success) {
            handleOrganizeResult(fallbackResult);
            return;
          }
        } catch (fallbackError) {
          console.error('[TabQuest] Fallback also failed:', fallbackError);
        }

        addInsight({
          id: `ai-organize-timeout-${Date.now()}`,
          type: 'alert',
          title: '⏱️ Organization Timeout',
          description: 'The operation took too long. Please try again.',
          priority: 'high',
          timestamp: Date.now(),
        });
      } else {
        addInsight({
          id: `ai-organize-error-${Date.now()}`,
          type: 'alert',
          title: '❌ Error',
          description: `Smart organization failed: ${error.message || error}`,
          priority: 'high',
          timestamp: Date.now(),
        });
      }
    } finally {
      // Ensure state is reset
      setIsOrganizing(false);
      // Reload data
      setTimeout(() => {
        loadTabsAndAnalyze();
      }, 500);
    }
  }

  function handleOrganizeResult(result: any) {
    if (result && result.success) {
      addInsight({
        id: `organize-success-${Date.now()}`,
        type: 'tip',
        title: '✨ Organization Complete!',
        description: result.message || 'Tabs organized successfully',
        priority: 'high',
        timestamp: Date.now(),
      });
    } else {
      addInsight({
        id: `organize-error-${Date.now()}`,
        type: 'alert',
        title: '❌ Organization Failed',
        description: result?.message || 'Failed to organize tabs',
        priority: 'high',
        timestamp: Date.now(),
      });
    }
  }

  if (!ready) {
    return (
      <div className="w-[540px] h-[600px] flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-[540px] h-[600px] relative overflow-hidden">
        {/* Dynamic gradient background - dark theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>

        {/* Animated gradient orbs - subtle for dark theme */}
        {/* <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div> */}
        {/* Glass container */}
        <div className="absolute inset-0 p-4">
          <div className="h-full glass-main rounded-[24px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AILogo size="large" />
                  <div>
                    <h1 className="font-bold text-lg ai-gradient-text">TabQuest</h1>
                    <p className="text-xs glass-text opacity-70">{t('header.subtitle')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowHelp(true)} className="glass-card p-2 transition-all hover:scale-105" title="Help & Guide">
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowTabGroups(true)}
                    className="glass-card p-2 transition-all hover:scale-105"
                    title={t('tooltips.tabGroups')}
                  >
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowTabList(true)}
                    className="glass-card p-2 transition-all hover:scale-105"
                    title={t('tooltips.assign')}
                  >
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 4 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="glass-card p-2 transition-all hover:scale-105"
                    title={t('tooltips.categories')}
                  >
                    <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  </button>
                  <div className="relative">
                    <button
                      className="glass-card p-2 transition-all hover:scale-105"
                      title="Settings"
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    >
                      <svg className="w-4 h-4 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {/* Settings Dropdown */}
                    {showSettingsDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowSettingsDropdown(false)} />
                        <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-xl z-50 border border-white/30 py-2">
                          <LanguageSwitcher inDropdown={true} onLanguageChange={() => setShowSettingsDropdown(false)} />
                          <div className="border-t border-white/20 mx-2 my-2"></div>
                          <button
                            onClick={async () => {
                              if (confirm(t('settings.clearData.confirm'))) {
                                await storageUtils.clearLocalStorage();
                                loadTabsAndAnalyze();
                                addInsight({
                                  id: `data-cleared-${Date.now()}`,
                                  type: 'tip',
                                  title: t('settings.clearData.success.title'),
                                  description: t('settings.clearData.success.description'),
                                  priority: 'low',
                                  timestamp: Date.now(),
                                });
                              }
                              setShowSettingsDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2"
                          >
                            <span>🗑️</span>
                            <span>{t('settings.clearData.label')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Stats - Reduced padding */}
            <div className="px-4 py-2">
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">{tabs.length}</p>
                  <p className="text-xs glass-text opacity-70">{t('stats.activeTabs')}</p>
                </div>
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">{analysis?.groupCount ?? 0}</p>
                  <p className="text-xs glass-text opacity-70">{t('stats.categories')}</p>
                </div>
                <div className="glass-card !py-2 text-center">
                  <p className="text-2xl font-bold glass-text">
                    {analysis?.duplicates ? analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0}
                  </p>
                  <p className="text-xs glass-text opacity-70">{t('stats.duplicates')}</p>
                </div>
              </div>

              {/* Coming Soon Features */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card !py-2 px-3 opacity-60 relative">
                  <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">🧠</div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold glass-text">AI Learning</p>
                      <p className="text-[10px] glass-text opacity-70">0 domains</p>
                    </div>
                  </div>
                </div>
                <div className="glass-card !py-2 px-3 opacity-60 relative">
                  <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">💯</div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold glass-text">Productivity</p>
                      <p className="text-[10px] glass-text opacity-70">Score ↑</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights - Expanded section */}
            <div className="px-4 py-2 flex-1 overflow-hidden flex flex-col min-h-[150px]">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="font-semibold text-base glass-text">{t('insights.title')}</h2>
                </div>
                <InfoTooltip
                  title={t('tooltips.insights.title')}
                  description={t('tooltips.insights.description')}
                  features={[t('tooltips.insights.features.0'), t('tooltips.insights.features.1'), t('tooltips.insights.features.2')]}
                  position="bottom-left"
                />
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
                <div className="space-y-3 pr-2">
                  {insights.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[120px]">
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 flex items-center justify-center">
                          <span className="text-xl animate-pulse">🧠</span>
                        </div>
                        <div>
                          <p className="text-sm glass-text font-medium">{t('insights.analyzing.title')}</p>
                          <p className="text-xs glass-text opacity-60">{t('insights.analyzing.description')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    insights.map((insight) => <AIInsightCard key={insight.id} insight={insight} onDismiss={removeInsight} />)
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - Compact */}
            <div className="border-t border-white/20 px-4 py-3">
              <div className="space-y-2">
                {/* Main Actions with Info */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs glass-text opacity-60">{t('actions.quickActions')}</span>
                  <InfoTooltip
                    title={t('tooltips.smartOrganize.title')}
                    description={t('tooltips.smartOrganize.description')}
                    features={[
                      t('tooltips.smartOrganize.features.0'),
                      t('tooltips.smartOrganize.features.1'),
                      t('tooltips.smartOrganize.features.2'),
                    ]}
                    position="auto"
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="glass-button-primary text-sm disabled:opacity-50 glass-text flex items-center justify-center gap-2 py-2.5"
                      onClick={handleSmartOrganizeClick}
                      disabled={isOrganizing || tabs.length < 2}
                    >
                      {isOrganizing ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>{t('actions.organizing')}</span>
                        </>
                      ) : (
                        <>🧹 {t('actions.smartOrganize')}</>
                      )}
                    </button>
                    <button
                      className="glass-button-primary text-sm glass-text flex items-center justify-center gap-2 py-2.5"
                      onClick={handleViewDashboard}
                    >
                      📊 {t('actions.viewAnalytics') + ' (Beta)'}
                    </button>
                  </div>
                  {hasUndoSnapshot && (
                    <button
                      className="w-full glass-button text-xs glass-text py-2 opacity-80 hover:opacity-100 transition-opacity"
                      onClick={handleUndo}
                      disabled={isOrganizing}
                      title={t('actions.undo')}
                    >
                      ↶ {t('actions.undoLastOrganization')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} />}

      {showTabList && <TabList onClose={() => setShowTabList(false)} />}

      {showTabGroups && <TabGroupsModal onClose={() => setShowTabGroups(false)} />}

      {showDashboard && <DashboardModal onClose={() => setShowDashboard(false)} />}

      {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}

      {/* Undo 확인 모달 */}
      {showUndoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="glass-main rounded-[20px] w-[400px] p-6">
            <h3 className="text-lg font-semibold glass-text mb-3">↶ {t('actions.undo')}</h3>
            <p className="glass-text opacity-80 mb-6 whitespace-pre-line">{t('messages.undoConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowUndoModal(false)} className="glass-button-primary flex-1 py-2">
                {t('actions.cancel')}
              </button>
              <button onClick={confirmUndo} className="glass-button-primary flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30">
                {t('actions.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default IndexPopup;
