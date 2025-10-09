// AI-powered tab classification system
import type { TabInfo } from '../store/tabStore';
import { storageUtils } from '../utils/storage';

export interface TabContext {
  tab: TabInfo;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  referrer?: string;
  sessionTabs: TabInfo[];
  userActivity: 'active' | 'idle';
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
  suggestedCategories?: Array<{ category: string; confidence: number }>;
}

export interface UserPattern {
  domain: string;
  categories: Map<string, number>; // category -> count
  timePatterns: Map<string, number>; // timeOfDay -> count
  contextPatterns: Map<string, string[]>; // category -> related domains
}

export class TabClassifier {
  private userPatterns: Map<string, UserPattern> = new Map();
  private categoryDomainMapping: Map<string, string[]> = new Map(); // category -> domains
  private learningEnabled: boolean = true;

  constructor() {
    this.loadUserPatterns();
  }

  // Main classification method
  async classify(context: TabContext): Promise<ClassificationResult> {
    const { tab } = context;
    if (!tab.url) {
      return {
        category: 'other',
        confidence: 1,
        reasoning: 'No URL provided',
      };
    }

    try {
      const url = new URL(tab.url);
      const domain = url.hostname.toLowerCase().replace(/^www\./, '');

      // 1. Check user's explicit mappings first (highest priority)
      const userMapping = await this.getUserMapping(domain);
      if (userMapping) {
        return {
          category: userMapping,
          confidence: 1,
          reasoning: 'User-defined category',
        };
      }

      // 2. Check learned patterns from user behavior
      const learnedCategory = await this.getLearnedCategory(domain, context);
      if (learnedCategory.confidence > 0.7) {
        return learnedCategory;
      }

      // 3. Context-based classification
      const contextCategory = await this.getContextBasedCategory(context);
      if (contextCategory.confidence > 0.6) {
        return contextCategory;
      }

      // 4. Content-based classification (title, meta, etc.)
      const contentCategory = await this.getContentBasedCategory(tab);
      if (contentCategory.confidence > 0.5) {
        return contentCategory;
      }

      // 5. Fallback to basic domain matching
      return this.getBasicCategory(domain, tab.title || '');
    } catch (error) {
      console.error('Classification error:', error);
      return {
        category: 'other',
        confidence: 0.5,
        reasoning: 'Classification error',
      };
    }
  }

  // Learn from user actions
  async learnFromUserAction(domain: string, category: string, context?: TabContext) {
    if (!this.learningEnabled) return;

    // Update user patterns
    if (!this.userPatterns.has(domain)) {
      this.userPatterns.set(domain, {
        domain,
        categories: new Map(),
        timePatterns: new Map(),
        contextPatterns: new Map(),
      });
    }

    const pattern = this.userPatterns.get(domain)!;

    // Update category frequency
    const currentCount = pattern.categories.get(category) || 0;
    pattern.categories.set(category, currentCount + 1);

    // Update time patterns if context provided
    if (context) {
      const timeCount = pattern.timePatterns.get(context.timeOfDay) || 0;
      pattern.timePatterns.set(context.timeOfDay, timeCount + 1);

      // Update context patterns (domains often used together)
      const relatedDomains = context.sessionTabs
        .map((t) => {
          try {
            return new URL(t.url).hostname.replace(/^www\./, '');
          } catch {
            return null;
          }
        })
        .filter((d) => d && d !== domain) as string[];

      if (!pattern.contextPatterns.has(category)) {
        pattern.contextPatterns.set(category, []);
      }
      pattern.contextPatterns.get(category)!.push(...relatedDomains);
    }

    // Update category domain mapping
    if (!this.categoryDomainMapping.has(category)) {
      this.categoryDomainMapping.set(category, []);
    }
    const categoryDomains = this.categoryDomainMapping.get(category)!;
    if (!categoryDomains.includes(domain)) {
      categoryDomains.push(domain);
    }

    // Persist patterns
    await this.saveUserPatterns();
  }

