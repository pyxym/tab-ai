/**
 * 탭 필터링 유틸리티
 * TabQuest 작업에서 중요한 탭을 보호합니다
 */

import { NEW_TAB_EXACT_URLS, NEW_TAB_URL_PREFIXES, PROTECTED_DOMAINS, PROTECTED_SYSTEM_PREFIXES } from './configs';

/**
 * URL이 시스템 URL인지 확인
 * @param url 확인할 URL 문자열
 * @returns 시스템 URL이면 true
 */
export function isSystemUrl(url: string): boolean {
  return PROTECTED_SYSTEM_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * URL이 새 탭(New Tab)인지 확인
 * @param url 확인할 URL 문자열
 * @returns 새 탭이면 true
 */
export function isNewTabUrl(url: string): boolean {
  // 정확한 URL 매칭
  if (NEW_TAB_EXACT_URLS.some((exactUrl) => url === exactUrl)) {
    return true;
  }
  // 프리픽스 매칭 (변형된 새 탭 URL 감지)
  return NEW_TAB_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * 탭이 TabQuest 작업에서 보호되어야 하는지 확인
 * @param tab Chrome 탭 객체
 * @returns 보호되어야 하면 true
 */
export function isProtectedTab(tab: chrome.tabs.Tab): boolean {
  if (!tab.url) return false;

  // 시스템 URL 체크
  if (isSystemUrl(tab.url)) return true;

  // 화상회의 도메인 체크
  try {
    const url = new URL(tab.url);
    const hostname = url.hostname;

    return PROTECTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * 탭 목록에서 보호된 탭 필터링
 * @param tabs Chrome 탭 배열
 * @returns 보호된 탭을 제외한 필터링된 배열
 */
export function filterProtectedTabs(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] {
  return tabs.filter((tab) => !isProtectedTab(tab));
}

/**
 * 보호된 탭에 대한 통계 정보 가져오기
 * @param tabs Chrome 탭 배열
 * @returns 보호된 탭 개수와 상세 정보를 담은 객체
 */
export function getProtectedTabStats(tabs: chrome.tabs.Tab[]): {
  count: number;
  tabs: chrome.tabs.Tab[];
  domains: string[];
  meetingCount: number; // 화상회의 탭만 카운트
  systemCount: number; // 시스템 페이지 카운트
} {
  const protectedTabs = tabs.filter((tab) => isProtectedTab(tab));

  // 화상회의 탭과 시스템 페이지 분리
  let meetingCount = 0;
  let systemCount = 0;
  const domains: string[] = [];

  protectedTabs.forEach((tab) => {
    if (!tab.url) return;

    // 시스템 URL 체크
    if (isSystemUrl(tab.url)) {
      systemCount++;
      return;
    }

    // 화상회의 도메인 체크
    try {
      const hostname = new URL(tab.url).hostname;
      if (PROTECTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
        meetingCount++;
        domains.push(hostname);
      }
    } catch {
      // URL 파싱 실패
    }
  });

  return {
    count: protectedTabs.length,
    tabs: protectedTabs,
    domains: Array.from(new Set(domains)),
    meetingCount,
    systemCount,
  };
}
