import { PreflightCheckResult } from '../types/organize';
import { storageUtils } from './storage';
import { filterProtectedTabs, getProtectedTabStats } from './tabFilters';

/**
 * Smart Organize 실행 전 사전 확인
 * @returns 사전 확인 결과
 */
export async function performPreflightCheck(): Promise<PreflightCheckResult> {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const organizableTabs = filterProtectedTabs(allTabs);
  const protectedStats = getProtectedTabStats(allTabs);

  // 카테고리별 분포 계산
  const categoryDistribution: Record<string, number> = {};
  for (const tab of organizableTabs) {
    if (!tab.url) continue;

    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, '');
      const category = await getCategoryForDomain(domain);
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    } catch {
      categoryDistribution['uncategorized'] = (categoryDistribution['uncategorized'] || 0) + 1;
    }
  }

  // 예상 그룹 수 계산 (카테고리 개수 - uncategorized)
  const estimatedGroups = Object.keys(categoryDistribution).filter((cat) => cat !== 'uncategorized').length;

  // 경고 메시지 생성
  const warnings: string[] = [];

  // 화상회의 탭 존재 경고
  if (protectedStats.meetingCount > 0) {
    warnings.push(`⚠️ ${protectedStats.meetingCount}개의 화상회의 탭이 감지되었습니다. 이 탭들은 자동으로 제외됩니다.`);
  }

  // 너무 많은 탭 경고
  if (organizableTabs.length > 100) {
    warnings.push(`⚠️ 처리할 탭이 ${organizableTabs.length}개로 매우 많습니다. 작업에 시간이 걸릴 수 있습니다.`);
  } else if (organizableTabs.length > 50) {
    warnings.push(`ℹ️ 처리할 탭이 ${organizableTabs.length}개입니다. 작업에 몇 초가 소요될 수 있습니다.`);
  }

  // 그룹이 너무 적음 경고
  if (estimatedGroups < 2) {
    warnings.push(`ℹ️ 생성될 그룹이 ${estimatedGroups}개로 적습니다. 카테고리를 추가하면 더 나은 정리가 가능합니다.`);
  }

  // 안전 점수 계산 (0-100)
  let safetyScore = 100;

  // 화상회의 중이면 점수 감소 (하지만 제외되므로 큰 문제 아님)
  if (protectedStats.meetingCount > 0) {
    safetyScore -= 10;
  }

  // 너무 많은 탭이면 점수 감소
  if (organizableTabs.length > 100) {
    safetyScore -= 30;
  } else if (organizableTabs.length > 50) {
    safetyScore -= 15;
  }

  // 실행 권장 여부 (점수 60 이상)
  const recommended = safetyScore >= 60;

  return {
    totalTabs: allTabs.length,
    organizableTabs: organizableTabs.length,
    protectedTabs: {
      count: protectedStats.count,
      meetingCount: protectedStats.meetingCount,
      systemCount: protectedStats.systemCount,
      domains: protectedStats.domains,
    },
    estimatedGroups,
    categoryDistribution,
    warnings,
    safetyScore,
    recommended,
  };
}

/**
 * 도메인의 카테고리 가져오기 (헬퍼 함수)
 */
async function getCategoryForDomain(domain: string): Promise<string> {
  // CategoryStore와 동일한 로직
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
  return category || 'uncategorized';
}