  // Get learned category based on user patterns
  private async getLearnedCategory(domain: string, context: TabContext): Promise<ClassificationResult> {
    const pattern = this.userPatterns.get(domain);
    if (!pattern || pattern.categories.size === 0) {
      return {
        category: 'other',
        confidence: 0,
        reasoning: 'No learned patterns',
      };
    }

    // Calculate category scores based on frequency and context
    const categoryScores = new Map<string, number>();
    let totalCount = 0;

    for (const [category, count] of pattern.categories) {
      totalCount += count;
      let score = count;

      // Boost score if time of day matches common pattern
      const timePattern = pattern.timePatterns.get(context.timeOfDay) || 0;
      if (timePattern > 0) {
        score *= 1 + (timePattern / totalCount) * 0.5;
      }

      // Boost score if related domains are present in current session
      const contextDomains = pattern.contextPatterns.get(category) || [];
      const sessionDomains = context.sessionTabs
        .map((t) => {
          try {
            return new URL(t.url).hostname.replace(/^www\./, '');
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];

      const commonDomains = contextDomains.filter((d) => sessionDomains.includes(d));
      if (commonDomains.length > 0) {
        score *= 1 + (commonDomains.length / sessionDomains.length) * 0.3;
      }

      categoryScores.set(category, score);
    }

    // Find best category
    let bestCategory = 'other';
    let bestScore = 0;

    for (const [category, score] of categoryScores) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    const confidence = Math.min(bestScore / totalCount, 0.95);

    // Get alternative suggestions
    const suggestions = Array.from(categoryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, score]) => ({
        category,
        confidence: Math.min(score / totalCount, 0.95),
      }));

    return {
      category: bestCategory,
      confidence,
      reasoning: `Learned from ${totalCount} past interactions`,
      suggestedCategories: suggestions,
    };
  }

  // Context-based classification
  private async getContextBasedCategory(context: TabContext): Promise<ClassificationResult> {
    const { sessionTabs } = context;

    // Analyze categories of other tabs in the session
    const sessionCategories = new Map<string, number>();

    for (const tab of sessionTabs) {
      if (!tab.url || tab.id === context.tab.id) continue;

      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        const pattern = this.userPatterns.get(domain);

        if (pattern && pattern.categories.size > 0) {
          // Get most likely category for this domain
          let maxCount = 0;
          let likelyCategory = 'other';

          for (const [cat, count] of pattern.categories) {
            if (count > maxCount) {
              maxCount = count;
              likelyCategory = cat;
            }
          }

          sessionCategories.set(likelyCategory, (sessionCategories.get(likelyCategory) || 0) + 1);
        }
      } catch {
        // Ignore invalid URLs
      }
    }

    if (sessionCategories.size === 0) {
      return {
        category: 'other',
        confidence: 0,
        reasoning: 'No context available',
      };
    }

    // Find dominant category in session
    let dominantCategory = 'other';
    let maxCount = 0;

