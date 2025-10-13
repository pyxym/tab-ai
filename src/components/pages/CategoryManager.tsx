import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoryDragDrop } from '../../hooks/useCategoryDragDrop';
import { useCategoryStore } from '../../store/categoryStore';
import type { Category, ExtendedColorEnum } from '../../types/category';
import { organizeTabsUnified } from '../../utils/unifiedOrganizer';
import { CategoryItem } from '../items/CategoryItem';
import { CategoryEditModal } from '../modals/CategoryEditModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CategoryManagerProps {
  onClose: () => void;
}

/**
 * Optimized Category Manager Component
 * Reduced from 411 lines to ~250 lines with better performance
 */
export const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory, reorderCategories, resetToMinimal } = useCategoryStore();

  // 🚀 성능 최적화: 개별 모달 상태로 분리 (불필요한 리렌더링 방지)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);

  // Custom hook for drag and drop
  const { draggedIndex, dragOverIndex, handleDragStart, handleDragOver, handleDragEnd, handleDrop } = useCategoryDragDrop(
    categories,
    reorderCategories,
  );

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 🚀 메모이제이션된 모달 핸들러
  const handleEdit = useCallback(
    (category: Category) => {
      if (category.isSystem) {
        alert(t('tooltips.categoryManager.cannotEditSystem'));
        return;
      }
      setEditingCategory(category);
      setEditModalOpen(true);
    },
    [t],
  );

  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    setEditModalOpen(true);
  }, []);

  const handleSave = useCallback(
    async (name: string, color: ExtendedColorEnum, domains: string[]) => {
      try {
        if (editingCategory) {
          await updateCategory(editingCategory.id, { name, color, domains });
        } else {
          await addCategory({
            name,
            color,
            domains,
            keywords: [],
            isDefault: false,
          });
        }
        setEditModalOpen(false);
        setEditingCategory(null);
      } catch (error: any) {
        if (error.message === 'Maximum 30 categories allowed') {
          alert(t('messages.maxCategoriesReached'));
        } else {
          alert(error.message);
        }
      }
    },
    [editingCategory, updateCategory, addCategory, t],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const category = categories.find((c) => c.id === id);
      if (category?.isSystem) {
        alert(t('tooltips.categoryManager.cannotDeleteSystem'));
        return;
      }
      setDeleteTargetId(id);
      setDeleteModalOpen(true);
    },
    [categories, t],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTargetId) {
      try {
        await deleteCategory(deleteTargetId);
      } catch (error) {
        alert(t('tooltips.categoryManager.defaultCannotDelete'));
      }
    }
    setDeleteModalOpen(false);
    setDeleteTargetId(null);
  }, [deleteTargetId, deleteCategory, t]);

  const handleConfirmReset = useCallback(async () => {
    await resetToMinimal();
    setResetModalOpen(false);
  }, [resetToMinimal]);

  // Apply grouping handler
  const handleApplyGrouping = useCallback(async () => {
    if (isOrganizing) return;

    setIsOrganizing(true);
    try {
      await organizeTabsUnified(categories);
      // Show success feedback (optional)
    } catch (error) {
      console.error('[CategoryManager] Failed to apply grouping:', error);
    } finally {
      setIsOrganizing(false);
    }
  }, [isOrganizing, categories]);

  // Memoized category stats
  const stats = useMemo(() => {
    const totalDomains = categories.reduce((sum, cat) => sum + cat.domains.length, 0);
    return { totalDomains };
  }, [categories]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] py-2 px-4">
      <div className="glass-main rounded-[12px] w-full max-w-3xl h-[95vh] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.categoryManager.title')}</h2>
              <InfoTooltip
                title={t('modal.categoryManager.infoTitle')}
                description={t('modal.categoryManager.infoDescription')}
                features={t('modal.categoryManager.infoFeatures', { returnObjects: true }) as string[]}
                position="bottom"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {/* 스마트 정리 버튼 (빗자루 아이콘만) */}
              <button
                onClick={handleApplyGrouping}
                disabled={isOrganizing}
                className="glass-button-primary !p-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-500/20 transition-all"
                title={t('modal.tabCategoryOrganizer.applyButtonTooltip')}
              >
                {isOrganizing ? (
                  <span className="w-4 h-4 flex items-center justify-center animate-spin">⏳</span>
                ) : (
                  <span className="text-sm">🧹</span>
                )}
              </button>

              {/* 리셋 버튼 */}
              <button
                onClick={() => setResetModalOpen(true)}
                className="glass-button-primary !p-1.5 hover:bg-purple-500/20 transition-all"
                title={t('modal.categoryManager.resetTooltip')}
              >
                <span className="text-sm">🔄</span>
              </button>

              {/* 구분선 */}
              <div className="w-px h-4 bg-white/20"></div>

              {/* Close 버튼 */}
              <button onClick={onClose} className="glass-button-primary !p-1.5 !px-2.5">
                ✕
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs glass-text opacity-70">
            <span>
              📊 {categories.length} {t('modal.categoryManager.categories')}
            </span>
            <span>
              🏷️ {stats.totalDomains} {t('modal.categoryManager.domains')}
            </span>
          </div>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1.5">
            {categories.map((category, index) => (
              <CategoryItem
                key={category.id}
                category={category}
                index={index}
                isDragged={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/20">
          <button onClick={handleAdd} className="w-full glass-button-primary py-2.5 flex items-center justify-center gap-2">
            <span>➕</span>
            <span>{t('modal.categoryManager.addCategory')}</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CategoryEditModal
        isOpen={editModalOpen}
        category={editingCategory}
        onSave={handleSave}
        onClose={() => {
          setEditModalOpen(false);
          setEditingCategory(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={t('modal.categoryManager.deleteConfirmTitle')}
        message={t('modal.categoryManager.deleteConfirmMessage')}
        confirmText={t('actions.delete')}
        cancelText={t('actions.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTargetId(null);
        }}
        variant="error"
      />

      <ConfirmModal
        isOpen={resetModalOpen}
        title={t('modal.categoryManager.resetConfirmTitle')}
        message={t('modal.categoryManager.resetConfirmMessage')}
        confirmText={t('actions.reset')}
        cancelText={t('actions.cancel')}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
        variant="warning"
      />
    </div>
  );
};
