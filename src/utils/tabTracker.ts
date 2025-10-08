// 탭 사용 추적 유틸리티
import { storageUtils } from './storage';
import { isProtectedTab, isSystemUrl } from './tabFilters';

interface TabUsageData {
  url: string;
  domain: string;
  title: string;
  category: string;
  firstSeen: number;
  lastAccessed: number;
  totalTimeSpent: number; // 밀리초 단위
  accessCount: number;
  activations: number; // 탭 활성화 횟수
}

interface DailyStats {
  date: string; // YYYY-MM-DD 형식
  totalTabs: number;
  totalTimeSpent: number;
  categoryBreakdown: Record<string, number>; // 카테고리별 사용 시간
  domainBreakdown: Record<string, number>; // 도메인별 사용 시간
  productivityScore: number;
}

export class TabTracker {
  private static activeTabId: number | null = null;
  private static activeStartTime: number | null = null;
  private static updateInterval: NodeJS.Timeout | null = null;

  // 추적 초기화
  static async initialize() {
    try {
      // 탭 활성화 추적
      chrome.tabs.onActivated.addListener(async (activeInfo) => {
        await this.handleTabChange(activeInfo.tabId);
      });

      // 탭 업데이트 추적 (URL 변경)
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (changeInfo.url && tabId === this.activeTabId) {
          await this.handleTabChange(tabId);
        }
      });

