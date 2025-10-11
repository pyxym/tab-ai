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
    <div className="px-3 py-2">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="glass-card !py-3 text-center">
          <p className="text-3xl font-bold glass-text mb-1">{tabCount}</p>
          <p className="text-[10px] glass-text opacity-70 leading-tight">{t('stats.activeTabs')}</p>
        </div>
        <div className="glass-card !py-3 text-center">
          <p className="text-3xl font-bold glass-text mb-1">{groupCount}</p>
          <p className="text-[10px] glass-text opacity-70 leading-tight">{t('stats.categories')}</p>
        </div>
        <div className="glass-card !py-3 text-center">
          <p className="text-3xl font-bold glass-text mb-1">{duplicateCount}</p>
          <p className="text-[10px] glass-text opacity-70 leading-tight">{t('stats.duplicates')}</p>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card !py-2 px-2 opacity-60 relative">
          <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
          <div className="flex items-center gap-2">
            <div className="text-xl">🧠</div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold glass-text leading-tight">AI Learning</p>
              <p className="text-[9px] glass-text opacity-70">0 domains</p>
            </div>
          </div>
        </div>
        <div className="glass-card !py-2 px-2 opacity-60 relative">
          <div className="absolute top-1 right-1 text-[8px] bg-purple-500/30 px-1.5 py-0.5 rounded-full glass-text">Soon</div>
          <div className="flex items-center gap-2">
            <div className="text-xl">💯</div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold glass-text leading-tight">Productivity</p>
              <p className="text-[9px] glass-text opacity-70">Score ↑</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
