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
  reorderCategories: (categories: Category[]) => Promise<void>; // 카테고리 순서 변경
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

    if (categories.length > 0) {
      // 저장된 카테고리와 기본 카테고리 병합
      const savedCategories = categories;
      const savedIds = new Set(savedCategories.map((c) => c.id));

      // 저장된 카테고리에 없는 새 기본 카테고리 찾기
      const newDefaultCategories = DEFAULT_CATEGORIES.filter((defaultCat) => !savedIds.has(defaultCat.id));

      // 사용자 수정사항을 보존하기 위한 맵 생성
      const categoryMap = new Map<string, Category>();

      // First, add saved categories (including edited defaults)
      // Skip 'other' category if it exists (migrating to 'uncategorized')
      savedCategories.forEach((cat) => {
        if (cat.id !== 'other') {
          categoryMap.set(cat.id, cat);
        }
      });

      // Then add any new default categories that don't exist
      DEFAULT_CATEGORIES.forEach((defaultCat) => {
        if (!categoryMap.has(defaultCat.id)) {
          categoryMap.set(defaultCat.id, defaultCat);
        }
      });

      // Migrate any 'other' mappings to 'uncategorized'
      let updatedMapping = categoryMapping || {};
      if (categoryMapping) {
        let needsUpdate = false;
        Object.keys(updatedMapping).forEach((domain) => {
          if (updatedMapping[domain] === 'other') {
            updatedMapping[domain] = 'uncategorized';
            needsUpdate = true;
          }
        });
        if (needsUpdate) {
          await storageUtils.setCategoryMapping(updatedMapping);
        }
      }

      // Ensure uncategorized is always a system category
      const uncategorized = categoryMap.get('uncategorized');
      if (uncategorized) {
        uncategorized.isSystem = true;
      }

      // Sort categories - uncategorized always at the end
      const categoriesArray = Array.from(categoryMap.values());
      const uncategorizedCat = categoriesArray.find((c) => c.id === 'uncategorized');
      const otherCategories = categoriesArray.filter((c) => c.id !== 'uncategorized');
      const mergedCategories = uncategorizedCat ? [...otherCategories, uncategorizedCat] : otherCategories;

      set({
        categories: mergedCategories,
        categoryMapping: updatedMapping,
      });

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
    }
  },

  addCategory: async (categoryData) => {
    return ErrorBoundary.wrap(
      async () => {
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
        const categories = get().categories;
        if (categories.some((c) => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
          throw new Error('Category with this name already exists');
        }

        const updatedCategories = [...categories, newCategory];

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

        const categories = get().categories;
        if (!categories.some((c) => c.id === categoryId)) {
          throw new Error('Invalid category ID');
        }

        const mapping = { ...get().categoryMapping, [normalizedDomain]: categoryId };
        await storageUtils.setCategoryMapping(mapping);
        set({ categoryMapping: mapping });
      },
      undefined,
      'categoryStore.assignDomainToCategory',
    );
  },

  getCategoryForDomain: (domain) => {
    return ErrorBoundary.wrapSync(
      () => {
        const { categories, categoryMapping } = get();
        const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

        // Check explicit mapping first
        if (categoryMapping[normalizedDomain]) {
          return categoryMapping[normalizedDomain];
        }

        // Check category domains with better pattern matching
        for (const category of categories) {
          // Exact domain match
          if (category.domains.some((d) => normalizedDomain === d.toLowerCase())) {
            return category.id;
          }

          // Subdomain match (e.g., docs.github.com matches github.com)
          if (
            category.domains.some((d) => {
              const pattern = d.toLowerCase();
              return normalizedDomain.endsWith(`.${pattern}`) || normalizedDomain === pattern;
            })
          ) {
            return category.id;
          }
        }

        // Check keywords in domain with word boundaries
        for (const category of categories) {
          if (
            category.keywords.some((keyword) => {
              const keywordLower = keyword.toLowerCase();
              // Match whole words only
              const regex = new RegExp(`\\b${keywordLower}\\b`);
              return regex.test(normalizedDomain);
            })
          ) {
            return category.id;
          }
        }

        return 'uncategorized';
      },
      'uncategorized',
      'categoryStore.getCategoryForDomain',
    );
  },

  resetToDefaults: async () => {
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

    await storageUtils.setCategories(sorted);
    set({ categories: sorted });
  },
}));
