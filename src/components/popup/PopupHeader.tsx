import React from 'react';
import { useTranslation } from 'react-i18next';
import { AILogo } from '../shared/AILogo';

interface PopupHeaderProps {
  onHelpClick: () => void;
  onTabGroupsClick: () => void;
  onTabListClick: () => void;
  onCategoryManagerClick: () => void;
  onSettingsClick: () => void;
}

export const PopupHeader = React.memo(function PopupHeader({
  onHelpClick,
  onTabGroupsClick,
  onTabListClick,
  onCategoryManagerClick,
  onSettingsClick,
}: PopupHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3 border-b border-white/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AILogo size="medium" />
          <div>
            <h1 className="font-bold text-base ai-gradient-text leading-tight">TabQuest</h1>
            <p className="text-[10px] glass-text opacity-70 leading-tight">{t('header.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={onHelpClick} className="glass-card p-1.5 transition-all hover:scale-105" title="Help & Guide">
            <svg className="w-3.5 h-3.5 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          <button onClick={onTabGroupsClick} className="glass-card p-1.5 transition-all hover:scale-105" title={t('tooltips.tabGroups')}>
            <svg className="w-3.5 h-3.5 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </button>

          <button onClick={onTabListClick} className="glass-card p-1.5 transition-all hover:scale-105" title={t('tooltips.assign')}>
            <svg className="w-3.5 h-3.5 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 4 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </button>

          <button onClick={onCategoryManagerClick} className="glass-card p-1.5 transition-all hover:scale-105" title={t('tooltips.categories')}>
            <svg className="w-3.5 h-3.5 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </button>

          <button className="glass-card p-1.5 transition-all hover:scale-105" title="Settings" onClick={onSettingsClick}>
            <svg className="w-3.5 h-3.5 glass-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
