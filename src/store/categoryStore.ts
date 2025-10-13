import { create } from 'zustand';
import type { Category, CategoryMapping } from '../types/category';
import { DEFAULT_CATEGORIES } from '../types/category';
import { DataValidator, ErrorBoundary } from '../utils/errorBoundary';
import { storageUtils } from '../utils/storage';

/**
 * 카테고리 스토어 인터페이스
 * 카테고리 관리를 위한 상태와 액션 정의
 */
interface CategoryStore {
  // 상태
  categories: Category[]; // 카테고리 목록
  categoryMapping: CategoryMapping; // 도메인-카테고리 매핑

  // 액션
  loadCategories: () => Promise<void>; // 카테고리 로드
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<string>; // 카테고리 추가
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>; // 카테고리 업데이트
  deleteCategory: (id: string) => Promise<void>; // 카테고리 삭제
  assignDomainToCategory: (domain: string, categoryId: string) => Promise<void>; // 도메인을 카테고리에 할당
  getCategoryForDomain: (domain: string) => string; // 도메인의 카테고리 가져오기
  resetToDefaults: () => Promise<void>; // 기본값으로 초기화
  resetToMinimal: () => Promise<void>; // 미니멀로 초기화 (Uncategorized만)
  reorderCategories: (categories: Category[]) => Promise<void>; // 카테고리 순서 변경
  clearCache: () => void; // 캐시 초기화
}

/**
 * Domain-to-category lookup cache
 * Maximum 1000 entries to prevent memory issues
 */
const domainCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

/**
 * 🚀 성능 최적화: Set 기반 도메인 조회 인덱스
 * O(n*m) 순차 검색을 O(1) Set 조회로 개선
 * categories가 변경될 때마다 재구성됨
 */
interface DomainIndex {
  exactDomains: Map<string, string>; // 정확한 도메인 매칭 (예: "github.com" -> categoryId)
  parentDomains: Map<string, string>; // 부모 도메인 매칭 (예: "github.com" -> categoryId for "docs.github.com")
  keywordPatterns: Array<{ categoryId: string; regex: RegExp }>; // 키워드 패턴
}

let domainIndex: DomainIndex = {
  exactDomains: new Map(),
  parentDomains: new Map(),
  keywordPatterns: [],
};

/**
 * 카테고리 변경 시 도메인 인덱스 재구성
 * @param categories 카테고리 목록
 */
