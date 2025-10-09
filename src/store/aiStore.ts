import { create } from 'zustand';
import { ErrorBoundary, DataValidator } from '../utils/errorBoundary';

export interface AIInsight {
  id: string;
  type: 'suggestion' | 'pattern' | 'alert' | 'tip';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  actionable?: {
    label: string;
    action: () => void;
  };
}

export interface BrowsingPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  lastOccurred: number;
  suggestedAction?: string;
}

interface AIStore {
  insights: AIInsight[];
  patterns: BrowsingPattern[];
  productivityScore: number;
  isAnalyzing: boolean;
  lastAnalysis: number | null;

  addInsight: (insight: AIInsight) => void;
  removeInsight: (insightId: string) => void;
  clearInsights: () => void;

  setPatterns: (patterns: BrowsingPattern[]) => void;
  updatePattern: (patternId: string, updates: Partial<BrowsingPattern>) => void;

  setProductivityScore: (score: number) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setLastAnalysis: (timestamp: number) => void;
}

// Configuration
const MAX_INSIGHTS = 20; // Increased from hard-coded 10
const MAX_PATTERNS = 50;

export const useAIStore = create<AIStore>((set, get) => ({
  insights: [],
  patterns: [],
  productivityScore: 0,
  isAnalyzing: false,
  lastAnalysis: null,

  addInsight: (insight) =>
    ErrorBoundary.wrapSync(
      () => {
        if (!DataValidator.validateInsight(insight)) {
          console.error('[aiStore] Invalid insight data:', insight);
          return;
        }

        // Sanitize strings
        insight.title = DataValidator.sanitizeString(insight.title, 200);
        insight.description = DataValidator.sanitizeString(insight.description, 500);

        // Prevent duplicate insights
        const state = get();

        if (state.insights.some((i) => i.id === insight.id)) {
          console.warn('[aiStore] Insight already exists:', insight.id);
          return;
        }

        // Add insight with priority-based sorting
        set((state) => {
          const newInsights = [insight, ...state.insights];
          // Sort by priority and timestamp
          newInsights.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.timestamp - a.timestamp;
          });
          return { insights: newInsights.slice(0, MAX_INSIGHTS) };
        });
      },
      undefined,
      'aiStore.addInsight',
    ),

  removeInsight: (insightId) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof insightId !== 'string') {
          console.error('Invalid insightId:', insightId);
          return;
        }
        set((state) => ({
          insights: state.insights.filter((i) => i.id !== insightId),
        }));
      },
      undefined,
      'aiStore.removeInsight',
    ),

  clearInsights: () => set({ insights: [] }),

  setPatterns: (patterns) =>
    ErrorBoundary.wrapSync(
      () => {
        // Validate patterns
        const validPatterns = patterns
          .filter((pattern) => {
            if (!pattern.id || !pattern.name || typeof pattern.frequency !== 'number') {
              console.warn('Invalid pattern data:', pattern);
              return false;
            }
            return true;
          })
          .slice(0, MAX_PATTERNS);

        // Sanitize strings
        validPatterns.forEach((pattern) => {
          pattern.name = DataValidator.sanitizeString(pattern.name, 100);
          pattern.description = DataValidator.sanitizeString(pattern.description, 300);
          if (pattern.suggestedAction) {
            pattern.suggestedAction = DataValidator.sanitizeString(pattern.suggestedAction, 200);
          }
        });

        set({ patterns: validPatterns });
      },
      undefined,
      'aiStore.setPatterns',
    ),

  updatePattern: (patternId, updates) =>
    ErrorBoundary.wrapSync(
      () => {
        if (typeof patternId !== 'string') {
          console.error('Invalid patternId:', patternId);
          return;
        }

        // Sanitize updates
        if (updates.name) {
          updates.name = DataValidator.sanitizeString(updates.name, 100);
        }
        if (updates.description) {
          updates.description = DataValidator.sanitizeString(updates.description, 300);
        }
        if (updates.suggestedAction) {
          updates.suggestedAction = DataValidator.sanitizeString(updates.suggestedAction, 200);
        }

        set((state) => ({
          patterns: state.patterns.map((pattern) => (pattern.id === patternId ? { ...pattern, ...updates } : pattern)),
        }));
      },
      undefined,
      'aiStore.updatePattern',
    ),

  setProductivityScore: (productivityScore) =>
    ErrorBoundary.wrapSync(
      () => {
        // Validate score is between 0 and 100
        const validScore = Math.max(0, Math.min(100, productivityScore));
        if (isNaN(validScore)) {
          console.error('Invalid productivity score:', productivityScore);
          return;
        }
        set({ productivityScore: validScore });
      },
      undefined,
      'aiStore.setProductivityScore',
    ),

  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setLastAnalysis: (lastAnalysis) => set({ lastAnalysis }),
}));
