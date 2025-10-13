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
    </div>
  );
});