      // 창 포커스 변경 추적
      chrome.windows.onFocusChanged.addListener(async (windowId) => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
          // 브라우저 포커스 잃음
          await this.stopTracking();
        } else {
          // 브라우저 포커스 획득, 활성 탭 추적 재개
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            await this.handleTabChange(activeTab.id);
          }
        }
      });

      // Service Worker에서는 setInterval이 작동하지 않으므로 chrome.alarms API 사용
      chrome.alarms.create('tabTrackerUpdate', { periodInMinutes: 0.1 }); // 6초마다

      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'tabTrackerUpdate') {
          this.updateActiveTabTime();
        }
      });

      // 초기화 시 현재 활성 탭 추적
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await this.handleTabChange(activeTab.id);
      }
    } catch (error) {
      console.error('[TabTracker] 초기화 오류:', error);
      throw error;
    }
  }

  // 탭 변경 처리 - 이벤트 리스너를 위해 PUBLIC이어야 함
  static async handleTabChange(newTabId: number) {
    try {
      // 이전 탭 추적 중지
      await this.stopTracking();

      // 새 탭 추적 시작
      const tab = await chrome.tabs.get(newTabId);

      // 보호된 탭 건너뛰기 (Meet, Zoom 등)
      if (isProtectedTab(tab)) {
        console.log('[TabTracker] 보호된 탭 건너뛰기:', tab.url);
        return;
      }

      if (tab.url && !isSystemUrl(tab.url)) {
        this.activeTabId = newTabId;
        this.activeStartTime = Date.now();

        // 접근 횟수 업데이트
        await this.incrementTabAccess(tab);
      }
    } catch (error) {}
  }

  // 현재 탭 추적 중지 - 이벤트 리스너를 위해 PUBLIC이어야 함
  static async stopTracking() {
    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;
      await this.updateTabUsage(this.activeTabId, timeSpent);
    }

    this.activeTabId = null;
    this.activeStartTime = null;
  }

  // 활성 탭 시간 업데이트 - setInterval을 위해 PUBLIC이어야 함
  static async updateActiveTabTime() {
    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;
      await this.updateTabUsage(this.activeTabId, timeSpent);
      this.activeStartTime = Date.now(); // 시작 시간 리셋
    }
  }

  // 탭 사용 데이터 업데이트
  private static async updateTabUsage(tabId: number, timeSpent: number) {
    try {
      // 탭 가져오기 시도, 이미 닫힌 경우 처리
      let tab: chrome.tabs.Tab;
      try {
        tab = await chrome.tabs.get(tabId);
      } catch (error) {
        // 탭이 닫힘, 조용히 무시
        return;
      }

      // 보호된 탭 건너뛰기
      if (!tab.url || isProtectedTab(tab)) {
        return;
      }

      const domain = new URL(tab.url).hostname.replace(/^www\./, '');

      // CategoryStore와 동일한 로직으로 카테고리 가져오기
      const categoryMapping = await storageUtils.getCategoryMapping();
      const categories = await storageUtils.getCategories();

      // 먼저 사용자 지정 카테고리 확인
      let category = categoryMapping[domain];

      // 없으면 카테고리 도메인 확인
      if (!category) {
        for (const cat of categories) {
          if (
            cat.domains &&
            cat.domains.some((d: string) => {
              const catDomain = d.toLowerCase();
              return domain === catDomain || domain.endsWith(`.${catDomain}`);
            })
          ) {
            category = cat.id;
            break;
          }
        }
      }

      // 기본값은 uncategorized
      if (!category) category = 'uncategorized';

      // 기존 데이터 가져오기
      const tabUsageData = await storageUtils.getTabUsageData();

      const key = domain; // 집계를 위해 도메인을 키로 사용
      const existing = tabUsageData[key] || {
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        category: category,
        firstSeen: Date.now(),
        lastAccessed: Date.now(),
        totalTimeSpent: 0,
        accessCount: 0,
        activations: 0,
      };

      // 데이터 업데이트
      const oldTimeSpent = existing.totalTimeSpent;
      existing.lastAccessed = Date.now();
      existing.totalTimeSpent += timeSpent;
      existing.title = tab.title || existing.title; // 변경된 경우 제목 업데이트
      existing.category = category; // 변경된 경우 카테고리 업데이트

      tabUsageData[key] = existing;
      await storageUtils.setTabUsageData(tabUsageData);

      // 일일 통계 업데이트
      await this.updateDailyStats(category, domain, timeSpent);
    } catch (error) {
      console.error('[TabTracker] 탭 사용 업데이트 오류:', error);
    }
  }

  // 탭 접근 횟수 증가
  private static async incrementTabAccess(tab: chrome.tabs.Tab) {
    try {
      if (!tab.url) {
        return;
      }

      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      const tabUsageData = await storageUtils.getTabUsageData();

      const key = domain;
      if (tabUsageData[key]) {
        tabUsageData[key].accessCount++;
        tabUsageData[key].activations++;
      }

      await storageUtils.setTabUsageData(tabUsageData);
    } catch (error) {
      console.error('[TabTracker] 탭 접근 증가 오류:', error);
    }
  }

  // 일일 통계 업데이트
  private static async updateDailyStats(category: string, domain: string, timeSpent: number) {
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = await storageUtils.getDailyStats();

    if (!dailyStats[today]) {
      dailyStats[today] = {
        date: today,
        totalTabs: 0,
        totalTimeSpent: 0,
        categoryBreakdown: {},
        domainBreakdown: {},
        productivityScore: 0,
      };
    }

    const todayStats = dailyStats[today];
    const oldTotalTime = todayStats.totalTimeSpent;
    todayStats.totalTimeSpent += timeSpent;
    todayStats.categoryBreakdown[category] = (todayStats.categoryBreakdown[category] || 0) + timeSpent;
    todayStats.domainBreakdown[domain] = (todayStats.domainBreakdown[domain] || 0) + timeSpent;

    // 생산성 점수 계산
    const productiveTime = (todayStats.categoryBreakdown['work'] || 0) + (todayStats.categoryBreakdown['productivity'] || 0);
    const distractingTime = (todayStats.categoryBreakdown['social'] || 0) + (todayStats.categoryBreakdown['entertainment'] || 0);
    const totalCategorizedTime = productiveTime + distractingTime;

    if (totalCategorizedTime > 0) {
      todayStats.productivityScore = Math.round((productiveTime / totalCategorizedTime) * 100);
    } else {
      todayStats.productivityScore = 50; // 중립
    }

    dailyStats[today] = todayStats;
    await storageUtils.setDailyStats(dailyStats);
  }

  // 대시보드용 사용 데이터 가져오기
  static async getUsageData() {
    const tabUsageData = await storageUtils.getTabUsageData();
    const dailyStats = await storageUtils.getDailyStats();

    // 최근 7일 데이터 가져오기
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(
        dailyStats[dateStr] || {
          date: dateStr,
          totalTabs: 0,
          totalTimeSpent: 0,
          categoryBreakdown: {},
          domainBreakdown: {},
          productivityScore: 50,
        },
      );
    }

    return {
      tabUsageData: Object.values(tabUsageData),
      dailyStats: last7Days.reverse(),
      todayStats: dailyStats[new Date().toISOString().split('T')[0]],
    };
  }

  // 오래된 데이터 정리 (최근 30일 유지)
  static async cleanupOldData() {
    const dailyStats = await storageUtils.getDailyStats();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cleaned: Record<string, DailyStats> = {};
    Object.entries(dailyStats).forEach(([date, stats]) => {
      if (new Date(date) >= thirtyDaysAgo) {
        cleaned[date] = stats as DailyStats;
      }
    });

    await storageUtils.setDailyStats(cleaned);
  }
}
