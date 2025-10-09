import { useCallback, useState } from 'react';
import type { Category } from '../types/category';

/**
 * Custom hook for drag and drop functionality in category list
 * Handles drag state and reordering logic
 */
export function useCategoryDragDrop(categories: Category[], onReorder: (newCategories: Category[]) => Promise<void>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      // Prevent dragging system categories
      if (categories[index].isSystem) {
        e.preventDefault();
        return;
      }
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    },
    [categories],
  );

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      // Prevent dropping on system categories
      if (categories[dropIndex].isSystem) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      // Reorder categories
      const newCategories = [...categories];
      const [draggedItem] = newCategories.splice(draggedIndex, 1);
      newCategories.splice(dropIndex, 0, draggedItem);

      await onReorder(newCategories);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, categories, onReorder],
  );

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
}
