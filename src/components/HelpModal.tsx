import React from 'react';
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
 * TabQuest 확장 프로그램의 주요 기능 설명과 사용법 제공
 *
 * @component
 * @param {HelpModalProps} props - 컴포넌트 속성
 */
export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  // 기능 설명 데이터 (다국어 지원)
  const features = [
    {
      icon: '🤖', // AI 스마트 정리
      title: t('modal.help.features.aiSmartOrganize.title'),
      description: t('modal.help.features.aiSmartOrganize.description'),
      details: t('modal.help.features.aiSmartOrganize.details', {
        returnObjects: true,
      }) as string[],
    },
    {
      icon: '🏷️', // 카테고리 관리
      title: t('modal.help.features.categoryManagement.title'),
      description: t('modal.help.features.categoryManagement.description'),
      details: t('modal.help.features.categoryManagement.details', {
        returnObjects: true,
      }) as string[],
    },
    {
      icon: '📊', // 생산성 인사이트
      title: t('modal.help.features.productivityInsights.title'),
      description: t('modal.help.features.productivityInsights.description'),
      details: t('modal.help.features.productivityInsights.details', {
        returnObjects: true,
      }) as string[],
    },
    {
      icon: '🧹', // 스마트 정리
      title: t('modal.help.features.smartCleanup.title'),
      description: t('modal.help.features.smartCleanup.description'),
      details: t('modal.help.features.smartCleanup.details', { returnObjects: true }) as string[],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] py-2 px-4">
      <div className="glass-main rounded-[24px] w-full max-w-3xl max-h-[96vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold ai-gradient-text">{t('modal.help.tabQuestGuide')}</h2>
            </div>
            {/* 닫기 버튼 */}
            <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(96vh-57px)]">
          {/* AI Learning Status - Coming Soon */}
          <div className="glass-card mb-6 border-2 border-purple-500/30 opacity-60 relative">
            <div className="absolute top-2 right-2 text-[10px] bg-purple-500/40 px-2 py-1 rounded-full glass-text font-semibold">
              Coming Soon
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🧠</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold glass-text mb-2">{t('modal.help.aiLearningStatus.title')}</h3>
                <p className="text-sm glass-text opacity-80">{t('modal.help.aiLearningStatus.description')}</p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4">
            {features.map((feature, index) => {
              // Productivity Insights를 Coming Soon으로 표시
              const isProductivityInsights = feature.icon === '📊';

              return (
                <div key={index} className={`glass-card hover:scale-[1.02] transition-transform ${isProductivityInsights ? 'opacity-60 relative' : ''}`}>
                  {isProductivityInsights && (
                    <div className="absolute top-2 right-2 text-[10px] bg-purple-500/40 px-2 py-1 rounded-full glass-text font-semibold">
                      Coming Soon
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold glass-text mb-2">{feature.title}</h3>
                      <p className="text-sm glass-text opacity-80 mb-3">{feature.description}</p>
                      {!isProductivityInsights && (
                        <ul className="space-y-1">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="text-xs glass-text opacity-60 flex items-start">
                              <span className="text-purple-400 mr-2">→</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips Section */}
          <div className="mt-6 glass-card bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <h3 className="font-semibold glass-text mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              {t('modal.help.proTips.title')}
            </h3>
            <ul className="space-y-2">
              {(t('modal.help.proTips.tips', { returnObjects: true }) as string[]).map((tip, index) => (
                <li key={index} className="text-sm glass-text opacity-80 flex items-start">
                  <span className="text-yellow-400 mr-2">★</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
