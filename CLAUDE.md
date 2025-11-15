# CLAUDE.md - AI Assistant Development Guide

**Research Paper Tracker - Codebase Documentation for AI Assistants**

Last Updated: 2025-11-15

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Technology Stack](#technology-stack)
5. [Data Models](#data-models)
6. [Core Functions](#core-functions)
7. [Security Practices](#security-practices)
8. [Code Patterns & Conventions](#code-patterns--conventions)
9. [Development Workflow](#development-workflow)
10. [Testing Guidelines](#testing-guidelines)
11. [Common Pitfalls](#common-pitfalls)
12. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Project Overview

### Purpose
A client-side web application for managing academic research papers with AI-assisted data extraction. Designed for graduate students and researchers to organize dissertation research, track reading progress, and manage citations.

### Key Features
- **Smart Input System**: AI-assisted paper metadata extraction via LLM prompts
- **Citation Management**: Auto-generated APA 7th edition citations
- **Multi-Format Support**: Import/Export in CSV, JSON, and BibTeX
- **PDF Management**: IndexedDB-based persistent storage for PDFs
- **Privacy-First**: All data stored client-side (localStorage + IndexedDB)
- **Security-Focused**: Comprehensive XSS prevention and input sanitization

### User Workflow
1. User enters paper title/URL/DOI
2. App generates AI prompt for metadata extraction
3. User pastes prompt into any LLM (Claude, ChatGPT, etc.)
4. User pastes JSON response back into app
5. App validates, displays preview, and adds to library
6. Papers organized with status, priority, ratings, notes

---

## Architecture

### Application Type
**Single Page Application (SPA)** - Pure client-side with no backend

### Design Pattern
**Vanilla JavaScript** with event delegation and modular functions

### Storage Architecture
```
┌─────────────────────────────────────────┐
│         User Interface (HTML)           │
│  - index.html (main UI)                 │
│  - styles.css (theming + responsive)    │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│      JavaScript Layer (script.js)       │
│  - Global state (papers array)          │
│  - Event delegation                     │
│  - Data validation                      │
│  - UI rendering                         │
└─────────┬───────────────────┬───────────┘
          │                   │
┌─────────▼─────────┐  ┌──────▼──────────┐
│   localStorage    │  │   IndexedDB     │
│  - Paper metadata │  │  - PDF files    │
│  - Settings       │  │  - Blob storage │
└───────────────────┘  └─────────────────┘
```

---

## File Structure

```
Research-Paper-Tracker-main/
├── index.html              # Main application UI
├── script.js               # Core application logic (3544 lines)
├── styles.css              # Styling with CSS variables for theming
├── README.md               # User-facing documentation
├── TESTING_GUIDE.md        # Testing procedures and validation
├── LICENSE                 # MIT License
├── .gitignore              # Excludes papers/ folder
│
├── test-sample.bib         # BibTeX import test file
├── test-bibtex.bib         # Additional BibTeX tests
├── test-json.json          # JSON import test file
├── test-old-format.csv     # Legacy CSV format test
├── test-new-format.csv     # Current CSV format test
├── quick-test.html         # Minimal testing harness
│
└── papers/                 # User's PDF storage (gitignored)
```

### File Responsibilities

**index.html** (124 lines)
- Semantic HTML structure
- Content Security Policy headers
- Accessibility attributes (ARIA labels)
- Modal templates (not visible, populated by JS)

**script.js** (3544 lines)
- Global state management
- Event delegation for performance
- Data validation and sanitization
- Import/Export functionality
- PDF management via IndexedDB
- Citation generation (APA 7th)

**styles.css**
- CSS custom properties for theming
- Responsive design (mobile-first)
- Dark mode support
- Print styles

---

## Technology Stack

### Core Technologies
- **HTML5**: Semantic markup, CSP headers
- **CSS3**: Custom properties, Grid, Flexbox
- **Vanilla JavaScript (ES6+)**: No frameworks

### Browser APIs Used
- **localStorage**: Paper metadata persistence
- **IndexedDB**: PDF file storage
- **File System Access API**: Folder picker (Chrome/Edge only)
- **Clipboard API**: Citation copying
- **FileReader API**: CSV/JSON/BibTeX import

### Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

**Note**: File System Access API only works in Chromium browsers. Fallback to IndexedDB for others.

---

## Data Models

### Paper Object Structure

```javascript
{
  // Core identification
  id: 1,                      // Unique identifier (auto-increment)

  // Academic metadata
  itemType: "article",        // article|inproceedings|book|techreport|phdthesis|misc
  title: "",                  // Full paper title
  authors: "",                // Comma-separated author names
  year: "",                   // Publication year (string for flexibility)
  journal: "",                // Journal/venue/booktitle
  volume: "",                 // Volume number
  issue: "",                  // Issue number
  pages: "",                  // Page range (e.g., "123--145")
  doi: "",                    // DOI or URL
  issn: "",                   // ISSN identifier
  keywords: "",               // Comma-separated keywords
  language: "en",             // ISO language code

  // Research organization
  chapter: "",                // Chapter/topic assignment
  abstract: "",               // Key findings summary (2-3 sentences)
  relevance: "",              // Why relevant to research (1-2 sentences)
  keyPoints: "",              // Key takeaways
  notes: "",                  // Additional notes

  // Tracking metadata
  status: "to-read",          // to-read|reading|read|skimmed
  priority: "medium",         // low|medium|high
  rating: "",                 // 1-5 stars (empty string if unrated)
  dateAdded: "2025-11-15",    // ISO date string

  // Citation
  citation: "",               // Auto-generated APA 7th citation

  // PDF management
  pdf: "",                    // PDF path (legacy)
  pdfPath: "",                // PDF file path
  pdfFilename: "",            // Original filename
  hasPDF: false,              // Boolean PDF status
  pdfSource: "none",          // none|folder|indexeddb|file|local
  pdfHandle: null,            // FileSystemFileHandle (not serialized)
  pdfBlobUrl: null,           // Blob URL for viewing (not serialized)

  // Legacy fields (backward compatibility)
  url: ""                     // Old URL field (now merged with doi)
}
```

### Global State Variables

```javascript
// In script.js (lines 1-25)
let papers = [];                    // Main data array
let nextId = 1;                     // Auto-increment ID counter
let batchUpdateTimeout = null;      // Debounce timer
let errorCount = 0;                 // Error tracking
const MAX_ERRORS = 3;               // Error threshold
const STORAGE_KEY = 'research-tracker-data-v1';
const SETTINGS_KEY = 'research-tracker-settings-v1';

// PDF management
let papersFolderHandle = null;      // FileSystemDirectoryHandle
let papersFolderPath = '';          // Folder path string
let papersFolderUrl = '';           // Folder URL for opening

// IndexedDB
let pdfDB = null;                   // IDBDatabase instance
const DB_NAME = 'research-paper-tracker';
const DB_VERSION = 1;
const PDF_STORE = 'pdfs';

// Rate limiting
let lastSaveTime = 0;
const SAVE_COOLDOWN = 1000;         // 1 second between saves
let pendingSave = false;
```

---

## Core Functions

### Security & Validation

**`escapeHtml(text)`** (script.js:28)
- Prevents XSS by escaping HTML entities
- Used for ALL user input rendering
- Returns empty string for null/undefined

**`validateUrl(url)`** (script.js:36)
- Validates and sanitizes URLs
- Blocks dangerous protocols (javascript:, data:, file:, etc.)
- Blocks suspicious domains (localhost, 127.0.0.1)
- Max length 2000 characters
- Returns null if invalid

### Data Management

**`addRow()`** (script.js:169)
- Creates new paper with default values
- Auto-generates ID and dateAdded
- Updates UI and saves to localStorage

**`deleteRow(id)`** (script.js:~230)
- Removes paper by ID
- Cleans up PDF references
- Updates stats and saves

**`updatePaper(id, field, value)`** (script.js:~280)
- Updates single field
- Validates input based on field type
- Triggers citation regeneration if needed
- Debounced save

**`batchUpdates(id)`** (script.js:~260)
- Debounced update function (500ms delay)
- Reduces localStorage writes
- Updates stats and UI

### UI Rendering

**`renderTable()`** (script.js:490)
- Renders full table from papers array
- Event listeners via delegation (not per-row)
- Applies status/priority styling

**`showSummary()`** (script.js:88)
- Generates paper cards for summary view
- Uses event delegation for performance
- Handles empty state

**`updateStats()`** (script.js:~1250)
- Counts papers by status
- Updates statistics display

### Citation Management

**`formatAPA7Citation(paper)`** (script.js:~350)
- Generates APA 7th edition citation
- Returns plain text version
- Handles different item types

**`formatAPA7CitationHTML(paper)`** (script.js:~400)
- Generates HTML-formatted citation with italics
- Returns {text, html} object
- Auto-triggered on title/author/year/journal changes

**`copyCitation(id)`** (script.js:593)
- Copies citation to clipboard
- Tries modern Clipboard API first
- Fallback to execCommand
- Shows visual feedback

### Import/Export

**`exportToCSV()`** (script.js:~1400)
- Exports all papers to CSV format
- Includes all fields
- Downloads file automatically

**`exportToJSON()`** (script.js:~1500)
- Exports to JSON format
- Includes complete paper objects
- Formatted for readability

**`exportToBibTeX()`** (script.js:~1550)
- Generates BibTeX format
- Handles different entry types
- Escapes special characters

**`importCSV(event)`** (script.js:~1700)
- Parses CSV files
- Validates data
- Merges with existing papers

**`importJSON(event)`** (script.js:~1900)
- Parses JSON files
- Validates structure
- Restores PDFs from IndexedDB if available

**`importBibTeX(event)`** (script.js:~2000)
- Parses BibTeX files
- Converts to paper objects
- Handles multiple entry types
- Auto-generates citations

**`parseBibTeX(content)`** (script.js:~2100)
- BibTeX parser implementation
- Handles nested braces
- Extracts all fields

### PDF Management

**`attachPDF(paperId)`** (script.js:~800)
- Opens file picker
- Stores in IndexedDB for persistence
- Creates blob URL for viewing
- Updates UI

**`openPDF(paperId)`** (script.js:~900)
- Retrieves PDF from storage
- Opens in new tab
- Handles different storage sources

**`removePDF(paperId)`** (script.js:1004)
- Removes PDF attachment
- Cleans up blob URLs
- Removes from IndexedDB
- Updates UI

**`initIndexedDB()`** (script.js:~1300)
- Initializes IndexedDB
- Creates object store
- Sets up error handlers

**`storePDFInIndexedDB(paperId, file, filename)`** (script.js:~1350)
- Stores PDF blob in IndexedDB
- Handles large files (tested up to 100MB)
- Returns success/failure status

**`getPDFFromIndexedDB(paperId)`** (script.js:~1380)
- Retrieves PDF from IndexedDB
- Returns blob or null

### Storage

**`storage.save()`** (inside DOMContentLoaded)
- Saves papers to localStorage
- Rate-limited to prevent performance issues
- Serializes data (excludes non-serializable fields)

**`storage.load()`** (inside DOMContentLoaded)
- Loads papers from localStorage
- Validates data structure
- Restores PDF references

---

## Security Practices

### XSS Prevention

**Critical Rule**: NEVER use `innerHTML` with unsanitized user input

```javascript
// ❌ WRONG - Vulnerable to XSS
element.innerHTML = paper.title;

// ✅ CORRECT - Use escapeHtml
element.innerHTML = escapeHtml(paper.title);

// ✅ ALSO CORRECT - Use textContent for plain text
element.textContent = paper.title;
```

### Content Security Policy

**index.html (line 6-9)**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self';
               img-src 'self' data:; connect-src 'self';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
```

### URL Validation

All URLs must pass through `validateUrl()`:
- Blocks dangerous protocols
- Blocks localhost/internal IPs
- Length limits (2000 chars)
- Pattern matching for suspicious content

### Input Sanitization

**Always sanitize**:
- All text fields before rendering
- All URLs before using in href/src
- All user-provided filenames
- All imported data (CSV, JSON, BibTeX)

**File size limits**:
- Import files: 10MB max
- PDFs: No hard limit, but tested up to 100MB

---

## Code Patterns & Conventions

### Event Delegation

**CRITICAL**: Use event delegation, NOT per-element listeners

```javascript
// ❌ WRONG - Memory leak
papers.forEach(paper => {
  button.addEventListener('click', () => handleClick(paper.id));
});

// ✅ CORRECT - Single delegated listener
document.addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    const id = parseInt(e.target.dataset.paperId);
    deleteRow(id);
  }
});
```

**Location**: All event delegation setup is in DOMContentLoaded (script.js:~2600-3500)

### Debouncing

Input changes are debounced to reduce localStorage writes:

```javascript
function batchUpdates(id = null) {
    if (batchUpdateTimeout) clearTimeout(batchUpdateTimeout);

    batchUpdateTimeout = setTimeout(() => {
        updateRowStyling(id);
        updateStats();
        storage.save();
        showSummary();
    }, 500); // Wait 500ms after last change
}
```

### Error Handling

```javascript
try {
    // Risky operation
} catch (error) {
    handleError(error, 'Context description');
}

function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    errorCount++;
    if (errorCount >= MAX_ERRORS) {
        alert('Multiple errors detected. Please refresh the page.');
    }
}
```

### Naming Conventions

- **Functions**: camelCase (e.g., `addRow`, `formatAPA7Citation`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `MAX_ERRORS`)
- **Variables**: camelCase (e.g., `papers`, `nextId`)
- **CSS Classes**: kebab-case (e.g., `paper-card`, `copy-citation-btn`)
- **Data Attributes**: camelCase in JS, kebab-case in HTML
  ```javascript
  // HTML: data-paper-id="123"
  // JS: element.dataset.paperId
  ```

### CSS Custom Properties

All colors and theme values use CSS variables:

```css
:root {
  --bg-primary: #f8f9fa;
  --accent-color: #4a90e2;
  --text-primary: #2c3e50;
  /* ... more variables */
}

/* Dark mode overrides these */
body.dark-mode {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}
```

### Responsive Design

Mobile-first approach with breakpoints:
```css
/* Mobile first (320px+) */
.controls { flex-direction: column; }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .controls { flex-direction: row; }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .table-container { max-width: 1400px; }
}
```

---

## Development Workflow

### Making Changes

1. **Read existing code first**
   ```bash
   # Check function location
   grep -n "function functionName" script.js
   ```

2. **Test in browser console**
   ```javascript
   // Test your changes before editing files
   papers[0].title = "Test";
   renderTable();
   ```

3. **Edit files**
   - Use your editor's search to find exact locations
   - Preserve existing code style
   - Add comments for complex logic

4. **Test changes**
   - Open index.html in browser
   - Check console for errors (F12)
   - Test import/export functionality
   - Test on mobile viewport

5. **Validate**
   - No console errors
   - No XSS vulnerabilities
   - No memory leaks
   - Responsive design intact

### Git Workflow

This project uses GitHub with a specific branching strategy:

```bash
# Current branch
git branch
# claude/claude-md-mi0qogpb6urshael-01MVQGVXUyQK9Ucma1P6cacJ

# After making changes
git add .
git commit -m "Descriptive message"

# Push to the designated branch
git push -u origin claude/claude-md-mi0qogpb6urshael-01MVQGVXUyQK9Ucma1P6cacJ
```

**Important**: Always push to branches starting with `claude/` and ending with the session ID.

### Deployment

The app is deployed via GitHub Pages:
1. Push changes to main branch (or create PR)
2. GitHub Actions automatically deploys
3. Live at: `https://username.github.io/repository-name`

**No build step required** - it's pure static files.

---

## Testing Guidelines

See `TESTING_GUIDE.md` for comprehensive testing procedures.

### Quick Smoke Test

1. Open `index.html` in browser
2. Import `test-sample.bib`
3. Verify 4 papers imported
4. Check console for errors (should be none)
5. Test mobile view (F12 → Toggle Device Toolbar → iPhone SE)
6. Add paper manually
7. Export to CSV
8. Clear data
9. Import CSV back
10. Verify data restored

### Critical Test Cases

**BibTeX Import** (test-sample.bib)
- Must import without errors
- Must populate volume, issue, pages
- Must generate citations automatically
- Must handle different entry types (article, inproceedings, book)

**Memory Leaks**
- Add 10 papers → delete all → repeat 5x
- Memory should stabilize, not grow continuously
- Check: `getEventListeners(document.getElementById('papersSummary'))`
- Should show 1-2 listeners, not 50+

**Mobile Responsiveness**
- Test on iPhone SE (375px) - smallest common phone
- All buttons should be tappable (44px min)
- No horizontal overflow
- Table should scroll horizontally
- Modals should fit on screen

**Security**
- Try entering `<script>alert('XSS')</script>` in title field
- Should render as text, not execute
- Try URL: `javascript:alert('XSS')`
- Should be rejected by validateUrl

### Performance Benchmarks

- Initial load: < 100ms
- Add paper: < 50ms
- Render table (100 papers): < 200ms
- Import BibTeX (10 papers): < 500ms
- Export CSV (100 papers): < 300ms

---

## Common Pitfalls

### 1. Memory Leaks from Event Listeners

**Problem**: Adding listeners inside render functions
```javascript
// ❌ WRONG - Creates new listeners every render
function renderTable() {
    papers.forEach(paper => {
        const btn = document.createElement('button');
        btn.addEventListener('click', () => deleteRow(paper.id)); // LEAK!
    });
}
```

**Solution**: Use event delegation
```javascript
// ✅ CORRECT - Single listener
document.addEventListener('click', (e) => {
    if (e.target.matches('.delete-btn')) {
        deleteRow(parseInt(e.target.dataset.paperId));
    }
});
```

### 2. XSS Vulnerabilities

**Problem**: Using innerHTML with user data
```javascript
// ❌ WRONG
element.innerHTML = paper.title; // If title contains <script>, it executes!
```

**Solution**: Always use escapeHtml
```javascript
// ✅ CORRECT
element.innerHTML = escapeHtml(paper.title);
```

### 3. localStorage Quota Exceeded

**Problem**: Saving too frequently or too much data
```javascript
// ❌ WRONG - Save on every keystroke
input.addEventListener('input', () => storage.save());
```

**Solution**: Debounce saves
```javascript
// ✅ CORRECT - Save after 500ms of inactivity
function batchUpdates() {
    clearTimeout(batchUpdateTimeout);
    batchUpdateTimeout = setTimeout(() => storage.save(), 500);
}
```

### 4. Missing Citation After Import

**Problem**: Citation not generated during import
```javascript
// ❌ WRONG
papers.push(importedPaper); // citation field is empty
```

**Solution**: Generate citation explicitly
```javascript
// ✅ CORRECT
const citation = formatAPA7Citation(importedPaper);
importedPaper.citation = citation;
papers.push(importedPaper);
```

### 5. PDF Blob URL Expiration

**Problem**: Blob URLs become invalid after page reload
```javascript
// ❌ WRONG - Blob URL stored in localStorage
paper.pdfBlobUrl = URL.createObjectURL(blob); // This expires!
storage.save(); // Saving expired URL is useless
```

**Solution**: Store in IndexedDB, recreate blob URL on load
```javascript
// ✅ CORRECT
await storePDFInIndexedDB(paperId, file, filename);
const blob = await getPDFFromIndexedDB(paperId);
paper.pdfBlobUrl = URL.createObjectURL(blob); // Fresh URL
// Don't save pdfBlobUrl to localStorage
```

### 6. BibTeX Parsing Errors

**Problem**: Not handling nested braces
```bibtex
title = {Machine Learning {and} Deep Learning},
```

**Solution**: Use the parseBibTeX function which handles nesting
```javascript
// The parser in script.js:~2100 handles this correctly
const papers = parseBibTeX(bibtexContent);
```

### 7. Table Not Updating After Changes

**Problem**: Forgetting to call render functions
```javascript
// ❌ WRONG
papers.push(newPaper);
storage.save(); // Table still shows old data!
```

**Solution**: Always update UI
```javascript
// ✅ CORRECT
papers.push(newPaper);
renderTable();
showSummary();
updateStats();
storage.save();
```

---

## AI Assistant Guidelines

### When Working on This Codebase

1. **Always Read First**
   - Read relevant sections of script.js before making changes
   - Check existing patterns and conventions
   - Look for similar functionality that already exists

2. **Prioritize Security**
   - Use `escapeHtml()` for ALL user input in innerHTML
   - Use `validateUrl()` for ALL URLs
   - Never disable CSP headers
   - Test for XSS vulnerabilities

3. **Performance Matters**
   - Use event delegation, not per-element listeners
   - Debounce expensive operations
   - Avoid unnecessary DOM manipulation
   - Test with 100+ papers to ensure performance

4. **Maintain Backward Compatibility**
   - Keep legacy fields (url, pdfPath) for old data
   - Test imports from old CSV/JSON formats
   - Don't break existing localStorage data

5. **Preserve User Data**
   - Never auto-clear localStorage
   - Always confirm destructive operations
   - Provide export before major changes
   - Handle import errors gracefully

6. **Testing is Required**
   - Test in Chrome, Firefox, Safari
   - Test mobile viewport (375px, 768px, 1024px)
   - Test with test files (test-sample.bib, etc.)
   - Check browser console for errors
   - Verify TESTING_GUIDE.md tests still pass

7. **Code Style**
   - Match existing indentation (4 spaces)
   - Use camelCase for functions/variables
   - Add comments for complex logic
   - Keep functions focused (single responsibility)

8. **Common Tasks**

   **Adding a new field**:
   ```javascript
   // 1. Add to paper object structure (addRow function)
   newField: "",

   // 2. Add to table (renderTable function)
   <td><input data-field="newField" value="${escapeHtml(paper.newField)}"></td>

   // 3. Add to export functions (CSV, JSON, BibTeX)
   // 4. Add to import parsers
   // 5. Update data model documentation in this file
   ```

   **Adding a new button**:
   ```javascript
   // 1. Add to HTML
   <button id="newBtn" class="btn">Label</button>

   // 2. Add event listener in DOMContentLoaded
   document.getElementById('newBtn').addEventListener('click', handleNew);

   // 3. Create handler function
   function handleNew() {
       // Implementation
   }
   ```

   **Fixing a bug**:
   ```javascript
   // 1. Reproduce the bug
   // 2. Check console for errors
   // 3. Add console.log to trace execution
   // 4. Fix the root cause (not symptoms)
   // 5. Test the fix thoroughly
   // 6. Check for regression (other features still work)
   ```

### Questions to Ask Before Coding

- [ ] Have I read the relevant sections of script.js?
- [ ] Does similar functionality already exist?
- [ ] Will this introduce XSS vulnerabilities?
- [ ] Will this cause memory leaks?
- [ ] Will this break existing data?
- [ ] Have I tested on mobile?
- [ ] Have I checked the console for errors?
- [ ] Does this follow existing code patterns?

### When to Stop and Ask

- **Unclear requirements**: Ask user for clarification
- **Major architectural changes**: Discuss approach first
- **Security implications**: Double-check before implementing
- **Breaking changes**: Get explicit approval
- **Performance impact**: Profile and discuss tradeoffs

---

## Key Design Decisions

### Why No Framework?

- **Simplicity**: No build step, easy deployment
- **Performance**: Minimal overhead, fast load times
- **Learning**: Demonstrates vanilla JS patterns
- **Compatibility**: Works everywhere without transpilation

### Why Client-Side Only?

- **Privacy**: User data never leaves their browser
- **Cost**: No server hosting required
- **Deployment**: GitHub Pages (free static hosting)
- **Reliability**: No server downtime

### Why IndexedDB for PDFs?

- **Size**: localStorage limited to ~5-10MB
- **Persistence**: Survives browser restarts
- **Performance**: Handles large binary files efficiently
- **API**: Asynchronous, non-blocking

### Why APA 7th Edition?

- **Standard**: Most common citation style for dissertations
- **Automation**: Can be generated from metadata
- **User Request**: Specified in requirements

---

## Future Considerations

### Potential Enhancements

1. **Virtual Scrolling**: For 1000+ papers
2. **Full-Text Search**: Search within PDFs
3. **Collaboration**: Share libraries via URL
4. **Cloud Sync**: Optional backup to cloud storage
5. **Mobile App**: Progressive Web App (PWA)
6. **Advanced Filters**: Complex query builder
7. **Citation Styles**: MLA, Chicago, etc.
8. **PDF Annotations**: Highlight and note-taking
9. **Reference Graph**: Visualize citation networks
10. **AI Summarization**: Auto-generate abstracts

### Known Limitations

1. **File System Access API**: Chrome/Edge only
2. **localStorage Quota**: ~5-10MB (PDFs use IndexedDB)
3. **No Collaboration**: Single-user only
4. **No Server Sync**: Local data only
5. **Citation Accuracy**: Auto-generated, may need manual review
6. **BibTeX Parsing**: Complex entries may fail
7. **Performance**: Degrades with 500+ papers (needs optimization)

---

## Resources

### Documentation
- [MDN Web Docs](https://developer.mozilla.org/)
- [File System Access API](https://web.dev/file-system-access/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [APA 7th Edition Guide](https://apastyle.apa.org/)

### Testing Files
- `test-sample.bib`: 4 papers, tests all BibTeX features
- `test-json.json`: JSON import format example
- `test-old-format.csv`: Legacy CSV format
- `test-new-format.csv`: Current CSV format

### Related Files
- `README.md`: User-facing documentation
- `TESTING_GUIDE.md`: Comprehensive testing procedures
- `LICENSE`: MIT License

---

## Contact & Contribution

This is an open-source project. When contributing:

1. **Follow this guide**: All patterns and conventions documented here
2. **Test thoroughly**: Use TESTING_GUIDE.md
3. **Document changes**: Update this file if architecture changes
4. **Security first**: Never compromise on XSS/sanitization
5. **User data**: Never break backward compatibility

---

**Last Updated**: 2025-11-15
**Version**: 1.0
**Maintainer**: AI Assistant (Claude)
**Purpose**: Enable AI assistants to work effectively on this codebase

---

## Quick Reference

### File Locations
- Main logic: `script.js`
- UI structure: `index.html`
- Styling: `styles.css`
- Tests: `test-*.{bib,json,csv}`

### Key Functions
- Security: `escapeHtml()`, `validateUrl()`
- Data: `addRow()`, `deleteRow()`, `updatePaper()`
- UI: `renderTable()`, `showSummary()`, `updateStats()`
- Citations: `formatAPA7Citation()`, `copyCitation()`
- Import: `importCSV()`, `importJSON()`, `importBibTeX()`
- Export: `exportToCSV()`, `exportToJSON()`, `exportToBibTeX()`
- PDFs: `attachPDF()`, `openPDF()`, `removePDF()`

### Data Storage
- Papers: `localStorage` (key: `research-tracker-data-v1`)
- PDFs: `IndexedDB` (db: `research-paper-tracker`, store: `pdfs`)
- Settings: `localStorage` (key: `research-tracker-settings-v1`)

### Event Delegation Location
- All setup: `DOMContentLoaded` listener (script.js:~2600-3500)

### Security Checklist
- [ ] All `innerHTML` uses `escapeHtml()`
- [ ] All URLs pass through `validateUrl()`
- [ ] CSP headers present
- [ ] No eval() or Function() constructor
- [ ] File size limits enforced

---

**End of CLAUDE.md**
