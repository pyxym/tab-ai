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
  const {
    categories,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    resetToMinimal,
    applyRecommendedCategories,
  } = useCategoryStore();

  // Modal states - consolidated
  const [modals, setModals] = useState({
    edit: false,
    reset: false,
    recommended: false,
    delete: false,
  });

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

  // Toggle modal helper
  const toggleModal = useCallback((modal: keyof typeof modals, value?: boolean) => {
    setModals((prev) => ({ ...prev, [modal]: value ?? !prev[modal] }));
  }, []);

  // Edit handler
  const handleEdit = useCallback(
    (category: Category) => {
      if (category.isSystem) {
        alert(t('tooltips.categoryManager.cannotEditSystem'));
        return;
      }
      setEditingCategory(category);
      toggleModal('edit', true);
    },
    [t, toggleModal],
  );

  // Add handler
  const handleAdd = useCallback(() => {
    setEditingCategory(null);
    toggleModal('edit', true);
  }, [toggleModal]);

  // Save handler
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
        toggleModal('edit', false);
        setEditingCategory(null);
      } catch (error: any) {
        if (error.message === 'Maximum 30 categories allowed') {
          alert(t('messages.maxCategoriesReached'));
        } else {
          alert(error.message);
        }
      }
    },
    [editingCategory, updateCategory, addCategory, t, toggleModal],
  );

  // Delete handler
  const handleDelete = useCallback(
    (id: string) => {
      const category = categories.find((c) => c.id === id);
      if (category?.isSystem) {
        alert(t('tooltips.categoryManager.cannotDeleteSystem'));
        return;
      }
      setDeleteTargetId(id);
      toggleModal('delete', true);
    },
    [categories, t, toggleModal],
  );

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (deleteTargetId) {
      try {
        await deleteCategory(deleteTargetId);
      } catch (error) {
        alert(t('tooltips.categoryManager.defaultCannotDelete'));
      }
    }
    toggleModal('delete', false);
    setDeleteTargetId(null);
  }, [deleteTargetId, deleteCategory, t, toggleModal]);

  // Reset handler
  const handleConfirmReset = useCallback(async () => {
    await resetToMinimal();
    toggleModal('reset', false);
  }, [resetToMinimal, toggleModal]);

  // Recommended handler
  const handleConfirmRecommended = useCallback(async () => {
    await applyRecommendedCategories();
    toggleModal('recommended', false);
  }, [applyRecommendedCategories, toggleModal]);

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
      <div className="glass-main rounded-[24px] w-full max-w-3xl h-[96vh] max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20">
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleApplyGrouping}
                disabled={isOrganizing}
                className="glass-button-primary !py-2 !px-3 text-sm flex items-center gap-1.5 disabled:opacity-50"
                title={t('modal.tabCategoryOrganizer.applyButtonTooltip')}
              >
                {isOrganizing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>{t('modal.tabCategoryOrganizer.applying')}</span>
                  </>
                ) : (
                  <>🎯 {t('modal.tabCategoryOrganizer.applyGrouping')}</>
                )}
              </button>
              <button
                onClick={() => toggleModal('reset', true)}
                className="glass-button-primary !p-2 !px-3"
                title={t('modal.categoryManager.resetTooltip')}
              >
                🔄
              </button>
              <button
                onClick={() => toggleModal('recommended', true)}
                className="glass-button-primary !p-2 !px-3"
                title={t('modal.categoryManager.applyRecommendedTooltip')}
              >
                📦
              </button>
              <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
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
        isOpen={modals.edit}
        category={editingCategory}
        onSave={handleSave}
        onClose={() => {
          toggleModal('edit', false);
          setEditingCategory(null);
        }}
      />

      <ConfirmModal
        isOpen={modals.delete}
        title={t('modal.categoryManager.deleteConfirmTitle')}
        message={t('modal.categoryManager.deleteConfirmMessage')}
        confirmText={t('actions.delete')}
        cancelText={t('actions.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          toggleModal('delete', false);
          setDeleteTargetId(null);
        }}
        variant="error"
      />

      <ConfirmModal
        isOpen={modals.reset}
        title={t('modal.categoryManager.resetConfirmTitle')}
        message={t('modal.categoryManager.resetConfirmMessage')}
        confirmText={t('actions.reset')}
        cancelText={t('actions.cancel')}
        onConfirm={handleConfirmReset}
        onCancel={() => toggleModal('reset', false)}
        variant="warning"
      />

      <ConfirmModal
        isOpen={modals.recommended}
        title={t('modal.categoryManager.recommendedConfirmTitle')}
        message={t('modal.categoryManager.recommendedConfirmMessage')}
        confirmText={t('actions.apply')}
        cancelText={t('actions.cancel')}
        onConfirm={handleConfirmRecommended}
        onCancel={() => toggleModal('recommended', false)}
      />
    </div>
  );
};
