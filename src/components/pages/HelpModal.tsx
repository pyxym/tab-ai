import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 도움말 모달 컴포넌트의 Props
 */
interface HelpModalProps {
  isOpen: boolean; // 모달 열림 상태
  onClose: () => void; // 모달 닫기 핸들러
}

/**
 * 도움말 모달 컴포넌트
 * TabQuest 확장 프로그램의 실용적인 사용 가이드 제공
 *
 * @component
 * @param {HelpModalProps} props - 컴포넌트 속성
 */
export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'quickstart' | 'features' | 'tips'>('quickstart');

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // Quick Start 섹션
  const quickStartSteps = [
    {
      step: '1',
      icon: '🎯',
      title: t('modal.help.quickStart.step1.title'),
      description: t('modal.help.quickStart.step1.description'),
    },
    {
      step: '2',
      icon: '🏷️',
      title: t('modal.help.quickStart.step2.title'),
      description: t('modal.help.quickStart.step2.description'),
    },
    {
      step: '3',
      icon: '🧹',
      title: t('modal.help.quickStart.step3.title'),
      description: t('modal.help.quickStart.step3.description'),
    },
  ];

  // Core Features 섹션
  const coreFeatures = [
    {
      icon: '🧹',
      iconBg: 'from-purple-500/20 to-pink-500/20',
      title: t('modal.help.features.smartOrganize.title'),
      description: t('modal.help.features.smartOrganize.description'),
      details: t('modal.help.features.smartOrganize.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.smartOrganize.example'),
    },
    {
      icon: '🏷️',
      iconBg: 'from-blue-500/20 to-cyan-500/20',
      title: t('modal.help.features.categoryManagement.title'),
      description: t('modal.help.features.categoryManagement.description'),
      details: t('modal.help.features.categoryManagement.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.categoryManagement.example'),
    },
    {
      icon: '💾',
      iconBg: 'from-green-500/20 to-emerald-500/20',
      title: t('modal.help.features.snapshots.title'),
      description: t('modal.help.features.snapshots.description'),
      details: t('modal.help.features.snapshots.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.snapshots.example'),
    },
    {
      icon: '↶',
      iconBg: 'from-orange-500/20 to-yellow-500/20',
      title: t('modal.help.features.undoRedo.title'),
      description: t('modal.help.features.undoRedo.description'),
      details: t('modal.help.features.undoRedo.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.undoRedo.example'),
    },
    {
      icon: '🤖',
      iconBg: 'from-indigo-500/20 to-purple-500/20',
      title: t('modal.help.features.aiInsights.title'),
      description: t('modal.help.features.aiInsights.description'),
      details: t('modal.help.features.aiInsights.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.aiInsights.example'),
    },
    {
      icon: '📊',
      iconBg: 'from-pink-500/20 to-rose-500/20',
      title: t('modal.help.features.tabGroups.title'),
      description: t('modal.help.features.tabGroups.description'),
      details: t('modal.help.features.tabGroups.details', { returnObjects: true }) as string[],
      example: t('modal.help.features.tabGroups.example'),
    },
  ];

  // Tips & Tricks 섹션
  const tips = [
    {
      icon: '⚡',
      title: t('modal.help.tips.domainMapping.title'),
      description: t('modal.help.tips.domainMapping.description'),
    },
    {
      icon: '🎨',
      title: t('modal.help.tips.colorCoding.title'),
      description: t('modal.help.tips.colorCoding.description'),
    },
    {
      icon: '🔄',
      title: t('modal.help.tips.autoSync.title'),
      description: t('modal.help.tips.autoSync.description'),
    },
    {
      icon: '🌍',
      title: t('modal.help.tips.multiLanguage.title'),
      description: t('modal.help.tips.multiLanguage.description'),
    },
    {
      icon: '🗑️',
      title: t('modal.help.tips.dataManagement.title'),
      description: t('modal.help.tips.dataManagement.description'),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[20px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                <span className="text-2xl">📖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold glass-text">{t('modal.help.title')}</h2>
                <p className="text-xs glass-text opacity-60">{t('modal.help.subtitle')}</p>
              </div>
            </div>
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3 hover:scale-110 transition-transform">
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-white/20 flex gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-4 py-2 rounded-t-lg transition-all ${
              activeTab === 'quickstart'
                ? 'bg-gradient-to-b from-purple-500/30 to-transparent glass-text font-semibold'
                : 'glass-text opacity-60 hover:opacity-100'
            }`}
          >
            ✨ {t('modal.help.tabs.quickStart')}
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 rounded-t-lg transition-all ${
              activeTab === 'features'
                ? 'bg-gradient-to-b from-purple-500/30 to-transparent glass-text font-semibold'
                : 'glass-text opacity-60 hover:opacity-100'
            }`}
          >
            🚀 {t('modal.help.tabs.features')}
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-4 py-2 rounded-t-lg transition-all ${
              activeTab === 'tips'
                ? 'bg-gradient-to-b from-purple-500/30 to-transparent glass-text font-semibold'
                : 'glass-text opacity-60 hover:opacity-100'
            }`}
          >
            💡 {t('modal.help.tabs.tips')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Quick Start Tab */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6">
              <div className="glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">👋</span>
                  <div>
                    <h3 className="font-semibold glass-text mb-2">{t('modal.help.quickStart.welcome.title')}</h3>
                    <p className="text-sm glass-text opacity-80">{t('modal.help.quickStart.welcome.description')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {quickStartSteps.map((step, index) => (
                  <div key={index} className="glass-card hover:scale-[1.02] transition-transform">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                        <span className="text-xl font-bold glass-text">{step.step}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{step.icon}</span>
                          <h3 className="font-semibold glass-text">{step.title}</h3>
                        </div>
                        <p className="text-sm glass-text opacity-80">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              {coreFeatures.map((feature, index) => (
                <div key={index} className="glass-card hover:scale-[1.01] transition-transform">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center`}
                    >
                      <span className="text-3xl">{feature.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold glass-text text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm glass-text opacity-80 mb-3">{feature.description}</p>

                      {/* Details */}
                      <div className="bg-white/5 rounded-lg p-3 mb-3">
                        <ul className="space-y-1.5">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="text-xs glass-text opacity-70 flex items-start">
                              <span className="text-purple-400 mr-2 flex-shrink-0">→</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Example */}
                      <div className="flex items-start gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3">
                        <span className="text-sm flex-shrink-0">💡</span>
                        <p className="text-xs glass-text opacity-80 italic">{feature.example}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === 'tips' && (
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <div key={index} className="glass-card hover:scale-[1.02] transition-transform">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold glass-text mb-1">{tip.title}</h3>
                      <p className="text-sm glass-text opacity-80">{tip.description}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Additional Info */}
              <div className="glass-card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 mt-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-semibold glass-text mb-2">{t('modal.help.tips.privacy.title')}</h3>
                    <p className="text-sm glass-text opacity-80">{t('modal.help.tips.privacy.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/20 flex items-center justify-between flex-shrink-0">
          <div className="text-xs glass-text opacity-60">
            TabQuest v1.0.0 • {t('modal.help.footer.madeWith')} 💜
          </div>
          <button onClick={onClose} className="glass-button-primary px-4 py-2 text-sm">
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
