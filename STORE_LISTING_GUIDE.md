# Chrome Web Store Listing Guide

Complete guide for submitting TabQuest to the Chrome Web Store.

## 📸 Screenshot Requirements

### Technical Specifications
- **Size**: 1280x800 or 640x400 pixels (16:10 aspect ratio)
- **Format**: PNG or JPEG
- **Minimum**: 1 screenshot (required)
- **Maximum**: 5 screenshots (recommended)
- **File Size**: Max 5MB each

### Recommended Screenshots (in order)

1. **Main Interface - Side Panel View** (1280x800)
   - Show the glass morphism design
   - Display AI insights with example suggestions
   - Show tab statistics (e.g., "15 tabs, 3 groups")
   - Highlight the "Smart Organize" button
   - Caption: "Intelligent Tab Management with AI Insights"

2. **Category Manager** (1280x800)
   - Display the category creation/editing interface
   - Show colorful category tags
   - Include sample categories (Work, Personal, Shopping, Research)
   - Caption: "Create Custom Categories for Your Tabs"

3. **Tab Organization in Action** (1280x800)
   - Show before/after of tab organization
   - Display tab groups with different colors
   - Highlight the undo/redo functionality
   - Caption: "One-Click Smart Organization"

4. **Tab Groups View** (1280x800)
   - Show the Tab Groups Manager modal
   - Display existing Chrome tab groups
   - Show group statistics and colors
   - Caption: "Seamless Integration with Chrome Tab Groups"

5. **Multi-language Support** (1280x800)
   - Show the language switcher
   - Display UI in different languages (English/Korean/Japanese)
   - Caption: "Available in English, Korean, and Japanese"

### How to Capture Screenshots

1. **Development Mode**:
   ```bash
   npm run dev
   ```

2. **Open Extension**:
   - Click extension icon to open side panel
   - Resize browser window to 1280x800 for consistent captures

3. **Chrome DevTools Screenshot**:
   - Open DevTools (F12)
   - Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
   - Type "Capture screenshot"
   - Select "Capture full size screenshot"

4. **Clean Up Screenshots**:
   - Remove any personal data or URLs
   - Use placeholder URLs (example.com, google.com)
   - Ensure good contrast and readability

## 🎨 Promotional Images (Optional but Recommended)

### Small Promotional Tile
- **Size**: 440x280 pixels
- **Format**: PNG or JPEG
- **Purpose**: Displayed in Chrome Web Store search results
- **Content**: Logo + "TabQuest" text + tagline

### Large Promotional Tile
- **Size**: 920x680 pixels
- **Format**: PNG or JPEG
- **Purpose**: Featured placements
- **Content**: Hero image with key features

### Marquee Promotional Tile
- **Size**: 1400x560 pixels
- **Format**: PNG or JPEG
- **Purpose**: Large featured placements
- **Content**: Full promotional banner with screenshots

## 📝 Store Listing Text

### Short Description (132 characters max)
```
Organize browser tabs with AI-powered insights. Smart categorization, tab groups, and beautiful glass morphism design.
```

### Detailed Description

```markdown
# TabQuest - Intelligent Tab Management

Transform chaotic browser tabs into organized workspaces with AI-powered insights and smart categorization.

## ✨ Key Features

### 🤖 AI-Powered Insights
Get personalized productivity suggestions based on your browsing patterns. TabQuest analyzes your tabs and provides actionable recommendations to improve your workflow.

### 📁 Smart Tab Organization
- **Custom Categories**: Create and manage your own tab categories
- **One-Click Organization**: Automatically group tabs by category
- **Undo/Redo**: Full undo/redo support for all actions
- **Tab Groups Integration**: Seamlessly works with Chrome's native tab groups

### 💾 Snapshots & History
- Save and restore tab states
- Undo recent organization changes
- Never lose your carefully arranged tabs

### 🎨 Beautiful Design
- Modern glass morphism UI
- 10+ vibrant color themes for categories
- Persistent side panel for easy access
- Responsive and smooth animations

### 🌍 Multi-Language Support
Available in English, Korean (한국어), and Japanese (日本語)

## 🔒 Privacy First

TabQuest is completely private:
- ✅ All data stored locally on your device
- ✅ No data sent to external servers
- ✅ No tracking or analytics
- ✅ Open source code available on GitHub

## 🚀 Quick Start

1. Click the TabQuest icon to open the side panel
2. Create your first category
3. Click "Smart Organize" to automatically group your tabs
4. Enjoy organized browsing!

## 💡 Use Cases

- **Developers**: Separate documentation, code repos, and tools
- **Researchers**: Organize papers, articles, and references
- **Students**: Group study materials by subject
- **Shoppers**: Keep shopping tabs organized by store or category
- **Professionals**: Separate work and personal browsing

## 🛠️ Technology

Built with modern web technologies:
- WXT Framework
- React 18 + TypeScript
- Chrome Extension Manifest V3
- Zustand for state management
- Tailwind CSS for styling

## 📞 Support

- GitHub: https://github.com/YonYonWare/tab-quest
- Email: support@yonyonware.com
- Issues: https://github.com/YonYonWare/tab-quest/issues

## 🔄 What's New in v1.0.0

- Initial release
- Smart tab organization with AI insights
- Custom category management
- Multi-language support (EN, KO, JA)
- Chrome tab groups integration
- Snapshot save/restore
- Glass morphism design

---

**Note**: Requires Chrome 114+ for Side Panel API support
```

