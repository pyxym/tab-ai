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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
      <div className="glass-main rounded-[24px] w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xl">?</span>
            </div>
            <div>
              <h2 className="text-xl font-bold ai-gradient-text">{t('modal.help.tabQuestGuide')}</h2>
              <p className="text-sm glass-text opacity-70">{t('modal.help.subtitle')}</p>
            </div>
          </div>
          {/* 닫기 버튼 */}
          <button onClick={onClose} className="glass-button-primary !p-2 !px-3">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          {/* AI Learning Status */}
          <div className="glass-card mb-6 border-2 border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🧠</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold glass-text mb-2">{t('modal.help.aiLearningStatus.title')}</h3>
                <p className="text-sm glass-text opacity-80 mb-3">{t('modal.help.aiLearningStatus.description')}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                  </div>
                  <span className="text-xs glass-text opacity-60">{t('modal.help.aiLearningStatus.learning')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <div key={index} className="glass-card hover:scale-[1.02] transition-transform">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold glass-text mb-2">{feature.title}</h3>
                    <p className="text-sm glass-text opacity-80 mb-3">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.details.map((detail, idx) => (
                        <li key={idx} className="text-xs glass-text opacity-60 flex items-start">
                          <span className="text-purple-400 mr-2">→</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
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
