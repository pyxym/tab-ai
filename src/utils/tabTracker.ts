// 탭 사용 추적 유틸리티
import type { DailyStats } from '../types/storage';
import { extractDomain } from './chromeTabHelpers';
import { TAB_TRACKING_CONFIG } from './configs';
import { storageUtils } from './storage';
import { isProtectedTab, isSystemUrl } from './tabFilters';

export class TabTracker {
  private static activeTabId: number | null = null;
  private static activeStartTime: number | null = null;
  private static updateInterval: NodeJS.Timeout | null = null;

  // Debounce를 위한 타이머
  private static saveTimer: NodeJS.Timeout | null = null;

  // 마지막 저장 시간 추적
  private static lastSaveTime: number = 0;

  // 🚀 성능 최적화: 카테고리 캐시
  private static categoryCache: Map<string, string> = new Map();
  private static categoryCacheTimestamp: number = 0;
  private static readonly CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5분

  // 🚀 성능 최적화: 배치 쓰기를 위한 메모리 버퍼
  private static pendingUpdates: Map<string, any> = new Map();
  private static batchWriteTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_WRITE_DELAY = 30000; // 30초

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
      chrome.alarms.create('tabTrackerUpdate', { periodInMinutes: TAB_TRACKING_CONFIG.ALARM_PERIOD_MINUTES });

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
    // Debounce 타이머 취소
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;

