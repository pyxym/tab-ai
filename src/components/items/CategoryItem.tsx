import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Category } from '../../types/category';
import { getColorHex } from '../../utils/colorUtils';

interface CategoryItemProps {
  category: Category;
  index: number;
  isDragged: boolean;
  isDragOver: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

/**
 * Memoized category list item component
 * Renders a single category with drag-drop and action buttons
 */
export const CategoryItem = React.memo(function CategoryItem({
  category,
  index,
  isDragged,
  isDragOver,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: CategoryItemProps) {
  const { t } = useTranslation();
  const colorHex = getColorHex(category.color);

  return (
    <div
      draggable={!category.isSystem}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={`
        glass-card p-2.5 transition-all duration-200
        ${category.isSystem ? 'opacity-60 cursor-not-allowed' : 'cursor-move hover:scale-[1.01] hover:shadow-lg'}
        ${isDragged ? 'opacity-40 scale-95' : ''}
        ${isDragOver ? 'border-2 border-purple-400 bg-purple-500/10' : ''}
      `}
    >
      <div className="flex items-center gap-2.5">
        {/* Drag handle - more subtle */}
        {!category.isSystem && (
          <div className="text-gray-400 hover:text-gray-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </div>
        )}

        {/* Color indicator - smaller */}
        <div className="w-5 h-5 rounded-md flex-shrink-0 shadow-sm" style={{ backgroundColor: colorHex }} />

        {/* Category info - optimized layout */}
        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="text-sm font-medium glass-text truncate">{category.name}</h3>
            {category.isSystem && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/20 glass-text flex-shrink-0">System</span>
            )}
            {category.isDefault && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 glass-text flex-shrink-0">Default</span>
            )}
          </div>

          {/* Domain count badge - more prominent (hide for uncategorized) */}
          {category.id !== 'uncategorized' && (
            <div className="flex items-center gap-1.5 text-[11px] glass-text opacity-60 flex-shrink-0">
              <span className="font-mono font-semibold">{category.domains.length}</span>
              <span>{t('categories.domains')}</span>
            </div>
          )}
        </div>

        {/* Action buttons - slimmer and icon-only */}
        {!category.isSystem && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(category)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              title="Edit category"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete category"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
