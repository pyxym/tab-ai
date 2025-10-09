import React from 'react';
import { useTranslation } from 'react-i18next';

interface PopupStatsProps {
  tabCount: number;
  groupCount: number;
  duplicateCount: number;
}

export const PopupStats = React.memo(function PopupStats({ tabCount, groupCount, duplicateCount }: PopupStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-2">
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div className="glass-card !py-2 text-center">
          <p className="text-2xl font-bold glass-text">{tabCount}</p>
          <p className="text-xs glass-text opacity-70">{t('stats.activeTabs')}</p>
        </div>
        <div className="glass-card !py-2 text-center">
          <p className="text-2xl font-bold glass-text">{groupCount}</p>
          <p className="text-xs glass-text opacity-70">{t('stats.categories')}</p>
        </div>
        <div className="glass-card !py-2 text-center">
          <p className="text-2xl font-bold glass-text">{duplicateCount}</p>
          <p className="text-xs glass-text opacity-70">{t('stats.duplicates')}</p>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card !py-2 px-3 opacity-60 relative">
          <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl">🧠</div>
            <div className="flex-1">
              <p className="text-xs font-semibold glass-text">AI Learning</p>
              <p className="text-[10px] glass-text opacity-70">0 domains</p>
            </div>
          </div>
        </div>
        <div className="glass-card !py-2 px-3 opacity-60 relative">
          <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl">💯</div>
            <div className="flex-1">
              <p className="text-xs font-semibold glass-text">Productivity</p>
              <p className="text-[10px] glass-text opacity-70">Score ↑</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