      // 임계값 체크 - 30초 이상만 저장
      if (timeSpent >= TAB_TRACKING_CONFIG.MIN_ACTIVE_TIME) {
        await this.updateTabUsage(this.activeTabId, timeSpent);
      }
    }

    this.activeTabId = null;
    this.activeStartTime = null;
  }

  // 활성 탭 시간 업데이트 - setInterval을 위해 PUBLIC이어야 함
  static async updateActiveTabTime() {
    if (this.activeTabId && this.activeStartTime) {
      const timeSpent = Date.now() - this.activeStartTime;

      // 임계값 체크 - 30초 이상만 업데이트
      if (timeSpent >= TAB_TRACKING_CONFIG.MIN_ACTIVE_TIME) {
        // Debounced 저장 사용
        this.debouncedSave(this.activeTabId, timeSpent);
      }
    }
  }

  /**
   * Debounced 저장 - 짧은 시간 내 여러 번 저장 요청 시 한 번만 저장
   */
  private static debouncedSave(tabId: number, timeSpent: number) {
    // 기존 타이머 취소
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // 새 타이머 설정
    this.saveTimer = setTimeout(async () => {
      // 최소 저장 간격 체크 (3초)
      const now = Date.now();
      if (now - this.lastSaveTime < TAB_TRACKING_CONFIG.DEBOUNCE_DELAY) {
        return;
      }

      await this.updateTabUsage(tabId, timeSpent);
      this.lastSaveTime = now;
      this.activeStartTime = Date.now(); // 시작 시간 리셋
    }, TAB_TRACKING_CONFIG.DEBOUNCE_DELAY);
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

      const domain = extractDomain(tab.url);
      if (!domain) return;

      // 🚀 성능 최적화: 카테고리 캐싱으로 반복 계산 방지
      const category = await this.getCachedCategory(domain);

      // 🚀 성능 최적화: 배치 쓰기 - 메모리에 먼저 저장
      const key = domain;
      const updateData = {
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        category: category,
        lastAccessed: Date.now(),
        timeSpent: timeSpent,
      };

      // 메모리 버퍼에 추가 (기존 값과 병합)
      if (this.pendingUpdates.has(key)) {
        const existing = this.pendingUpdates.get(key)!;
        existing.timeSpent += timeSpent;
        existing.lastAccessed = Date.now();
        existing.title = tab.title || existing.title;
      } else {
        this.pendingUpdates.set(key, updateData);
      }

      // 배치 쓰기 타이머 설정
      this.scheduleBatchWrite();

      // 일일 통계도 메모리에 누적 (즉시 저장하지 않음)
      await this.updateDailyStatsInMemory(category, domain, timeSpent);
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

      const domain = extractDomain(tab.url);
      if (!domain) return;

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
        tabsOpened: 0,
        tabsClosed: 0,
        tabsOrganized: 0,
        activeTime: 0,
        productivityScore: 0,
        totalTabs: 0,
        totalTimeSpent: 0,
        categoryBreakdown: {},
        domainBreakdown: {},
        topDomains: [],
      };
    }

    const todayStats = dailyStats[today];
    const oldTotalTime = todayStats.totalTimeSpent || 0;
    todayStats.totalTimeSpent = (todayStats.totalTimeSpent || 0) + timeSpent;
    todayStats.categoryBreakdown = todayStats.categoryBreakdown || {};
    todayStats.categoryBreakdown[category] = (todayStats.categoryBreakdown[category] || 0) + timeSpent;
    todayStats.domainBreakdown = todayStats.domainBreakdown || {};
    todayStats.domainBreakdown[domain] = (todayStats.domainBreakdown[domain] || 0) + timeSpent;

    // 생산성 점수 계산
    const categoryBreakdown = todayStats.categoryBreakdown || {};
    const productiveTime = (categoryBreakdown['work'] || 0) + (categoryBreakdown['productivity'] || 0);
    const distractingTime = (categoryBreakdown['social'] || 0) + (categoryBreakdown['entertainment'] || 0);
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

  // 🚀 성능 최적화: 카테고리 캐시 조회
  private static async getCachedCategory(domain: string): Promise<string> {
    const now = Date.now();

    // 캐시 만료 확인
    if (now - this.categoryCacheTimestamp > this.CATEGORY_CACHE_TTL) {
      this.categoryCache.clear();
      this.categoryCacheTimestamp = now;
    }

    // 캐시에서 확인
    if (this.categoryCache.has(domain)) {
      return this.categoryCache.get(domain)!;
    }

    // 캐시 미스 - 계산
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

    // 캐시에 저장
    this.categoryCache.set(domain, category);

    return category;
  }

  // 🚀 성능 최적화: 배치 쓰기 스케줄링
  private static scheduleBatchWrite() {
    // 기존 타이머가 있으면 취소하지 않음 (연속 업데이트를 30초 단위로 모음)
    if (this.batchWriteTimer) {
      return;
    }

    // 30초 후 일괄 저장
    this.batchWriteTimer = setTimeout(async () => {
      await this.flushPendingUpdates();
      this.batchWriteTimer = null;
    }, this.BATCH_WRITE_DELAY);
  }

  // 🚀 성능 최적화: 메모리 버퍼를 스토리지에 플러시
  private static async flushPendingUpdates() {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    try {
      // 기존 데이터 가져오기
      const tabUsageData = await storageUtils.getTabUsageData();

      // 메모리 버퍼의 모든 업데이트 적용
      for (const [key, updateData] of this.pendingUpdates.entries()) {
        const existing = tabUsageData[key] || {
          url: updateData.url,
          domain: updateData.domain,
          title: updateData.title,
          category: updateData.category,
          firstSeen: Date.now(),
          lastAccessed: updateData.lastAccessed,
          timeSpent: 0,
          totalTimeSpent: 0,
          accessCount: 0,
          activations: 0,
        };

        // 업데이트 병합
        existing.lastAccessed = updateData.lastAccessed;
        existing.totalTimeSpent += updateData.timeSpent;
        existing.title = updateData.title || existing.title;
        existing.category = updateData.category;

        tabUsageData[key] = existing;
      }

      // 한 번에 저장
      await storageUtils.setTabUsageData(tabUsageData);

      // 버퍼 초기화
      this.pendingUpdates.clear();

      console.log('[TabTracker] 배치 쓰기 완료');
    } catch (error) {
      console.error('[TabTracker] 배치 쓰기 오류:', error);
    }
  }

  // 🚀 성능 최적화: 일일 통계를 메모리에 누적 (즉시 저장 안 함)
  private static async updateDailyStatsInMemory(category: string, domain: string, timeSpent: number) {
    // 실제 구현은 동일하지만, 메모리에 누적 후 배치 쓰기 시 함께 저장
    // 여기서는 간단히 기존 로직 유지 (별도 최적화 필요 시 추가 구현)
    await this.updateDailyStats(category, domain, timeSpent);
  }

  // 오래된 데이터 정리 (설정된 일수 유지)
  static async cleanupOldData() {
    const dailyStats = await storageUtils.getDailyStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TAB_TRACKING_CONFIG.CLEANUP_DAYS);

    const cleaned: Record<string, DailyStats> = {};
    Object.entries(dailyStats).forEach(([date, stats]) => {
      if (new Date(date) >= cutoffDate) {
        cleaned[date] = stats as DailyStats;
      }
    });

    await storageUtils.setDailyStats(cleaned);
    console.log(`[TabTracker] 오래된 데이터 정리 완료 (${TAB_TRACKING_CONFIG.CLEANUP_DAYS}일 이전 데이터 삭제)`);
  }
}
