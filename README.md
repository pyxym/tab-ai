# TabQuest - Intelligent Tab Assistant

## 🚀 Overview

TabQuest is an intelligent browser tab management extension for Chrome and Edge that helps users organize, track, and optimize their browsing experience. Using smart categorization and usage analytics, TabQuest transforms chaotic browser sessions into organized, productive workspaces.

🌍 **Multi-language Support**: Available in English, Korean (한국어), and Japanese (日本語)

## ✨ Key Features

### 📊 Smart Tab Organization

- **Category-based Organization**: Create custom categories and organize tabs automatically
- **Tab Groups Integration**: Seamlessly works with Chrome's native tab groups
- **Undo/Redo**: Full undo/redo support for all organization actions
- **Snapshot Management**: Save and restore tab states

### 📈 Usage Analytics

- **Tab Tracking**: Monitor time spent and access frequency per tab
- **Daily Statistics**: Track productivity with daily breakdowns and trends
- **Productivity Score**: Real-time scoring based on browsing habits
- **Visual Charts**: Interactive charts showing usage patterns

### 🎯 Intelligent Features

- **Smart Tab Filtering**: Filter by domain, title, or usage patterns
- **AI Insights**: Get suggestions to improve productivity
- **Tab Group Management**: View and manage existing tab groups
- **Custom Color Themes**: Choose from 10+ vibrant colors for categories

### 🎨 Modern UI/UX

- **Glass Morphism Design**: Beautiful interface with blur effects and gradients
- **Multi-language Interface**: Switch between English, Korean, and Japanese
- **Responsive Layout**: Optimized for different screen sizes
- **Smooth Animations**: Polished interactions and transitions

## 🛠️ Technology Stack

- **Framework**: [WXT](https://wxt.dev/) - Next-gen web extension framework
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Internationalization**: i18next + react-i18next
- **Styling**: Tailwind CSS with Glass Morphism
- **Build Tool**: Vite
- **Extension**: Chrome Extension Manifest V3

## 📦 Installation

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/tab-quest.git
   cd tab-quest
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Load extension in Chrome/Edge**
   - Open `chrome://extensions` (or `edge://extensions`)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3-dev` folder

### Production Build

```bash
# Build for production
npm run build

# Package extension
npm run package
```

The production build will be in `.output/chrome-mv3/`

## 🎯 Usage Guide

### Getting Started

1. **Click the TabQuest icon** in your browser toolbar
2. **Select your preferred language** from the language switcher
3. **View your current tabs** organized by detected patterns
4. **Click "Smart Organize"** to automatically group tabs into categories

### Managing Categories

1. Navigate to the **Categories** tab
2. Click **"+ Add Category"** to create custom categories
3. Assign colors and domains to each category
4. Drag categories to reorder them

### Tab Assignment

1. Go to the **Assign** tab
2. Select a category for each domain
3. Changes are saved automatically
4. Use **Smart Organize** to apply categorization

### Viewing Analytics

1. Check the **Dashboard** for usage statistics
2. Monitor your productivity score
3. Review daily trends and patterns
4. Act on AI-generated insights

## 🏗️ Project Structure

```
tab-quest/
├── src/
│   ├── entrypoints/           # WXT entry points
│   │   ├── popup.tsx          # Popup entry point
│   │   ├── popup-component.tsx # Main popup UI
│   │   ├── options.tsx        # Options page
│   │   └── background.ts      # Background service worker
│   ├── components/
│   │   ├── charts/            # Chart components
│   │   ├── modals/            # Modal dialogs
│   │   ├── pages/             # Page components
│   │   ├── shared/            # Shared components (AI, Score)
│   │   └── ui/                # UI primitives
│   ├── lib/                   # Core libraries
│   │   ├── i18n.ts            # Internationalization
│   │   └── tabClassifier.ts   # Tab classification
│   ├── locales/               # Translation files (en, ko, ja)
│   ├── store/                 # Zustand stores
│   │   ├── categoryStore.ts   # Category management
│   │   ├── tabStore.ts        # Tab state
│   │   └── aiStore.ts         # AI features
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript definitions
│   └── tabs/                  # Full tab pages
│       └── dashboard.tsx      # Analytics dashboard
├── public/
│   └── icon/                  # Extension icons
├── wxt.config.ts              # WXT configuration
└── package.json
```

## 🔧 Configuration

### WXT Configuration

The extension is configured through `wxt.config.ts`:

- Manifest settings
- Build options
- Development server configuration

### Storage Schema

TabQuest uses Chrome's storage API with two areas:

- **Sync Storage**: User preferences and categories
- **Local Storage**: Usage data and statistics

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**
   - Ensure you're in developer mode
   - Check that the correct folder is selected
   - Rebuild if necessary: `npm run build`

2. **Tabs not grouping**
   - Verify Chrome/Edge supports tab groups
   - Check browser permissions
   - Ensure categories are properly configured

3. **Data not persisting**
   - Check storage permissions in manifest
   - Verify Chrome sync is enabled
   - Check browser console for errors

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Write meaningful commit messages
- Update documentation for new features
- Test thoroughly before submitting PR

## 📝 Roadmap

### ✅ Completed

- [x] Multi-language support (EN, KO, JA)
- [x] Category management with drag-and-drop
- [x] Tab usage tracking and analytics
- [x] Undo/Redo functionality
- [x] Snapshot management
- [x] Glass morphism design system
- [x] Interactive charts and visualizations

### 🚧 In Progress

- [ ] Advanced AI insights
- [ ] Keyboard shortcuts support

### 🔮 Future

- [ ] Export/import settings
- [ ] Firefox and Safari support
- [ ] Cloud synchronization
- [ ] More language support (Chinese, Spanish, French)

## 📄 License

MIT License

## 🙏 Acknowledgments

- Built with [WXT](https://wxt.dev/) - Modern web extension framework
- UI inspired by modern glass morphism designs
- Charts and visualizations using custom implementations

---

Made with ❤️ by YonYonWare
