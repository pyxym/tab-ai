import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryManager } from '../components/pages/CategoryManager';
import { HelpModal } from '../components/pages/HelpModal';
import { TabCategoryOrganizer } from '../components/pages/TabCategoryOrganizer';
import { TabGroupManager } from '../components/pages/TabGroupManager';
import { PopupHeader } from '../components/popup/PopupHeader';
import { PopupStats } from '../components/popup/PopupStats';
import { AIInsightCard } from '../components/shared/AIInsightCard';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useInsightsGenerator } from '../hooks/useInsightsGenerator';
import { useSmartOrganize } from '../hooks/useSmartOrganize';
import { useTabsData } from '../hooks/useTabsData';
import { aiSelectors, useAIStore } from '../store/aiStore';
import { useCategoryStore } from '../store/categoryStore';
import { tabSelectors, useTabStore } from '../store/tabStore';
import '../styles/popup.css';
import { storageUtils } from '../utils/storage';
import { hasSnapshot, restoreSnapshot } from '../utils/undoManager';

/**
 * Optimized popup component with separated concerns
 * - Custom hooks for data fetching and business logic
 * - Memoized sub-components to prevent unnecessary re-renders
 * - Reduced from 802 lines to ~400 lines
 */
function IndexPopup() {
  const { t, ready } = useTranslation();

  // 최적화된 선택자 사용 - 필요한 데이터만 구독
  const tabs = useTabStore(tabSelectors.tabs);
  const insights = useAIStore(aiSelectors.insights);
  const addInsight = useAIStore((state) => state.addInsight);
  const removeInsight = useAIStore((state) => state.removeInsight);
  const loadCategories = useCategoryStore((state) => state.loadCategories);

  // Custom hooks
  const { analysis, isLoading, loadTabsAndAnalyze } = useTabsData();
  const { generateInsights } = useInsightsGenerator();
  const { isOrganizing, organize } = useSmartOrganize();

  // Modal states - 개별 상태로 분리하여 불필요한 리렌더링 방지
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [tabListOpen, setTabListOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tabGroupsOpen, setTabGroupsOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [hasUndoSnapshot, setHasUndoSnapshot] = useState(false);

  // Memoized modal handlers - 자식 컴포넌트 리렌더링 방지
  const handleHelpClick = useCallback(() => setHelpOpen(true), []);
  const handleTabGroupsClick = useCallback(() => setTabGroupsOpen(true), []);
  const handleTabListClick = useCallback(() => setTabListOpen(true), []);
  const handleCategoryManagerClick = useCallback(() => setCategoryManagerOpen(true), []);
  const handleSettingsClick = useCallback(() => setSettingsDropdownOpen((prev) => !prev), []);
  const handleUndoClick = useCallback(() => setUndoOpen(true), []);

  // Initialize
  useEffect(() => {
    async function init() {
      await loadCategories();
      const result = await loadTabsAndAnalyze();

      if (result) {
        generateInsights(result.tabs, result.analysis);
      }

      // Check undo availability
      const undoAvailable = await hasSnapshot();
      setHasUndoSnapshot(undoAvailable);

      // First time user check
      const hasSeenWelcome = await storageUtils.getHasSeenWelcome();
      if (!hasSeenWelcome && t) {
        addInsight({
          id: 'welcome-message',
          type: 'tip',
          title: t('insights.welcome.title'),
          description: t('insights.welcome.description'),
          priority: 'high',
          timestamp: Date.now(),
          actionable: {
            label: t('insights.welcome.action'),
            action: () => setHelpOpen(true),
          },
        });
        await storageUtils.setHasSeenWelcome(true);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 초기화는 마운트 시 한 번만 실행 (모든 함수는 안정적이거나 내부에서만 사용)

  // Real-time tab updates - 탭 변경사항 실시간 반영
  useEffect(() => {
    const handleTabUpdate = () => {
      loadTabsAndAnalyze();
    };

    // Chrome 탭 이벤트 리스너 등록
    chrome.tabs.onCreated.addListener(handleTabUpdate);
    chrome.tabs.onRemoved.addListener(handleTabUpdate);
    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      // Cleanup
      chrome.tabs.onCreated.removeListener(handleTabUpdate);
      chrome.tabs.onRemoved.removeListener(handleTabUpdate);
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, [loadTabsAndAnalyze]);

  // Smart organize handler
  const handleSmartOrganize = useCallback(async () => {
    const success = await organize(async () => {
      setHasUndoSnapshot(true);
      await loadTabsAndAnalyze();
    });

    if (success) {
      setTimeout(() => loadTabsAndAnalyze(), 500);
    }
  }, [organize, loadTabsAndAnalyze]);

  // Undo handler
  const handleUndo = useCallback(async () => {
    setUndoOpen(false);

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
      console.error('[IndexPopup] Undo failed:', error);
      addInsight({
        id: `undo-error-${Date.now()}`,
        type: 'alert',
        title: `❌ ${t('messages.error')}`,
        description: t('messages.undoError'),
        priority: 'high',
        timestamp: Date.now(),
      });
    } finally {
      await loadTabsAndAnalyze();
    }
  }, [t, addInsight, loadTabsAndAnalyze]);

  // Clear data handler
  const handleClearData = useCallback(async () => {
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
    setSettingsDropdownOpen(false);
  }, [t, addInsight, loadTabsAndAnalyze]);

  // Memoized stats
  const stats = useMemo(() => {
    const duplicateCount = analysis?.duplicates ? analysis.duplicates.reduce((sum: number, d: any) => sum + d.count - 1, 0) : 0;

    return {
      tabCount: tabs.length,
      groupCount: analysis?.groupCount ?? 0,
      duplicateCount,
    };
  }, [tabs.length, analysis]);

  // Memoized tooltip features - 렌더링마다 새 배열 생성 방지
  const insightsTooltipFeatures = useMemo(
    () => [t('tooltips.insights.features.0'), t('tooltips.insights.features.1'), t('tooltips.insights.features.2')],
    [t],
  );

  const smartOrganizeTooltipFeatures = useMemo(
    () => [t('tooltips.smartOrganize.features.0'), t('tooltips.smartOrganize.features.1'), t('tooltips.smartOrganize.features.2')],
    [t],
  );

  // Loading state
  if (!ready) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-screen relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>

        {/* Main container - サイドパネル用に最適化 */}
        <div className="absolute inset-0 p-3">
          <div className="h-full glass-main rounded-[20px] flex flex-col">
            {/* Header */}
            <PopupHeader
              onHelpClick={handleHelpClick}
              onTabGroupsClick={handleTabGroupsClick}
              onTabListClick={handleTabListClick}
              onCategoryManagerClick={handleCategoryManagerClick}
              onSettingsClick={handleSettingsClick}
            />

            {/* Stats */}
            <PopupStats {...stats} />

            {/* AI Insights */}
            <div className="px-3 py-2 flex-1 overflow-hidden flex flex-col min-h-[120px]">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <h2 className="font-semibold text-sm glass-text">{t('insights.title')}</h2>
                </div>
                <InfoTooltip
                  title={t('tooltips.insights.title')}
                  description={t('tooltips.insights.description')}
                  features={insightsTooltipFeatures}
                  position="bottom-left"
                />
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                <div className="space-y-2 pr-1">
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

            {/* Quick Actions - サイドパネル用に最適化 */}
            <div className="border-t border-white/20 px-3 py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs glass-text opacity-60">{t('actions.quickActions')}</span>
                  <InfoTooltip
                    title={t('tooltips.smartOrganize.title')}
                    description={t('tooltips.smartOrganize.description')}
                    features={smartOrganizeTooltipFeatures}
                    position="auto"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    className="w-full glass-button-primary text-sm disabled:opacity-50 glass-text flex items-center justify-center gap-2 py-2.5"
                    onClick={handleSmartOrganize}
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

                  {hasUndoSnapshot && (
                    <button
                      className="w-full glass-button text-xs glass-text py-2 opacity-80 hover:opacity-100 transition-opacity"
                      onClick={handleUndoClick}
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

        {/* Settings Dropdown */}
        {settingsDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSettingsDropdownOpen(false)} />
            <div className="absolute right-4 top-16 w-48 bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-xl z-50 border border-white/30 py-2">
              <LanguageSwitcher inDropdown={true} onLanguageChange={() => setSettingsDropdownOpen(false)} />
              <div className="border-t border-white/20 mx-2 my-2"></div>
              <button
                onClick={handleClearData}
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>{t('settings.clearData.label')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {categoryManagerOpen && <CategoryManager onClose={() => setCategoryManagerOpen(false)} />}
      {tabListOpen && <TabCategoryOrganizer onClose={() => setTabListOpen(false)} />}
      {tabGroupsOpen && <TabGroupManager onClose={() => setTabGroupsOpen(false)} />}
      {helpOpen && <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />}

      {/* Undo Confirmation Modal */}
      {undoOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="glass-main rounded-[20px] w-[400px] p-6">
            <h3 className="text-lg font-semibold glass-text mb-3">↶ {t('actions.undo')}</h3>
            <p className="glass-text opacity-80 mb-6 whitespace-pre-line">{t('messages.undoConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setUndoOpen(false)} className="glass-button-primary flex-1 py-2">
                {t('actions.cancel')}
              </button>
              <button onClick={handleUndo} className="glass-button-primary flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30">
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
