// Research Paper Tracker - JavaScript
// Global variables - store data in JavaScript memory
let papers = [];
let nextId = 1;
let batchUpdateTimeout = null;
let errorCount = 0;
const MAX_ERRORS = 3;
const STORAGE_KEY = 'research-tracker-data-v1';

// Rate limiting for localStorage writes
let lastSaveTime = 0;
const SAVE_COOLDOWN = 1000; // 1 second between saves
let pendingSave = false;

// Summary function
function showSummary() {
    const summaryContainer = document.getElementById('papersSummary');
    if (!summaryContainer) return;
    
    if (papers.length === 0) {
        summaryContainer.className = 'papers-grid empty-grid';
        summaryContainer.innerHTML = '<div class="empty-state">No papers added yet. Add some papers to see them here!</div>';
        return;
    }
    
    // Reset container for grid display
    summaryContainer.className = 'papers-grid';
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Validate URLs to prevent XSS and data exfiltration
    const validateUrl = (url) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            // Only allow http and https protocols
            if (['http:', 'https:'].includes(urlObj.protocol)) {
                // Additional safety: check for dangerous patterns
                const dangerousPatterns = [
                    /javascript:/i,
                    /data:/i,
                    /vbscript:/i,
                    /onload/i,
                    /onerror/i,
                    /onclick/i,
                    /file:/i,
                    /ftp:/i,
                    /blob:/i,
                    /about:/i
                ];
                
                const urlString = urlObj.toString().toLowerCase();
                if (dangerousPatterns.some(pattern => pattern.test(urlString))) {
                    return null;
                }
                
                // Check for suspicious domains that might be used for data exfiltration
                const suspiciousDomains = [
                    'localhost',
                    '127.0.0.1',
                    '0.0.0.0',
                    'internal',
                    'local'
                ];
                
                const hostname = urlObj.hostname.toLowerCase();
                if (suspiciousDomains.some(domain => hostname.includes(domain))) {
                    return null;
                }
                
                // Check for very long URLs (potential DoS)
                if (urlString.length > 2000) {
                    return null;
                }
                
                return url;
            }
        } catch (e) {
            // Invalid URL
        }
        return null;
    };
    
    // Generate summary cards
    const summaryHTML = papers.map(paper => {
        const keywords = paper.keywords ? paper.keywords.split(',').map(k => k.trim()).filter(k => k) : [];
        const keywordTags = keywords.map(keyword => 
            `<span class="keyword-tag">${escapeHtml(keyword)}</span>`
        ).join('');
        
        const stars = paper.rating ? '★'.repeat(Math.min(parseInt(paper.rating) || 0, 5)) : '';
        const paperUrl = validateUrl(paper.doi);
        
        return `
            <div class="paper-card" data-paper-id="${paper.id}">
                <div class="paper-status-info">
                    <span class="status-badge">${escapeHtml((paper.status || 'to-read').replace('-', ' '))}</span>
                    <div>
                        <span class="priority-badge">${escapeHtml(paper.priority || 'medium')}</span>
                        ${stars ? `<span class="rating-stars">${escapeHtml(stars)}</span>` : ''}
                    </div>
                </div>
                
                <div class="paper-title" data-paper-url="${paperUrl ? escapeHtml(paperUrl) : ''}" title="${paperUrl ? 'Click to open paper' : 'No URL available'}">
                    ${escapeHtml(paper.title || 'Untitled Paper')}
                </div>
                
                ${paper.authors ? `<div class="paper-authors">${escapeHtml(paper.authors)}</div>` : ''}
                
                <div class="paper-year-journal">
                    ${paper.year ? escapeHtml(paper.year) : 'Year not specified'}
                    ${paper.journal ? ` • ${escapeHtml(paper.journal)}` : ''}
                </div>
                
                ${keywordTags ? `<div class="paper-keywords">${keywordTags}</div>` : ''}
                
                ${paper.keyPoints ? `<div class="paper-key-points">
                    <div class="key-points-header">Key Points:</div>
                    <div class="key-points-content">${escapeHtml(paper.keyPoints)}</div>
                </div>` : ''}
                
                ${paper.notes ? `<div class="paper-relevance">
                    <div class="relevance-header">Relevance & Notes:</div>
                    <div class="relevance-content">${escapeHtml(paper.notes)}</div>
                </div>` : ''}
                
                <div class="paper-card-actions">
                    ${paperUrl ? `<a href="${escapeHtml(paperUrl)}" target="_blank" rel="noopener noreferrer" class="paper-link">📖 Open Paper</a>` : ''}
                    <button class="copy-citation-card-btn" data-paper-id="${paper.id}" title="Copy citation to clipboard">📋 Copy Citation</button>
                </div>
            </div>
        `;
    }).join('');
    
    summaryContainer.innerHTML = summaryHTML;
    
    // Add safe event delegation for paper title clicks and copy buttons
    summaryContainer.addEventListener('click', function(event) {
        const paperTitle = event.target.closest('.paper-title');
        if (paperTitle) {
            const url = paperTitle.getAttribute('data-paper-url');
            if (url) {
                // Additional validation before opening
                try {
                    const urlObj = new URL(url);
                    if (['http:', 'https:'].includes(urlObj.protocol)) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    }
                } catch (e) {
                    console.warn('Invalid URL:', url);
                }
            }
        }
        
        // Handle copy citation button clicks
        if (event.target.classList.contains('copy-citation-card-btn')) {
            const paperId = parseInt(event.target.getAttribute('data-paper-id'));
            if (paperId) {
                copyCitationFromCard(paperId);
            }
        }
    });
}

// Paper management functions
function addRow() {
    try {
        const newPaper = {
            id: nextId++,
            title: "",
            authors: "",
            year: "",
            journal: "",
            keywords: "",
            status: "to-read",
            priority: "medium",
            rating: "",
            dateAdded: new Date().toISOString().split('T')[0],
            keyPoints: "",
            notes: "",
            citation: "",
            doi: "",
            chapter: ""
        };
        papers.push(newPaper);
        batchUpdates();
    } catch (error) {
        handleError(error, 'addRow');
    }
}