    for (const [category, count] of sessionCategories) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = category;
      }
    }

    const confidence = Math.min((maxCount / sessionTabs.length) * 0.8, 0.8);

    return {
      category: dominantCategory,
      confidence,
      reasoning: `Based on ${maxCount} related tabs in current session`,
    };
  }

  // Content-based classification using title and URL patterns
  private async getContentBasedCategory(tab: TabInfo): Promise<ClassificationResult> {
    const content = `${tab.url} ${tab.title || ''}`.toLowerCase();

    // Define content patterns for each category
    const contentPatterns = {
      work: [
        /\b(jira|confluence|slack|teams|zoom|meet|asana|notion|trello|monday)\b/,
        /\b(dashboard|admin|console|analytics|reports?)\b/,
        /\b(project|task|ticket|issue|sprint)\b/,
      ],
      development: [
        /\b(github|gitlab|bitbucket|stackoverflow|npm|pypi)\b/,
        /\b(code|repository|commit|pull.?request|issue)\b/,
        /\b(documentation|docs|api|sdk|tutorial)\b/,
        /localhost:\d+/,
      ],
      social: [/\b(facebook|twitter|instagram|linkedin|reddit|discord)\b/, /\b(social|friends?|profile|timeline|feed)\b/],
      entertainment: [/\b(youtube|netflix|spotify|twitch|hulu|disney)\b/, /\b(video|movie|music|stream|watch|listen)\b/],
      shopping: [
        /\b(amazon|ebay|shopify|etsy|alibaba)\b/,
        /\b(shop|store|buy|cart|checkout|order)\b/,
        /\b(product|price|deal|discount|sale)\b/,
      ],
      news: [/\b(news|article|blog|post)\b/, /\b(cnn|bbc|reuters|nytimes|guardian)\b/],
      learning: [/\b(course|learn|tutorial|education|university)\b/, /\b(udemy|coursera|khan|edx|skillshare)\b/],
    };

    let bestMatch = { category: 'other', score: 0 };

    for (const [category, patterns] of Object.entries(contentPatterns)) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          score += 1;
        }
      }

      if (score > bestMatch.score) {
        bestMatch = { category, score };
      }
    }

    const confidence = Math.min(bestMatch.score / 3, 0.7); // Max 0.7 for content-based

    return {
      category: bestMatch.category,
      confidence,
      reasoning: `Content analysis found ${bestMatch.score} matching patterns`,
    };
  }

  // Basic fallback classification
  private getBasicCategory(domain: string, _title: string): ClassificationResult {
    // This is the current hard-coded approach as a last resort

    // Quick domain checks
    const domainCategories: Record<string, string> = {
      'github.com': 'development',
      'google.com': 'productivity',
      'youtube.com': 'entertainment',
      'facebook.com': 'social',
      'amazon.com': 'shopping',
    };

    if (domainCategories[domain]) {
      return {
        category: domainCategories[domain],
        confidence: 0.4,
        reasoning: 'Basic domain matching',
      };
    }

    return {
      category: 'other',
      confidence: 0.3,
      reasoning: 'No patterns matched',
    };
  }

  // Helper methods
  private async getUserMapping(domain: string): Promise<string | null> {
    const mapping = await storageUtils.getCategoryMapping();
    return mapping[domain] || null;
  }

  private async loadUserPatterns() {
    try {
      const userPatterns = await storageUtils.getUserPatterns();
      const categoryHistory = await storageUtils.getCategoryHistory();

      if (userPatterns) {
        // Convert stored data back to Maps
        this.userPatterns = new Map(
          Object.entries(userPatterns).map(([domain, pattern]: [string, any]) => [
            domain,
            {
              ...pattern,
              categories: new Map(Object.entries(pattern.categories || {})),
              timePatterns: new Map(Object.entries(pattern.timePatterns || {})),
              contextPatterns: new Map(Object.entries(pattern.contextPatterns || {})),
            },
          ]),
        );
      }

      if (categoryHistory) {
        // categoryHistory from storage is used for category -> domains mapping
        // Cast through unknown since we're repurposing the storage key
        this.categoryDomainMapping = new Map(Object.entries(categoryHistory) as unknown as [string, string[]][]);
      }
    } catch (error) {
      console.error('Failed to load user patterns:', error);
    }
  }

  private async saveUserPatterns() {
    try {
      // Convert Maps to plain objects for storage
      const patternsObj: any = {};
      for (const [domain, pattern] of this.userPatterns) {
        patternsObj[domain] = {
          ...pattern,
          categories: Object.fromEntries(pattern.categories),
          timePatterns: Object.fromEntries(pattern.timePatterns),
          contextPatterns: Object.fromEntries(pattern.contextPatterns),
        };
      }

      await storageUtils.setUserPatterns(patternsObj);
      // Store category domain mapping as plain object
      await storageUtils.setCategoryHistory(Object.fromEntries(this.categoryDomainMapping) as any);
    } catch (error) {
      console.error('Failed to save user patterns:', error);
    }
  }

  // Enable/disable learning
  setLearningEnabled(enabled: boolean) {
    this.learningEnabled = enabled;
  }

  // Get insights about user patterns
  getUserInsights(): Map<string, any> {
    const insights = new Map();

    // Most categorized domains
    const domainsByCategory = new Map<string, number>();
    for (const [, pattern] of this.userPatterns) {
      for (const [category, count] of pattern.categories) {
        domainsByCategory.set(category, (domainsByCategory.get(category) || 0) + count);
      }
    }

    insights.set('categoryCounts', Object.fromEntries(domainsByCategory));
    insights.set('totalDomains', this.userPatterns.size);
    insights.set('learningEnabled', this.learningEnabled);

    return insights;
  }
}

// Singleton instance
export const tabClassifier = new TabClassifier();