function rebuildDomainIndex(categories: Category[]): void {
  const exactDomains = new Map<string, string>();
  const parentDomains = new Map<string, string>();
  const keywordPatterns: Array<{ categoryId: string; regex: RegExp }> = [];

  for (const category of categories) {
    // 정확한 도메인 매칭 인덱스 구축
    for (const domain of category.domains) {
      const normalized = domain.toLowerCase();
      exactDomains.set(normalized, category.id);
      // 서브도메인 매칭을 위해 부모 도메인도 저장
      parentDomains.set(normalized, category.id);
    }

    // 키워드 패턴 인덱스 구축
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower}\\b`);
      keywordPatterns.push({ categoryId: category.id, regex });
    }
  }

  domainIndex = { exactDomains, parentDomains, keywordPatterns };
}

/**
 * 카테고리 스토어
 * Zustand를 사용한 카테고리 상태 관리
 */
export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  categoryMapping: {},

  /**
   * 저장된 카테고리 로드 및 기본 카테고리와 병합
   */
  loadCategories: async () => {
    const categories = await storageUtils.getCategories();
    const categoryMapping = await storageUtils.getCategoryMapping();

    // Clear cache when loading categories
    domainCache.clear();
    // 🚀 도메인 인덱스 재구성 (성능 최적화)

    if (categories.length > 0) {
      // 저장된 카테고리와 기본 카테고리 병합
      const savedCategories = categories;

      // Preserve user's category order from saved data
      const mergedCategories: Category[] = [];
      const savedIds = new Set<string>();
      let uncategorizedCat: Category | null = null;

      // First, add saved categories in their saved order (skip 'other' and 'uncategorized')
      savedCategories.forEach((cat) => {
        if (cat.id === 'other') {
          // Skip old 'other' category
          return;
        }
        if (cat.id === 'uncategorized') {
          // Save uncategorized for the end
          cat.isSystem = true;
          uncategorizedCat = cat;
          savedIds.add(cat.id);
          return;
        }
        mergedCategories.push(cat);
        savedIds.add(cat.id);
      });

      // Then add any new default categories that don't exist yet (except uncategorized)
      DEFAULT_CATEGORIES.forEach((defaultCat) => {
        if (!savedIds.has(defaultCat.id) && defaultCat.id !== 'uncategorized') {
          mergedCategories.push(defaultCat);
        }
      });

      // Always add uncategorized at the end
      if (!uncategorizedCat) {
        uncategorizedCat = DEFAULT_CATEGORIES.find((c) => c.id === 'uncategorized') || null;
        if (uncategorizedCat) {
          uncategorizedCat.isSystem = true;
        }
      }
      if (uncategorizedCat) {
        mergedCategories.push(uncategorizedCat);
      }

      // Migrate any 'other' mappings to 'uncategorized'
      // AND remove any 'uncategorized' mappings (uncategorized should not have domain mappings)
      let updatedMapping = categoryMapping || {};
      if (categoryMapping) {
        let needsUpdate = false;
        Object.keys(updatedMapping).forEach((domain) => {
          if (updatedMapping[domain] === 'other') {
            // Remove 'other' mappings (deprecated category)
            delete updatedMapping[domain];
            needsUpdate = true;
          }
          if (updatedMapping[domain] === 'uncategorized') {
            // Remove 'uncategorized' mappings (uncategorized shouldn't have domain learning)
            delete updatedMapping[domain];
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          await storageUtils.setCategoryMapping(updatedMapping);
        }
      }

      // Also remove any domains from the uncategorized category object
      if (uncategorizedCat && uncategorizedCat.domains.length > 0) {
        uncategorizedCat.domains = [];
      }

      set({
        categories: mergedCategories,
        categoryMapping: updatedMapping,
      });

      // 🚀 도메인 인덱스 재구성
      rebuildDomainIndex(mergedCategories);

      // Update storage with merged categories
      await storageUtils.setCategories(mergedCategories);
    } else {
      // First time setup
      await storageUtils.setCategories(DEFAULT_CATEGORIES);
      await storageUtils.setCategoryMapping({});
      set({
        categories: DEFAULT_CATEGORIES,
        categoryMapping: {},
      });
      // 🚀 도메인 인덱스 재구성
      rebuildDomainIndex(DEFAULT_CATEGORIES);
    }
  },

  addCategory: async (categoryData) => {
    return ErrorBoundary.wrap(
      async () => {
        const categories = get().categories;

        // Check maximum category limit (20 categories max, excluding uncategorized)
        const nonSystemCategories = categories.filter((c) => !c.isSystem);
        if (nonSystemCategories.length >= 20) {
          throw new Error('Maximum 20 categories allowed');
        }

        // Validate category data
        const validatedData = {
          ...categoryData,
          name: DataValidator.sanitizeString(categoryData.name, 50),
          domains: categoryData.domains.map((d) => d.toLowerCase().replace(/^www\./, '')),
          keywords: categoryData.keywords.map((k) => k.toLowerCase()),
          color: categoryData.color,
        };

        const newCategory: Category = {
          ...validatedData,
          id: `custom-${Date.now()}`,
          createdAt: Date.now(),
        };

        // Check for duplicate names
        if (categories.some((c) => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
          throw new Error('Category with this name already exists');
        }

        // Insert new category before uncategorized
        const uncategorized = categories.find((c) => c.id === 'uncategorized');
        const otherCategories = categories.filter((c) => c.id !== 'uncategorized');
        const updatedCategories = uncategorized ? [...otherCategories, newCategory, uncategorized] : [...categories, newCategory];

        // Clear cache when categories change
        domainCache.clear();
        // 🚀 도메인 인덱스 재구성
        rebuildDomainIndex(updatedCategories);

        // Check storage quota before saving
        // WXT handles storage quota internally
        await storageUtils.setCategories(updatedCategories);
        set({ categories: updatedCategories });

        return newCategory.id;
      },
      '',
      'categoryStore.addCategory',
    );
  },

  updateCategory: async (id, updates) => {
    const categories = get().categories;
    const category = categories.find((c) => c.id === id);

    // Don't allow updating system categories
    if (category?.isSystem) {
      throw new Error('시스템 카테고리는 수정할 수 없습니다');
    }

    const updatedCategories = categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat));

    // Clear cache when categories change
    domainCache.clear();
    // 🚀 도메인 인덱스 재구성
    rebuildDomainIndex(updatedCategories);

    await storageUtils.setCategories(updatedCategories);
    set({ categories: updatedCategories });
  },

  deleteCategory: async (id) => {
    const categories = get().categories;
    const categoryMapping = get().categoryMapping;

    // Don't allow deleting default or system categories
    const category = categories.find((c) => c.id === id);
    if (category?.isDefault || category?.isSystem) {
      throw new Error('기본 카테고리나 시스템 카테고리는 삭제할 수 없습니다');
    }

    // Remove category
    const updatedCategories = categories.filter((c) => c.id !== id);

    // Update mapping to reassign domains to "uncategorized"
    const updatedMapping = { ...categoryMapping };
    Object.keys(updatedMapping).forEach((domain) => {
      if (updatedMapping[domain] === id) {
        updatedMapping[domain] = 'uncategorized';
      }
    });

    // Clear cache when categories change
    domainCache.clear();
    // 🚀 도메인 인덱스 재구성
    rebuildDomainIndex(updatedCategories);

    await storageUtils.setCategories(updatedCategories);
    await storageUtils.setCategoryMapping(updatedMapping);
    set({
      categories: updatedCategories,
      categoryMapping: updatedMapping,
    });
  },

  assignDomainToCategory: async (domain, categoryId) => {
    return ErrorBoundary.wrap(
      async () => {
        // Validate inputs
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
        if (!normalizedDomain || normalizedDomain.length > 255) {
          throw new Error('Invalid domain');
        }

        const { categories, categoryMapping } = get();
        if (!categories.some((c) => c.id === categoryId)) {
          throw new Error('Invalid category ID');
        }

        // ⚠️ IMPORTANT: Uncategorized는 도메인 학습(mapping) 저장 안 함
        // Uncategorized는 "미분류" 상태를 나타내므로 도메인을 저장하면 안 됨
        if (categoryId === 'uncategorized') {
          // 기존 매핑에서 해당 도메인 제거만 수행
          const { [normalizedDomain]: _, ...restMapping } = categoryMapping;

          // 모든 카테고리에서 도메인 제거
          const updatedCategories = categories.map((cat) => ({
            ...cat,
            domains: cat.domains.filter((d) => d !== normalizedDomain),
          }));

          // Clear cache when domain assignments change
          domainCache.clear();
          // 🚀 도메인 인덱스 재구성
          rebuildDomainIndex(updatedCategories);

          await storageUtils.setCategoryMapping(restMapping);
          await storageUtils.setCategories(updatedCategories);
          set({ categoryMapping: restMapping, categories: updatedCategories });
          return;
        }

        // Update category mapping
        const mapping = { ...categoryMapping, [normalizedDomain]: categoryId };

        // Update category domains array
        const updatedCategories = categories.map((cat) => {
          // Remove domain from all categories first
          const filteredDomains = cat.domains.filter((d) => d !== normalizedDomain);

          // Add domain to the target category
          if (cat.id === categoryId && !filteredDomains.includes(normalizedDomain)) {
            return { ...cat, domains: [...filteredDomains, normalizedDomain] };
          }

          return { ...cat, domains: filteredDomains };
        });

        // Clear cache when domain assignments change
        domainCache.clear();
        // 🚀 도메인 인덱스 재구성
        rebuildDomainIndex(updatedCategories);

        await storageUtils.setCategoryMapping(mapping);
        await storageUtils.setCategories(updatedCategories);
        set({ categoryMapping: mapping, categories: updatedCategories });
      },
      undefined,
      'categoryStore.assignDomainToCategory',
    );
  },

  getCategoryForDomain: (domain) => {
    return ErrorBoundary.wrapSync(
      () => {
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

        // 🚀 Step 1: 캐시 확인 (O(1))
        const cached = domainCache.get(normalizedDomain);
        if (cached !== undefined) {
          return cached;
        }

        const { categoryMapping } = get();

        // 🚀 Step 2: 명시적 매핑 확인 (O(1))
        if (categoryMapping[normalizedDomain]) {
          const result = categoryMapping[normalizedDomain];
          cacheResult(normalizedDomain, result);
          return result;
        }

        // 🚀 Step 3: Set 기반 정확한 도메인 매칭 (O(1))
        const exactMatch = domainIndex.exactDomains.get(normalizedDomain);
        if (exactMatch) {
          cacheResult(normalizedDomain, exactMatch);
          return exactMatch;
        }

        // 🚀 Step 4: 서브도메인 매칭 (예: docs.github.com -> github.com)
        // 최적화: 도메인을 역순으로 검사하여 부모 도메인 찾기
        const parts = normalizedDomain.split('.');
        for (let i = 1; i < parts.length; i++) {
          const parentDomain = parts.slice(i).join('.');
          const parentMatch = domainIndex.parentDomains.get(parentDomain);
          if (parentMatch) {
            cacheResult(normalizedDomain, parentMatch);
            return parentMatch;
          }
        }

        // 🚀 Step 5: 키워드 패턴 매칭 (최적화된 정규식)
        for (const { categoryId, regex } of domainIndex.keywordPatterns) {
          if (regex.test(normalizedDomain)) {
            cacheResult(normalizedDomain, categoryId);
            return categoryId;
          }
        }

        // Step 6: 기본값 - uncategorized
        cacheResult(normalizedDomain, 'uncategorized');
        return 'uncategorized';
      },
      'uncategorized',
      'categoryStore.getCategoryForDomain',
    );
  },

  clearCache: () => {
    domainCache.clear();
    // 🚀 도메인 인덱스도 재구성 필요
    const { categories } = get();
    rebuildDomainIndex(categories);
  },

  resetToDefaults: async () => {
    domainCache.clear();
    rebuildDomainIndex(DEFAULT_CATEGORIES);
    await storageUtils.setCategories(DEFAULT_CATEGORIES);
    await storageUtils.setCategoryMapping({});
    set({
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {},
    });
  },

  resetToMinimal: async () => {
    // Clear all categories except Uncategorized
    domainCache.clear();
    rebuildDomainIndex(DEFAULT_CATEGORIES);
    await storageUtils.setCategories(DEFAULT_CATEGORIES);
    await storageUtils.setCategoryMapping({});
    set({
      categories: DEFAULT_CATEGORIES,
      categoryMapping: {},
    });
  },

  reorderCategories: async (newCategories) => {
    // Ensure uncategorized is always at the end
    const uncategorized = newCategories.find((c) => c.id === 'uncategorized');
    const otherCategories = newCategories.filter((c) => c.id !== 'uncategorized');
    const sorted = uncategorized ? [...otherCategories, uncategorized] : newCategories;

    domainCache.clear();
    rebuildDomainIndex(sorted);
    await storageUtils.setCategories(sorted);
    set({ categories: sorted });
  },
}));

/**
 * 🚀 Helper: 캐시에 결과 저장 (LRU 방식)
 */
function cacheResult(domain: string, categoryId: string): void {
  if (domainCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (first item)
    const firstKey = domainCache.keys().next().value;
    if (firstKey) domainCache.delete(firstKey);
  }
  domainCache.set(domain, categoryId);
}

/**
 * 최적화된 선택자 함수들
 * 불필요한 리렌더링을 방지하기 위해 필요한 데이터만 선택
 * 전체 스토어를 구조분해하는 대신 이 선택자들을 사용하세요
 */
export const categorySelectors = {
  // 카테고리 배열만 선택
  categories: (state: CategoryStore) => state.categories,

  // 카테고리 매핑만 선택
  categoryMapping: (state: CategoryStore) => state.categoryMapping,

  // 특정 ID의 카테고리 선택
  categoryById: (id: string) => (state: CategoryStore) => state.categories.find((cat) => cat.id === id),

  // 사용자 정의 카테고리만 선택 (시스템 카테고리 제외)
  userCategories: (state: CategoryStore) => state.categories.filter((cat) => !cat.isSystem),

  // 카테고리 개수만 선택
  categoryCount: (state: CategoryStore) => state.categories.length,

  // 액션만 선택 (데이터 변경 시 리렌더링되지 않음)
  actions: (state: CategoryStore) => ({
    loadCategories: state.loadCategories,
    addCategory: state.addCategory,
    updateCategory: state.updateCategory,
    deleteCategory: state.deleteCategory,
    assignDomainToCategory: state.assignDomainToCategory,
    getCategoryForDomain: state.getCategoryForDomain,
    resetToDefaults: state.resetToDefaults,
    resetToMinimal: state.resetToMinimal,
    reorderCategories: state.reorderCategories,
    clearCache: state.clearCache,
  }),
};