function deleteRow(id) {
    try {
        const paperToDelete = papers.find(p => p.id === id);
        if (!paperToDelete) throw new Error(`Paper with id ${id} not found`);
        
        if (confirm(`Delete "${paperToDelete.title || 'Untitled Paper'}"?`)) {
            // Remove the paper from the array
            papers = papers.filter(paper => paper.id !== id);
            
            // First update the table
            const tbody = document.getElementById('paperTableBody');
            if (tbody) {
                const rowToRemove = tbody.querySelector(`tr[data-id="${id}"]`);
                if (rowToRemove) {
                    rowToRemove.remove();
                }
            }
            
            // Update everything else
            updateStats();
            showSummary();
            
            // Save to localStorage
            storage.save();
        }
    } catch (error) {
        handleError(error, 'deleteRow');
    }
}

function clearData() {
    try {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            papers = [];
            nextId = 1;
            localStorage.removeItem(STORAGE_KEY);
            renderTable();
            updateStats();
            showSummary();
        }
    } catch (error) {
        handleError(error, 'clearData');
    }
}

// Add error handling utility
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    errorCount++;
    
    if (errorCount >= MAX_ERRORS) {
        // Show user-friendly error message after multiple failures
        alert('Something went wrong. Please refresh the page and try again.');
        errorCount = 0;
    }
}

// Add batched update function
function batchUpdates(id = null) {
    if (batchUpdateTimeout) {
        cancelAnimationFrame(batchUpdateTimeout);
    }
    
    batchUpdateTimeout = requestAnimationFrame(() => {
        try {
            if (id) updateRowStyling(id);
            updateStats();
            showSummary();
            // Save after UI updates (only once)
            storage.save();
            errorCount = 0;
        } catch (error) {
            handleError(error, 'batchUpdates');
        }
    });
}

// Update the updatePaper function to use batched updates
function updatePaper(id, field, value) {
    try {
        const paper = papers.find(p => p.id === id);
        if (!paper) throw new Error(`Paper with id ${id} not found`);
        
        // Input validation and sanitization
        const sanitizeInput = (input, maxLength = 1000) => {
            if (typeof input !== 'string') return '';
            return input.trim().substring(0, maxLength);
        };
        
        const validateField = (fieldName, fieldValue) => {
            switch (fieldName) {
                case 'year':
                    const yearNum = parseInt(fieldValue);
                    const currentYear = new Date().getFullYear();
                    const maxYear = currentYear + 2; // Allow 2 years in the future for preprints
                    // Validate year is a reasonable range for academic papers (including historical documents)
                    return (!isNaN(yearNum) && yearNum >= 0 && yearNum <= maxYear && yearNum.toString().length >= 1) ? yearNum.toString() : '';
                case 'rating':
                    const ratingNum = parseInt(fieldValue);
                    return (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) ? ratingNum.toString() : '';
                case 'status':
                    return ['to-read', 'reading', 'read', 'skimmed'].includes(fieldValue) ? fieldValue : 'to-read';
                case 'priority':
                    return ['low', 'medium', 'high'].includes(fieldValue) ? fieldValue : 'medium';
                case 'doi':
                    // Basic URL/DOI validation
                    if (!fieldValue) return '';
                    try {
                        if (fieldValue.startsWith('http://') || fieldValue.startsWith('https://')) {
                            new URL(fieldValue); // Validates URL format
                            return sanitizeInput(fieldValue, 500);
                        } else if (fieldValue.match(/^10\.\d{4,}/)) {
                            return sanitizeInput(fieldValue, 200);
                        } else {
                            return sanitizeInput(fieldValue, 500);
                        }
                    } catch {
                        return sanitizeInput(fieldValue, 500);
                    }
                default:
                    return sanitizeInput(fieldValue);
            }
        };
        
        const sanitizedValue = validateField(field, value);
        paper[field] = sanitizedValue;
        
        // Auto-format citation when key fields are updated
        if (['title', 'authors', 'year', 'journal'].includes(field)) {
            const citationData = formatAPA7CitationHTML(paper);
            if (citationData.text) {
                paper.citation = citationData.text;
                const citationDiv = document.querySelector(`div[data-citation-id="${id}"]`);
                if (citationDiv) {
                    citationDiv.innerHTML = citationData.html || citationData.text;
                    citationDiv.setAttribute('data-citation-text', citationData.text);
                }
            }
        }
        
        // Replace multiple update calls with single batched update
        batchUpdates(id);
        
    } catch (error) {
        handleError(error, 'updatePaper');
    }
}

function updateRowStyling(id) {
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (row) {
        const paper = papers.find(p => p.id === id);
        row.className = `status-${paper.status} priority-${paper.priority}`;
    }
}

