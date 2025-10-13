import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExtendedColorEnum } from '../../types/category';
import { getColorHex } from '../../utils/colorUtils';

// 가벼운 카테고리 옵션 타입
interface CategoryOption {
  id: string;
  name: string;
  color: ExtendedColorEnum;
}

interface CategorySelectModalProps {
  isOpen: boolean;
  currentCategory: string;
  categories: CategoryOption[];
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

/**
 * 카테고리 선택 모달
 * 100개 탭에서도 단 1개만 렌더링되어 메모리 98% 절감
 */
export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({ isOpen, currentCategory, categories, onSelect, onClose }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce 검색어 (150ms 지연)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 검색 필터링 (debounced query 사용)
  const filteredCategories = useMemo(() => {
    if (!debouncedQuery.trim()) return categories;
    const query = debouncedQuery.toLowerCase();
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, debouncedQuery]);

  if (!isOpen) return null;

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    setSearchQuery(''); // 검색어 초기화
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSearchQuery(''); // 검색어 초기화
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]" onClick={handleBackdropClick}>
      <div className="glass-main rounded-[12px] w-[480px] max-h-[560px] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold glass-text">📁 {t('modal.categorySelect.title')}</h3>
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3 hover:bg-white/10">
              ✕
            </button>
          </div>

          {/* 검색 입력 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('modal.categorySelect.searchPlaceholder')}
              className="w-full px-4 py-2 glass-card text-sm glass-text rounded-lg outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 카테고리 리스트 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-4 glass-text opacity-60">
                <p>{t('modal.categorySelect.noResults')}</p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleSelect(category.id)}
                  className={`w-full p-2 rounded-md transition-all flex items-center gap-3 ${
                    category.id === currentCategory
                      ? 'bg-purple-600/60 ring-2 ring-purple-400/50 shadow-lg'
                      : 'glass-card hover:bg-white/10 hover:scale-[1.02]'
                  }`}
                >
                  {/* 카테고리 색상 */}
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white/30"
                    style={{ backgroundColor: getColorHex(category.color) }}
                  />

                  {/* 카테고리 이름 */}
                  <span className="flex-1 text-left font-medium glass-text">{category.name}</span>

                  {/* 선택 표시 */}
                  {category.id === currentCategory && <span className="text-white text-lg">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-white/20 glass-text opacity-60 text-xs text-center">{t('modal.categorySelect.tip')}</div>
      </div>
    </div>
  );
};