## 🏷️ Category & Tags

### Primary Category
- **Productivity**

### Tags/Keywords (Max 20)
```
tab management
tab organizer
productivity
browser extension
tab groups
workspace
ai insights
categorization
multi-language
glass morphism
side panel
browser productivity
tab declutter
workspace manager
chrome extension
browsing efficiency
tab assistant
smart organize
tab snapshots
undo redo
```

## 👥 Target Audience

### Maturity Rating
- **Everyone**

### User Demographics
- Developers and programmers
- Researchers and students
- Knowledge workers
- Power users with many tabs
- Multi-taskers
- Anyone with tab overload

## 🌐 Localization

### Supported Languages
1. **English (en)** - Primary
2. **Korean (ko)** - Full translation
3. **Japanese (ja)** - Full translation

### Store Listing Translations

Create separate store listings for each language:
- English store listing (default)
- Korean store listing (한국어 설명)
- Japanese store listing (日本語説明)

## 📋 Pre-Submission Checklist

### Required Items
- [x] Extension ZIP file (tab-quest-chrome.zip)
- [x] Privacy Policy (PRIVACY_POLICY.md)
- [x] At least 1 screenshot (1280x800)
- [ ] Developer account ($5 one-time fee)
- [ ] Support email or website
- [ ] Detailed description (completed above)

### Optional but Recommended
- [ ] 5 high-quality screenshots
- [ ] Small promotional tile (440x280)
- [ ] Large promotional tile (920x680)
- [ ] YouTube demo video
- [ ] Website or landing page
- [ ] Social media links

### Before Submission
- [ ] Test in fresh Chrome profile
- [ ] Verify all permissions explanations
- [ ] Check privacy policy accuracy
- [ ] Review all screenshots for clarity
- [ ] Proofread all descriptions
- [ ] Verify version numbers match (1.0.0)
- [ ] Test on Chrome 114+ (Side Panel requirement)

## 🚀 Submission Steps

1. **Create Developer Account**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Pay $5 one-time registration fee
   - Verify email address

2. **Create New Item**
   - Click "New Item"
   - Upload `tab-quest-chrome.zip`
   - Wait for automated checks

3. **Fill Store Listing**
   - Add product name: "TabQuest - Create & Share Tab Workspaces"
   - Add short description (132 chars)
   - Add detailed description
   - Upload screenshots (minimum 1, recommended 5)
   - Add promotional images (optional)

4. **Set Privacy Practices**
   - Select "No" for data collection
   - Link privacy policy: https://github.com/YonYonWare/tab-quest/blob/main/PRIVACY_POLICY.md
   - Explain each permission clearly

5. **Distribution**
   - Select visibility: Public
   - Select regions: All regions
   - Pricing: Free

6. **Submit for Review**
   - Click "Submit for Review"
   - Wait 1-3 business days
   - Respond to any reviewer questions

## 📊 Post-Launch

### Monitor Metrics
- Installation count
- User ratings and reviews
- Crash reports (if any)
- Support requests

### Respond to Feedback
- Reply to user reviews (positive and negative)
- Address bug reports promptly
- Consider feature requests
- Update regularly

### Update Checklist
When releasing updates:
1. Increment version in package.json and wxt.config.ts
2. Update "What's New" section
3. Test thoroughly
4. Build and package new ZIP
5. Upload to Chrome Web Store
6. Update GitHub releases

## 🔗 Important Links

- **Chrome Web Store Developer Dashboard**: https://chrome.google.com/webstore/devconsole
- **Developer Program Policies**: https://developer.chrome.com/docs/webstore/program-policies/
- **Best Practices**: https://developer.chrome.com/docs/webstore/best-practices/
- **Quality Guidelines**: https://developer.chrome.com/docs/webstore/review-process/

---

**Good Luck!** 🚀

Contact support@yonyonware.com if you need assistance.