function formatAPA7Citation(paper) {
    if (!paper.authors || !paper.title) {
        return "";
    }
    
    // Clean and format authors
    let authors = paper.authors.trim();
    if (!authors) return "";
    
    // Handle multiple authors according to APA 7th edition
    const authorArray = authors.split(/,\s*(?=\w)/).map(author => author.trim());
    
    let formattedAuthors = "";
    if (authorArray.length === 1) {
        // Single author
        formattedAuthors = authorArray[0];
    } else if (authorArray.length === 2) {
        // Two authors: "Smith, J., & Jones, A."
        formattedAuthors = `${authorArray[0]}, & ${authorArray[1]}`;
    } else if (authorArray.length >= 3 && authorArray.length <= 20) {
        // 3-20 authors: "Smith, J., Jones, A., & Brown, C."
        const lastAuthor = authorArray[authorArray.length - 1];
        const otherAuthors = authorArray.slice(0, -1);
        formattedAuthors = `${otherAuthors.join(', ')}, & ${lastAuthor}`;
    } else if (authorArray.length > 20) {
        // More than 20 authors: list first 19, then "..." then last author
        const first19 = authorArray.slice(0, 19);
        const lastAuthor = authorArray[authorArray.length - 1];
        formattedAuthors = `${first19.join(', ')}, ... ${lastAuthor}`;
    }
    
    // Format year
    const year = paper.year ? `(${paper.year})` : "(n.d.)";
    
    // Format title (sentence case, no quotes for journal articles)
    const title = paper.title.trim();
    
    // Format journal name (italicized)
    const journal = paper.journal ? paper.journal.trim() : "";
    
    if (journal) {
        // Handle special cases
        if (journal.toLowerCase().includes('arxiv')) {
            // arXiv preprint format
            const arxivMatch = paper.doi ? paper.doi.match(/arxiv\.org\/abs\/([0-9]+\.[0-9]+)/) : null;
            const arxivId = arxivMatch ? arxivMatch[1] : "";
            return `${formattedAuthors} ${year}. ${title}. arXiv preprint${arxivId ? ` arXiv:${arxivId}` : ""}. ${paper.doi || ""}`.trim();
        } else {
            // Regular journal article
            let citation = `${formattedAuthors} ${year}. ${title}. ${journal}`;
            
            // Add volume (required for most journals)
            if (paper.volume) {
                citation += `, ${paper.volume}`;
            }
            
            // Add issue number in parentheses (if available)
            if (paper.issue) {
                citation += `(${paper.issue})`;
            }
            
            // Add page numbers with en-dash
            if (paper.pages) {
                const pages = paper.pages.replace(/-/g, '–'); // Convert hyphens to en-dashes
                citation += `, ${pages}`;
            }
            
            // Add DOI or URL
            if (paper.doi) {
                if (paper.doi.startsWith('http')) {
                    citation += `. ${paper.doi}`;
                } else if (paper.doi.startsWith('10.')) {
                    citation += `. https://doi.org/${paper.doi}`;
                } else {
                    citation += `. ${paper.doi}`;
                }
            }
            
            return citation + ".";
        }
    } else {
        // No journal (book, report, etc.)
        let citation = `${formattedAuthors} ${year}. ${title}`;
        
        // Add URL/DOI if available
        if (paper.doi) {
            if (paper.doi.startsWith('http')) {
                citation += `. ${paper.doi}`;
            } else if (paper.doi.startsWith('10.')) {
                citation += `. https://doi.org/${paper.doi}`;
            } else {
                citation += `. ${paper.doi}`;
            }
        }
        
        return citation + ".";
    }
}

// Create HTML version for display (with italics) and plain text version for copying
function formatAPA7CitationHTML(paper) {
    const plainText = formatAPA7Citation(paper);
    if (!plainText) return { html: "", text: "" };
    
    const journal = paper.journal ? paper.journal.trim() : "";
    let htmlVersion = plainText;
    
    if (journal && !journal.toLowerCase().includes('arxiv')) {
        // Italicize journal name and volume for display
        htmlVersion = htmlVersion.replace(new RegExp(`\\b${journal}\\b`), `<em>${journal}</em>`);
        
        // If there's a volume number after the journal, italicize it too
        if (paper.volume) {
            const volumePattern = new RegExp(`(<em>${journal}</em>), (${paper.volume})`);
            htmlVersion = htmlVersion.replace(volumePattern, `$1, <em>$2</em>`);
        }
    } else if (journal && journal.toLowerCase().includes('arxiv')) {
        // Italicize "arXiv preprint" for display
        htmlVersion = htmlVersion.replace('arXiv preprint', '<em>arXiv preprint</em>');
    }
    
    return { html: htmlVersion, text: plainText };
}

function renderTable() {
    const tbody = document.getElementById('paperTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    papers.forEach(paper => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', paper.id);
        row.className = `status-${paper.status} priority-${paper.priority}`;
        
        // Escape HTML in user input to prevent XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        const citationData = formatAPA7CitationHTML(paper);
        
        row.innerHTML = `
            <td>
                <button class="delete-btn" data-paper-id="${paper.id}">Delete</button>
            </td>
            <td><input type="text" data-paper-id="${paper.id}" data-field="title" value="${escapeHtml(paper.title)}" placeholder="Paper title"></td>
            <td><input type="text" data-paper-id="${paper.id}" data-field="authors" value="${escapeHtml(paper.authors)}" placeholder="Author names"></td>
            <td><input type="number" data-paper-id="${paper.id}" data-field="year" value="${escapeHtml(paper.year)}" placeholder="${new Date().getFullYear()}" min="0" max="${new Date().getFullYear() + 2}"></td>
            <td><input type="text" data-paper-id="${paper.id}" data-field="journal" value="${escapeHtml(paper.journal)}" placeholder="Journal name"></td>
            <td><input type="text" data-paper-id="${paper.id}" data-field="keywords" value="${escapeHtml(paper.keywords)}" placeholder="keyword1, keyword2"></td>
            <td>
                <select data-paper-id="${paper.id}" data-field="status">
                    <option value="to-read" ${paper.status === 'to-read' ? 'selected' : ''}>To Read</option>
                    <option value="reading" ${paper.status === 'reading' ? 'selected' : ''}>Reading</option>
                    <option value="read" ${paper.status === 'read' ? 'selected' : ''}>Read</option>
                    <option value="skimmed" ${paper.status === 'skimmed' ? 'selected' : ''}>Skimmed</option>
                </select>
            </td>
            <td>
                <select data-paper-id="${paper.id}" data-field="priority">
                    <option value="low" ${paper.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${paper.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${paper.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </td>
            <td>
                <select data-paper-id="${paper.id}" data-field="rating">
                    <option value="">-</option>
                    <option value="1" ${paper.rating === '1' ? 'selected' : ''}>1⭐</option>
                    <option value="2" ${paper.rating === '2' ? 'selected' : ''}>2⭐</option>
                    <option value="3" ${paper.rating === '3' ? 'selected' : ''}>3⭐</option>
                    <option value="4" ${paper.rating === '4' ? 'selected' : ''}>4⭐</option>
                    <option value="5" ${paper.rating === '5' ? 'selected' : ''}>5⭐</option>
                </select>
            </td>
            <td><input type="date" data-paper-id="${paper.id}" data-field="dateAdded" value="${escapeHtml(paper.dateAdded)}"></td>
            <td><textarea data-paper-id="${paper.id}" data-field="keyPoints" placeholder="Main findings, methodology, key insights...">${escapeHtml(paper.keyPoints)}</textarea></td>
            <td><textarea data-paper-id="${paper.id}" data-field="notes" placeholder="Relevance to dissertation, connections to other work, critical analysis...">${escapeHtml(paper.notes)}</textarea></td>
            <td>
                <div class="citation-container">
                    <div class="citation-display" data-citation-id="${paper.id}" data-citation-text="${escapeHtml(citationData.text)}" title="Click to copy citation">
                        ${citationData.html || citationData.text || '<em>Enter title, authors, year, and journal to auto-generate APA citation</em>'}
                    </div>
                    <button class="copy-citation-btn" data-paper-id="${paper.id}" title="Copy citation to clipboard">📋</button>
                </div>
            </td>
            <td><input type="url" data-paper-id="${paper.id}" data-field="doi" value="${escapeHtml(paper.doi)}" placeholder="DOI or URL"></td>
            <td><input type="text" data-paper-id="${paper.id}" data-field="chapter" value="${escapeHtml(paper.chapter)}" placeholder="Chapter 1, Literature Review, etc."></td>
        `;
        
        tbody.appendChild(row);
    });
}

