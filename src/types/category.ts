// Extended color palette (20 colors)
export type ExtendedColorEnum =
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange'
  | 'grey'
  | 'indigo'
  | 'teal'
  | 'lime'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'sky'
  | 'emerald'
  | 'fuchsia'
  | 'slate'
  | 'stone';

// Map extended colors to Chrome tab group colors
export const COLOR_TO_CHROME_GROUP: Record<ExtendedColorEnum, chrome.tabGroups.ColorEnum> = {
  blue: 'blue',
  red: 'red',
  yellow: 'yellow',
  green: 'green',
  pink: 'pink',
  purple: 'purple',
  cyan: 'cyan',
  orange: 'orange',
  grey: 'grey',
  indigo: 'purple',
  teal: 'cyan',
  lime: 'green',
  amber: 'yellow',
  rose: 'pink',
  violet: 'purple',
  sky: 'cyan',
  emerald: 'green',
  fuchsia: 'pink',
  slate: 'grey',
  stone: 'grey',
};

// Tailwind CSS color classes for UI display
export const COLOR_CLASSES: Record<ExtendedColorEnum, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
  grey: 'bg-gray-500',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  lime: 'bg-lime-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  fuchsia: 'bg-fuchsia-500',
  slate: 'bg-slate-500',
  stone: 'bg-stone-500',
};

export interface Category {
  id: string;
  name: string;
  color: ExtendedColorEnum;
  domains: string[];
  keywords: string[];
  isDefault: boolean;
  isSystem?: boolean; // System categories cannot be edited or deleted
  createdAt: number;
}

export interface CategoryMapping {
  [domain: string]: string; // domain -> categoryId
}

// Default categories - minimal starting point
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'uncategorized',
    name: 'Uncategorized',
    color: 'grey',
    domains: [],
    keywords: [],
    isDefault: true,
    isSystem: true,
    createdAt: Date.now(),
  },
];

// Recommended category presets for quick setup
export const RECOMMENDED_CATEGORIES: Category[] = [
  {
    id: 'work',
    name: 'Work',
    color: 'indigo',
    domains: [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'stackoverflow.com',
      'localhost',
      'vercel.app',
      'netlify.app',
      'jira.atlassian.com',
      'slack.com',
      'notion.so',
      'figma.com',
      'linear.app',
    ],
    keywords: ['dev', 'code', 'api', 'project', 'design', 'task', 'deploy'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'social',
    name: 'Social',
    color: 'rose',
    domains: [
      'twitter.com',
      'x.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'discord.com',
      'telegram.org',
      'whatsapp.com',
      'threads.net',
      'mastodon.social',
    ],
    keywords: ['social', 'chat', 'message', 'post', 'community'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: 'red',
    domains: [
      'youtube.com',
      'netflix.com',
      'twitch.tv',
      'spotify.com',
      'soundcloud.com',
      'vimeo.com',
      'hulu.com',
      'disneyplus.com',
      'primevideo.com',
      'hbomax.com',
    ],
    keywords: ['video', 'watch', 'stream', 'music', 'movie', 'show', 'podcast'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'shopping',
    name: 'Shopping',
    color: 'emerald',
    domains: [
      'amazon.com',
      'ebay.com',
      'aliexpress.com',
      'etsy.com',
      'walmart.com',
      'target.com',
      'bestbuy.com',
      'shopify.com',
      'wish.com',
      'ikea.com',
    ],
    keywords: ['shop', 'store', 'buy', 'cart', 'order', 'deal', 'product'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'news',
    name: 'News & Media',
    color: 'amber',
    domains: [
      'cnn.com',
      'bbc.com',
      'reddit.com',
      'hackernews.com',
      'nytimes.com',
      'reuters.com',
      'bloomberg.com',
      'techcrunch.com',
      'theverge.com',
      'arstechnica.com',
      'medium.com',
    ],
    keywords: ['news', 'blog', 'article', 'media', 'press', 'tech'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'education',
    name: 'Education',
    color: 'yellow',
    domains: [
      'coursera.org',
      'udemy.com',
      'khanacademy.org',
      'edx.org',
      'udacity.com',
      'pluralsight.com',
      'wikipedia.org',
      'skillshare.com',
      'masterclass.com',
      'duolingo.com',
    ],
    keywords: ['learn', 'course', 'study', 'education', 'tutorial', 'training', 'class'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'finance',
    name: 'Finance',
    color: 'teal',
    domains: [
      'bankofamerica.com',
      'chase.com',
      'paypal.com',
      'coinbase.com',
      'robinhood.com',
      'mint.com',
      'personalcapital.com',
      'binance.com',
      'kraken.com',
      'wise.com',
    ],
    keywords: ['bank', 'finance', 'money', 'payment', 'invest', 'crypto', 'trading'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'gaming',
    name: 'Gaming',
    color: 'fuchsia',
    domains: [
      'steam.com',
      'epicgames.com',
      'gog.com',
      'itch.io',
      'playstation.com',
      'xbox.com',
      'nintendo.com',
      'riotgames.com',
      'blizzard.com',
      'ea.com',
    ],
    keywords: ['game', 'gaming', 'play', 'steam', 'esports', 'gamer', 'console'],
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'research',
    name: 'Research',
    color: 'slate',
    domains: [
      'scholar.google.com',
      'pubmed.ncbi.nlm.nih.gov',
      'arxiv.org',
      'jstor.org',
      'researchgate.net',
      'academia.edu',
      'sciencedirect.com',
      'stackoverflow.com',
      'github.com',
      'developer.mozilla.org',
    ],
    keywords: ['research', 'paper', 'academic', 'study', 'journal', 'science', 'documentation'],
    isDefault: true,
    createdAt: Date.now(),
  },
];
