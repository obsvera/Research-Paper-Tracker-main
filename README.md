# Research Paper Tracker

> **AI-Powered Research Management Tool - Compatible with Any LLM**

A comprehensive web application for organizing dissertation research, tracking academic papers, and managing citations. Perfect for graduate students, researchers, and academics who need to keep track of their literature review process.

## Features

### Smart Paper Input
- Enter paper titles, citations, URLs, or DOIs - app generates AI prompts automatically
- Works with any LLM: Claude, ChatGPT, Gemini, Copilot, or any AI assistant
- JSON support for advanced users
- Auto-generated APA 7th edition citations

### Paper Management
- Track title, authors, year, journal, keywords, status, priority, rating
- Color-coded organization with visual indicators
- Research notes and chapter assignments

### Data Management
- **Multiple export formats**: CSV, JSON, and BibTeX for maximum compatibility
- **Academic standards**: BibTeX integration for LaTeX and citation managers
- **Universal import**: Works with any reference manager or academic database
- Secure input validation
- Client-side storage for privacy

## Quick Start

### Complete Setup Guide (No GitHub Experience Required)

**Step 1: Create a GitHub Account**
1. Go to [github.com](https://github.com) and click "Sign up"
2. Choose a username, enter your email and create a password
3. Verify your email address when prompted

**Step 2: Fork This Repository**
1. Go to the repository: `https://github.com/obsvera/claude4-research-tracker`
2. Click the "Fork" button in the top-right corner
3. Select your account as the destination
4. Wait for GitHub to create your copy of the repository

**Step 3: Enable GitHub Pages**
1. In your forked repository, click the "Settings" tab
2. Scroll down to "Pages" section in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Click "Save"
6. Wait 5-10 minutes for deployment

**Step 4: Access Your App**
- Your app will be live at: `https://yourusername.github.io/claude4-research-tracker`
- GitHub will show you the exact URL in the Pages settings
- Bookmark this URL for easy access

### For GitHub Users
Simply fork the repository at `https://github.com/obsvera/claude4-research-tracker` and enable Pages in your fork settings.

## How to Use

### Adding Papers

#### Smart Input Method (Recommended)
1. **Enter any paper information** in the input field:
   - Paper titles: "Attention Is All You Need"
   - Partial citations: "Smith et al. 2023, Nature"
   - URLs: "https://arxiv.org/abs/1706.03762"
   - DOIs: "10.1038/nature12373"
2. **Click "+ Add"** - the app automatically detects this isn't JSON
3. **Copy the generated prompt** from the modal that appears
4. **Paste into any AI assistant** (Claude, ChatGPT, Gemini, Copilot, etc.) and get the JSON response
5. **Paste the JSON back** into the input field and click "+ Add" again
6. **Review and edit** extracted information in the preview modal
7. **Add to library** with one click

#### Manual Entry
1. Click "+ Add Paper Manually"
2. Fill in paper details directly in the table
3. Citations auto-generate as you type title, authors, year, and journal

### Managing Your Library

#### Organization Features
- **Status tracking**: To Read, Reading, Read, Skimmed with color coding
- **Priority levels**: High, Medium, Low for research importance
- **Star ratings**: 1-5 stars for paper quality/relevance
- **Keywords/Tags**: Categorize by themes, methods, or topics
- **Chapter organization**: Assign papers to dissertation sections
- **Notes sections**: Track key points and relevance to your work

#### Data Export and Backup

**Multiple Export Formats:**
1. **CSV Export**: Universal compatibility with Excel, Google Sheets, and any spreadsheet app
2. **JSON Export**: Structured data format for advanced users and data portability
3. **BibTeX Export**: Academic standard for LaTeX, Zotero, EndNote, and Mendeley

**Export Process:**
1. Click **"Export CSV/JSON/BibTeX"** to download your complete library
2. **CSV**: Open in Excel/Sheets for analysis and collaboration
3. **JSON**: Use for data backup and advanced integrations
4. **BibTeX**: Import directly into LaTeX documents or citation managers

**Import Process:**
1. Click **"Import CSV/JSON/BibTeX"** and select your file
2. **Validation**: App checks file format and data integrity
3. **PDF Restoration**: Automatically restores PDF references when possible
4. **Security**: File size limited to 10MB, validates all data inputs

## Technical Features

### Security
- **XSS prevention** with comprehensive input sanitization
- **Content Security Policy** headers prevent code injection
- **Input validation** on all user data with length limits
- **Safe file uploads** with type and size validation
- **URL validation** prevents malicious link injection

### Performance
- **Optimized rendering** with efficient DOM updates
- **Responsive design** adapts to all screen sizes
- **Lightweight** - minimal dependencies, fast loading
- **Client-side processing** - no server required

### Accessibility
- **Keyboard navigation** with proper focus management
- **Screen reader support** with semantic HTML and ARIA labels
- **High contrast** focus indicators for visual accessibility
- **Touch-friendly** interface for mobile devices

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Data Privacy
- **Local storage only** - all data stays in your browser
- **No external servers** - complete privacy protection
- **Export/import** for data portability and backup
- **No tracking** or analytics

## Advanced Usage

### Research Workflow
1. **Literature search** - Use your preferred academic databases
2. **Quick capture** - Paste URLs, titles, or citations into the smart input
3. **AI extraction** - Use any AI assistant to get structured data with proper formatting
4. **Organization** - Assign status, priority, and chapter classifications
5. **Note-taking** - Record key findings and research relevance
6. **Citation management** - Auto-generated APA 7th edition references
7. **Analysis** - Export to Excel/Sheets for advanced filtering and reporting

### Best Practices
- **Regular backups** - Export CSV files frequently
- **Consistent keywords** - Use standardized tags for better organization
- **Detailed notes** - Record why each paper matters to your research
- **Status maintenance** - Keep reading progress current
- **Priority review** - Regularly reassess paper importance as research evolves

### Integration with Research Tools
- **Reference managers** - Import/export via CSV/BibTeX to Zotero, Mendeley, EndNote
- **LaTeX writing** - Direct BibTeX integration for academic documents
- **Google Scholar** - Copy citations and paste into smart input
- **Academic databases** - Extract paper info from PubMed, arXiv, JSTOR
- **AI assistants** - Works with Claude, ChatGPT, Gemini, Copilot, and more
- **Collaboration tools** - Share exports with research teams
- **Writing software** - Copy formatted citations to Word, LaTeX, Scrivener

## Troubleshooting

### Common Issues
- **CSV import errors** - Ensure file uses standard CSV format with proper encoding
- **Smart input not working** - Check browser console for JavaScript errors
- **Citations not generating** - Verify Author and Title fields are completed
- **Mobile display issues** - Try refreshing the page or clearing browser cache

### Data Recovery
- **Lost papers** - Check if you have recent CSV backups
- **Corrupted data** - Re-import from last known good CSV export
- **Browser issues** - Try different browser or incognito mode

## Contributing

This is an open-source research tool. Contributions welcome for:
- **Feature enhancements** - New organizational tools or export formats  
- **Security improvements** - Additional input validation or safety measures
- **Accessibility updates** - Better screen reader support or keyboard navigation
- **Integration features** - Connections to academic databases or reference managers

## License

MIT License - free for personal and academic use.

---

**Built for the academic community with modern web technologies and universal AI-assisted paper management.**