// Copy citation to clipboard
function copyCitation(id) {
    const citationDiv = document.querySelector(`div[data-citation-id="${id}"]`);
    if (!citationDiv) return;
    
    const citationText = citationDiv.getAttribute('data-citation-text');
    if (!citationText) {
        alert('No citation available to copy');
        return;
    }
    
    // Try to use the modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(citationText).then(() => {
            showCopyFeedback(id);
        }).catch(() => {
            // Fallback to legacy method
            fallbackCopy(citationText, id);
        });
    } else {
        // Fallback to legacy method
        fallbackCopy(citationText, id);
    }
}

function fallbackCopy(text, id) {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.className = 'temp-textarea';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(id);
            }).catch(() => {
                // Fallback to execCommand only if clipboard API fails
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showCopyFeedback(id);
                    } else {
                        throw new Error('Copy command failed');
                    }
                } catch (execErr) {
                    console.warn('Copy failed:', execErr);
                    const copyText = prompt('Copy failed. Please copy this text manually:', text);
                    if (copyText !== null) {
                        showCopyFeedback(id);
                    }
                }
            });
        } else {
            // Fallback to execCommand for older browsers
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyFeedback(id);
            } else {
                throw new Error('Copy command failed');
            }
        }
    } catch (err) {
        console.warn('Copy failed:', err);
        // Show user-friendly message with manual copy option
        const copyText = prompt('Copy failed. Please copy this text manually:', text);
        if (copyText !== null) {
            showCopyFeedback(id);
        }
    }
    
    document.body.removeChild(textarea);
}

function showCopyFeedback(id) {
    const button = document.querySelector(`button[data-paper-id="${id}"].copy-citation-btn`);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✅';
        button.classList.add('copy-success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copy-success');
        }, 2000);
    }
}

// Copy citation from summary card
function copyCitationFromCard(id) {
    const paper = papers.find(p => p.id === id);
    if (!paper) {
        alert('Paper not found');
        return;
    }
    
    // If no citation exists, try to generate one
    if (!paper.citation) {
        const citationData = formatAPA7CitationHTML(paper);
        if (citationData.text) {
            paper.citation = citationData.text;
        } else {
            alert('Cannot generate citation - please ensure title, authors, year, and journal are filled in');
            return;
        }
    }
    
    // Try to use the modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(paper.citation).then(() => {
            showCopyFeedbackCard(id);
        }).catch(() => {
            // Fallback to legacy method
            fallbackCopyCard(paper.citation, id);
        });
    } else {
        // Fallback to legacy method
        fallbackCopyCard(paper.citation, id);
    }
}

function fallbackCopyCard(text, id) {
    // Create a temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.className = 'temp-textarea';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
        showCopyFeedbackCard(id);
            }).catch(() => {
                // Fallback to execCommand only if clipboard API fails
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showCopyFeedbackCard(id);
                    } else {
                        throw new Error('Copy command failed');
                    }
                } catch (execErr) {
                    console.warn('Copy failed:', execErr);
                    const copyText = prompt('Copy failed. Please copy this text manually:', text);
                    if (copyText !== null) {
                        showCopyFeedbackCard(id);
                    }
                }
            });
        } else {
            // Fallback to execCommand for older browsers
            const successful = document.execCommand('copy');
            if (successful) {
                showCopyFeedbackCard(id);
            } else {
                throw new Error('Copy command failed');
            }
        }
    } catch (err) {
        console.warn('Copy failed:', err);
        // Show user-friendly message with manual copy option
        const copyText = prompt('Copy failed. Please copy this text manually:', text);
        if (copyText !== null) {
            showCopyFeedbackCard(id);
        }
    }
    
    document.body.removeChild(textarea);
}

function showCopyFeedbackCard(id) {
    const button = document.querySelector(`button[data-paper-id="${id}"].copy-citation-card-btn`);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copy-success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copy-success');
        }, 2000);
    }
}

function updateStats() {
    const total = papers.length;
    const read = papers.filter(p => p.status === 'read').length;
    const reading = papers.filter(p => p.status === 'reading').length;
    const toRead = papers.filter(p => p.status === 'to-read').length;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('readCount').textContent = read;
    document.getElementById('readingCount').textContent = reading;
    document.getElementById('toReadCount').textContent = toRead;
}

function exportToCSV() {
    const headers = ['Title', 'Authors', 'Year', 'Journal/Venue', 'Keywords', 'Status', 'Priority', 'Rating', 'Date Added', 'Key Points', 'Notes', 'Citation', 'DOI/URL', 'Chapter/Topic'];
    
    const csvContent = [
        headers.join(','),
        ...papers.map(paper => [
            `"${(paper.title || '').replace(/"/g, '""')}"`,
            `"${(paper.authors || '').replace(/"/g, '""')}"`,
            paper.year || '',
            `"${(paper.journal || '').replace(/"/g, '""')}"`,
            `"${(paper.keywords || '').replace(/"/g, '""')}"`,
            paper.status || '',
            paper.priority || '',
            paper.rating || '',
            paper.dateAdded || '',
            `"${(paper.keyPoints || '').replace(/"/g, '""')}"`,
            `"${(paper.notes || '').replace(/"/g, '""')}"`,
            `"${(paper.citation || '').replace(/"/g, '""')}"`,
            `"${(paper.doi || '').replace(/"/g, '""')}"`,
            `"${(paper.chapter || '').replace(/"/g, '""')}"`,
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dissertation_papers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
    }
    
    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File is too large. Please select a file smaller than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            
            let importCount = 0;
            const maxRows = 1000; // Prevent memory issues
            
            for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // Use safer CSV parsing to prevent ReDoS
                const values = parseCSVLine(line);
                if (values.length < 3) continue; // Minimum required fields
                
                const cleanValue = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
                
                const paper = {
                    id: nextId++,
                    title: cleanValue(values[0]).substring(0, 500),
                    authors: cleanValue(values[1]).substring(0, 500),
                    year: cleanValue(values[2]).substring(0, 4),
                    journal: cleanValue(values[3]).substring(0, 300),
                    keywords: cleanValue(values[4]).substring(0, 500),
                    status: ['to-read', 'reading', 'read', 'skimmed'].includes(cleanValue(values[5])) ? cleanValue(values[5]) : 'to-read',
                    priority: ['low', 'medium', 'high'].includes(cleanValue(values[6])) ? cleanValue(values[6]) : 'medium',
                    rating: ['1','2','3','4','5'].includes(cleanValue(values[7])) ? cleanValue(values[7]) : '',
                    dateAdded: cleanValue(values[8]) || new Date().toISOString().split('T')[0],
                    keyPoints: cleanValue(values[9]).substring(0, 2000),
                    notes: cleanValue(values[10]).substring(0, 1000),
                    citation: cleanValue(values[11]).substring(0, 1000),
                    doi: cleanValue(values[12]).substring(0, 500),
                    chapter: cleanValue(values[13]).substring(0, 200)
                };
                
                papers.push(paper);
                importCount++;
            }
            
            if (importCount > 0) {
                renderTable();
                updateStats();
                showSummary();
                alert(`Successfully imported ${importCount} papers`);
            } else {
                alert('No valid papers found in the CSV file');
            }
            
            // Clear the file input to prevent re-submission
            event.target.value = '';
        } catch (error) {
            alert('Error reading CSV file. Please check the file format');
        }
    };
    
    reader.onerror = function() {
        alert('Error reading file');
    };
    
    reader.readAsText(file);
}

// Safe CSV line parsing to prevent ReDoS attacks
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    // Limit processing to prevent DoS
    const maxLength = 10000;
    if (line.length > maxLength) {
        throw new Error('CSV line too long');
    }
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
}

// Smart input processing function
async function addFromSmartInput() {
    const input = document.getElementById('extractedData').value.trim();
    if (!input) {
        alert('Please enter a paper title, URL, DOI, or citation information!');
        return;
    }

    // Limit input length to prevent potential issues
    if (input.length > 10000) {
        alert('Input is too long. Please limit to 10,000 characters.');
        return;
    }

    // Check if input is already valid JSON
    try {
        const paperInfo = JSON.parse(input);
        
        // Validate that it's an object with expected structure
        if (typeof paperInfo !== 'object' || paperInfo === null || Array.isArray(paperInfo)) {
            throw new Error('Invalid JSON structure');
        }
        
        // Validate required JSON structure for paper info
        const validKeys = ['title', 'authors', 'year', 'journal', 'keywords', 'abstract', 'url', 'relevance'];
        const hasValidStructure = Object.keys(paperInfo).some(key => validKeys.includes(key));
        
        if (!hasValidStructure) {
            throw new Error('JSON does not contain expected paper fields');
        }
        
        // Valid JSON - show preview modal
        showPreviewModal(paperInfo);
        return;
    } catch (e) {
        // Not valid JSON or not paper structure - show Claude prompt instead
        showClaudePrompt(input);
        return;
    }
}

// Show Claude prompt for user to copy
function showClaudePrompt(input) {
    // Sanitize input to prevent XSS
    const sanitizeInput = (text) => {
        if (!text) return '';
        return text
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/"/g, '\\"') // Escape quotes
            .replace(/\n/g, '\\n') // Escape newlines
            .replace(/\r/g, '\\r') // Escape carriage returns
            .substring(0, 1000); // Limit length
    };
    
    const sanitizedInput = sanitizeInput(input);
    
    const prompt = `I'm using a Research Paper Tracker app and need you to extract paper information. The user provided: "${sanitizedInput}"

Please analyze this and return the information in this exact JSON format:

{
  "title": "Full paper title",
  "authors": "Author names in APA format (Last, F. M., Last, F. M., & Last, F. M.)",
  "year": "Publication year",
  "journal": "Journal or venue name",
  "keywords": "keyword1, keyword2, keyword3, keyword4",
  "abstract": "Key findings, methodology, and main contributions in 2-3 sentences",
  "url": "DOI link or paper URL",
  "relevance": "Why this paper might be relevant to research (1-2 sentences)"
}

Please ensure the JSON is properly formatted and fill in as much information as possible. If you cannot find certain fields, use empty strings but keep the JSON structure intact.`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">📋 Copy This Prompt to Claude</h3>
                <button class="modal-close" id="claude-close-btn">&times;</button>
            </div>
            <div class="modal-content">
                <p class="claude-instructions">
                    Copy the prompt below, paste it into your Claude chat, then copy the JSON response back into the input field.
                </p>
                <div class="modal-field">
                    <textarea id="claude-prompt" readonly class="claude-prompt-textarea">${prompt}</textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" id="claude-cancel-btn">Close</button>
                <button class="modal-btn modal-btn-primary" id="claude-copy-btn">📋 Copy Prompt</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for modal buttons
    document.getElementById('claude-close-btn').addEventListener('click', closeClaudePromptModal);
    document.getElementById('claude-cancel-btn').addEventListener('click', closeClaudePromptModal);
    document.getElementById('claude-copy-btn').addEventListener('click', copyClaudePrompt);
    
    // Focus and select the textarea
    setTimeout(() => {
        const textarea = document.getElementById('claude-prompt');
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }, 100);
}

// Close Claude prompt modal
function closeClaudePromptModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Copy Claude prompt to clipboard
function copyClaudePrompt() {
    const textarea = document.getElementById('claude-prompt');
    if (textarea) {
        const text = textarea.value;
        
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showClaudeCopyFeedback();
            }).catch(() => {
                // Fallback to execCommand
        textarea.select();
                try {
        document.execCommand('copy');
                    showClaudeCopyFeedback();
                } catch (err) {
                    console.warn('Copy failed:', err);
                    alert('Copy failed. Please select and copy the text manually.');
                }
            });
        } else {
            // Fallback to execCommand for older browsers
            textarea.select();
            try {
                document.execCommand('copy');
                showClaudeCopyFeedback();
            } catch (err) {
                console.warn('Copy failed:', err);
                alert('Copy failed. Please select and copy the text manually.');
            }
        }
    }
}

function showClaudeCopyFeedback() {
        const button = document.querySelector('.modal-btn-primary');
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copied!';
        button.classList.add('copy-success');
            
            setTimeout(() => {
                button.innerHTML = originalText;
            button.classList.remove('copy-success');
            }, 2000);
    }
}

// Show preview modal with extracted information
function showPreviewModal(paperInfo) {
    // Validate and sanitize paperInfo
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text.toString();
        return div.innerHTML;
    };
    
    const sanitizedPaper = {
        title: escapeHtml(paperInfo.title || ''),
        authors: escapeHtml(paperInfo.authors || ''),
        year: escapeHtml(paperInfo.year || ''),
        journal: escapeHtml(paperInfo.journal || ''),
        keywords: escapeHtml(paperInfo.keywords || ''),
        abstract: escapeHtml(paperInfo.abstract || ''),
        url: escapeHtml(paperInfo.url || ''),
        relevance: escapeHtml(paperInfo.relevance || '')
    };
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Paper Information Found</h3>
                <button class="modal-close" id="preview-close-btn">&times;</button>
            </div>
            <div class="modal-content">
                <div class="modal-field">
                    <label>Title</label>
                    <input type="text" id="preview-title" value="${sanitizedPaper.title}" maxlength="500">
                </div>
                <div class="modal-field">
                    <label>Authors</label>
                    <input type="text" id="preview-authors" value="${sanitizedPaper.authors}" maxlength="500">
                </div>
                <div class="modal-field">
                    <label>Year</label>
                    <input type="number" id="preview-year" value="${sanitizedPaper.year}" min="0" max="${new Date().getFullYear() + 2}">
                </div>
                <div class="modal-field">
                    <label>Journal/Venue</label>
                    <input type="text" id="preview-journal" value="${sanitizedPaper.journal}" maxlength="300">
                </div>
                <div class="modal-field">
                    <label>Keywords</label>
                    <input type="text" id="preview-keywords" value="${sanitizedPaper.keywords}" maxlength="500">
                </div>
                <div class="modal-field">
                    <label>Key Points/Abstract</label>
                    <textarea id="preview-abstract" maxlength="2000">${sanitizedPaper.abstract}</textarea>
                </div>
                <div class="modal-field">
                    <label>DOI/URL</label>
                    <input type="url" id="preview-url" value="${sanitizedPaper.url}" maxlength="500">
                </div>
                <div class="modal-field">
                    <label>Relevance/Notes</label>
                    <textarea id="preview-relevance" maxlength="1000">${sanitizedPaper.relevance}</textarea>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" id="preview-cancel-btn">Cancel</button>
                <button class="modal-btn modal-btn-primary" id="preview-add-btn">Add to Library</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners for modal buttons
    document.getElementById('preview-close-btn').addEventListener('click', closePreviewModal);
    document.getElementById('preview-cancel-btn').addEventListener('click', closePreviewModal);
    document.getElementById('preview-add-btn').addEventListener('click', addPaperFromPreview);
    
    // Focus first input with safety check
    setTimeout(() => {
        const titleInput = document.getElementById('preview-title');
        if (titleInput) titleInput.focus();
    }, 100);
}

// Close preview modal
function closePreviewModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Add paper from preview modal
function addPaperFromPreview() {
    const titleEl = document.getElementById('preview-title');
    const authorsEl = document.getElementById('preview-authors');
    const yearEl = document.getElementById('preview-year');
    const journalEl = document.getElementById('preview-journal');
    const keywordsEl = document.getElementById('preview-keywords');
    const abstractEl = document.getElementById('preview-abstract');
    const urlEl = document.getElementById('preview-url');
    const relevanceEl = document.getElementById('preview-relevance');
    
    if (!titleEl || !authorsEl || !yearEl || !journalEl || !keywordsEl || !abstractEl || !urlEl || !relevanceEl) {
        alert('Error: Could not find all required form fields');
        return;
    }
    
    const newPaper = {
        id: nextId++,
        title: titleEl.value || '',
        authors: authorsEl.value || '',
        year: yearEl.value || '',
        journal: journalEl.value || '',
        keywords: keywordsEl.value || '',
        status: "to-read",
        priority: "medium",
        rating: "",
        dateAdded: new Date().toISOString().split('T')[0],
        keyPoints: abstractEl.value || '',
        notes: relevanceEl.value || '',
        citation: "",
        doi: urlEl.value || '',
        chapter: ""
    };
    
    // Auto-generate citation
    const citationData = formatAPA7CitationHTML(newPaper);
    if (citationData.text) {
        newPaper.citation = citationData.text;
    }
    
    papers.push(newPaper);
    renderTable();
    updateStats();
    showSummary();
    
    // Clear input and close modal
    const extractedDataEl = document.getElementById('extractedData');
    if (extractedDataEl) extractedDataEl.value = '';
    closePreviewModal();
    
    alert('Paper added successfully to your library!');
}

// Storage utilities
const storage = {
    save() {
        // Rate limiting: prevent too frequent saves
        const now = Date.now();
        if (now - lastSaveTime < SAVE_COOLDOWN) {
            if (!pendingSave) {
                pendingSave = true;
                setTimeout(() => {
                    this.save();
                    pendingSave = false;
                }, SAVE_COOLDOWN - (now - lastSaveTime));
            }
            return;
        }
        
        lastSaveTime = now;
        
        try {
            const data = {
                papers: papers,
                nextId: nextId,
                lastModified: new Date().toISOString()
            };
            // Validate before saving
            if (!Array.isArray(data.papers) || typeof data.nextId !== 'number') {
                throw new Error('Invalid data structure');
            }
            
            const dataString = JSON.stringify(data);
            
            // Check localStorage quota before saving
            try {
                // Test if we can store the data
                const testKey = 'test_' + Date.now();
                localStorage.setItem(testKey, dataString);
                localStorage.removeItem(testKey);
            } catch (quotaError) {
                // If quota exceeded, try to clean up old data and compress
                this.cleanupOldData();
                // Try again with compressed data
                const compressedData = this.compressData(data);
                localStorage.setItem(STORAGE_KEY, compressedData);
                return;
            }
            
            localStorage.setItem(STORAGE_KEY, dataString);
            // Ensure table is rendered after saving
            renderTable();
        } catch (error) {
            handleError(error, 'storage.save');
            // If still failing, show user warning
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Please export your data and clear some papers to continue.');
            }
        }
    },
    
    cleanupOldData() {
        try {
            // Remove old test keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('test_')) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.warn('Could not cleanup old data:', e);
        }
    },
    
    compressData(data) {
        // Simple compression by removing empty fields
        const compressed = {
            papers: data.papers.map(paper => {
                const compressedPaper = {};
                Object.keys(paper).forEach(key => {
                    if (paper[key] && paper[key] !== '') {
                        compressedPaper[key] = paper[key];
                    }
                });
                return compressedPaper;
            }),
            nextId: data.nextId,
            lastModified: data.lastModified
        };
        return JSON.stringify(compressed);
    },

    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return false;

            const data = JSON.parse(stored);
            
            // Validate structure with better error handling
            if (!data || typeof data !== 'object') {
                console.warn('Invalid data format, clearing storage');
                this.clear();
                return false;
            }
            
            if (!Array.isArray(data.papers) || typeof data.nextId !== 'number') {
                console.warn('Corrupted data structure, clearing storage');
                this.clear();
                return false;
            }

            // Sanitize loaded data
            const currentYear = new Date().getFullYear();
            const maxYear = currentYear + 2;
            
            papers = data.papers.map(p => {
                const yearStr = String(p.year || '').slice(0, 4);
                const yearNum = parseInt(yearStr);
                const validYear = (!isNaN(yearNum) && yearNum >= 0 && yearNum <= maxYear && yearStr.length >= 1) ? yearStr : '';
                
                return {
                id: Number(p.id) || nextId++,
                title: String(p.title || '').slice(0, 500),
                authors: String(p.authors || '').slice(0, 500),
                    year: validYear,
                journal: String(p.journal || '').slice(0, 300),
                keywords: String(p.keywords || '').slice(0, 500),
                status: ['to-read', 'reading', 'read', 'skimmed'].includes(p.status) ? p.status : 'to-read',
                priority: ['low', 'medium', 'high'].includes(p.priority) ? p.priority : 'medium',
                rating: ['1','2','3','4','5'].includes(p.rating) ? p.rating : '',
                dateAdded: p.dateAdded || new Date().toISOString().split('T')[0],
                keyPoints: String(p.keyPoints || '').slice(0, 2000),
                notes: String(p.notes || '').slice(0, 1000),
                citation: String(p.citation || '').slice(0, 1000),
                doi: String(p.doi || '').slice(0, 500),
                chapter: String(p.chapter || '').slice(0, 200)
                };
            });
            
            // Ensure nextId is higher than any existing id
            nextId = Math.max(data.nextId, ...papers.map(p => p.id) + 1);
            return true;

        } catch (error) {
            console.warn('Storage load error, clearing corrupted data:', error.message);
            this.clear();
            return false;
        }
    },

    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            handleError(error, 'storage.clear');
        }
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app');
    
    if (storage.load()) {
        console.log('Loaded saved research data');
        // Ensure table is rendered when data is loaded
        renderTable();
    }
    updateStats();
    showSummary();
    
    // Add event listeners for all buttons
    console.log('Initializing event listeners');
    initializeEventListeners();
    console.log('Event listeners initialized');
});

// Initialize all event listeners
function initializeEventListeners() {
    // Main control buttons
    document.getElementById('addRowBtn').addEventListener('click', addRow);
    document.getElementById('dataBtn').addEventListener('click', addFromSmartInput);
    document.getElementById('showSummaryBtn').addEventListener('click', showSummary);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('clearDataBtn').addEventListener('click', clearData);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('csvImport').click();
    });
    
    // CSV import handler
    document.getElementById('csvImport').addEventListener('change', importCSV);
    
    // Enter key support for smart input
    document.getElementById('extractedData').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addFromSmartInput();
        }
    });
    
    // Table event delegation
    setupTableEventDelegation();
    
    // Table collapse functionality
    setupTableCollapse();
    
    // Settings functionality
    setupSettings();
    
    // Load saved theme
    loadTheme();
}

// Setup event delegation for table interactions
function setupTableEventDelegation() {
    const tableBody = document.getElementById('paperTableBody');
    if (!tableBody) return;
    
    // Handle delete buttons
    tableBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const paperId = parseInt(e.target.getAttribute('data-paper-id'));
            if (paperId) {
                deleteRow(paperId);
            }
        }
        
        // Handle copy citation buttons
        if (e.target.classList.contains('copy-citation-btn')) {
            const paperId = parseInt(e.target.getAttribute('data-paper-id'));
            if (paperId) {
                copyCitation(paperId);
            }
        }
    });
    
    // Handle input changes
    tableBody.addEventListener('input', function(e) {
        const paperId = parseInt(e.target.getAttribute('data-paper-id'));
        const field = e.target.getAttribute('data-field');
        
        if (paperId && field) {
            updatePaper(paperId, field, e.target.value);
        }
    });
    
    // Handle select changes
    tableBody.addEventListener('change', function(e) {
        const paperId = parseInt(e.target.getAttribute('data-paper-id'));
        const field = e.target.getAttribute('data-field');
        
        if (paperId && field) {
            updatePaper(paperId, field, e.target.value);
        }
    });
}

// Setup table collapse functionality
function setupTableCollapse() {
    const toggleBtn = document.getElementById('tableToggleBtn');
    const tableWrapper = document.getElementById('tableWrapper');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (!toggleBtn || !tableWrapper || !toggleIcon) return;
    
    toggleBtn.addEventListener('click', function() {
        const isCollapsed = tableWrapper.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand the table
            tableWrapper.classList.remove('collapsed');
            tableWrapper.classList.add('expanded');
            toggleIcon.textContent = '▲';
            toggleBtn.setAttribute('title', 'Collapse table');
        } else {
            // Collapse the table
            tableWrapper.classList.remove('expanded');
            tableWrapper.classList.add('collapsed');
            toggleIcon.textContent = '▼';
            toggleBtn.setAttribute('title', 'Expand table');
        }
    });
}

// Settings functionality
function setupSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (!settingsBtn) {
        console.error('Settings button not found!');
        return;
    }
    
    console.log('Setting up settings button');
    settingsBtn.addEventListener('click', function(e) {
        console.log('Settings button clicked!');
        e.preventDefault();
        e.stopPropagation();
        showSettingsModal();
    });
}

// Show settings modal
function showSettingsModal() {
    console.log('Showing settings modal');
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
        <div class="settings-content">
            <div class="settings-header">
                <h3 class="settings-title">Settings</h3>
                <button class="settings-close" id="settingsCloseBtn">&times;</button>
            </div>
            <div class="settings-section">
                <h4 class="settings-section-title">Page Style</h4>
                <div class="theme-option" data-theme="default">
                    <div class="theme-preview theme-preview-default"></div>
                    <div class="theme-info">
                        <div class="theme-name">Default</div>
                        <div class="theme-description">Original blue and purple gradient theme</div>
                    </div>
                </div>
                <div class="theme-option" data-theme="dark">
                    <div class="theme-preview theme-preview-dark"></div>
                    <div class="theme-info">
                        <div class="theme-name">Dark Mode</div>
                        <div class="theme-description">Dark theme with blue accents</div>
                    </div>
                </div>
                <div class="theme-option" data-theme="dark-blue">
                    <div class="theme-preview theme-preview-dark-blue"></div>
                    <div class="theme-info">
                        <div class="theme-name">Dark Blue & Purple</div>
                        <div class="theme-description">Dark blue with purple gradients, no white text</div>
                    </div>
                </div>
                <div class="theme-option" data-theme="clean">
                    <div class="theme-preview theme-preview-clean"></div>
                    <div class="theme-info">
                        <div class="theme-name">Clean High Contrast</div>
                        <div class="theme-description">Clean white background with high contrast</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('settingsCloseBtn').addEventListener('click', closeSettingsModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeSettingsModal();
        }
    });
    
    // Add theme selection handlers
    const themeOptions = modal.querySelectorAll('.theme-option');
    console.log('Found theme options:', themeOptions.length);
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            console.log('Theme option clicked:', theme);
            selectTheme(theme);
        });
    });
    
    // Mark current theme as selected
    const currentTheme = document.body.getAttribute('data-theme') || 'default';
    const currentOption = modal.querySelector(`[data-theme="${currentTheme}"]`);
    if (currentOption) {
        currentOption.classList.add('selected');
    }
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.querySelector('.settings-modal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Select theme
function selectTheme(theme) {
    console.log('Selecting theme:', theme);
    
    // Remove current theme
    document.body.removeAttribute('data-theme');
    
    // Apply new theme
    if (theme !== 'default') {
        document.body.setAttribute('data-theme', theme);
        console.log('Applied theme attribute:', document.body.getAttribute('data-theme'));
    }
    
    // Save theme preference
    localStorage.setItem('research-tracker-theme', theme);
    
    // Update selected state in modal
    const modal = document.querySelector('.settings-modal');
    if (modal) {
        const themeOptions = modal.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('selected');
            }
        });
    }
    
    // Force a re-render by updating stats
    updateStats();
    showSummary();
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('research-tracker-theme');
    console.log('Loading saved theme:', savedTheme);
    if (savedTheme && savedTheme !== 'default') {
        document.body.setAttribute('data-theme', savedTheme);
        console.log('Applied saved theme:', document.body.getAttribute('data-theme'));
    }
}

// Save data before tab/window closes
window.addEventListener('beforeunload', () => {
    if (papers.length > 0) {
        // Force immediate save
        storage.save();
    }
});

window.addEventListener('unload', () => {
    if (batchUpdateTimeout) {
        cancelAnimationFrame(batchUpdateTimeout);
    }
    // Final attempt to save data
    if (papers.length > 0) {
        storage.save();
    }
});
