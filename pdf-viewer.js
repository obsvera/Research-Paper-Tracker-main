// PDF Viewer with Highlighting and Annotations
// Uses PDF.js for rendering and integrates with the Research Paper Tracker

(function() {
    'use strict';

    // PDF.js configuration
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

    // Highlight colors
    const HIGHLIGHT_COLORS = {
        yellow: { hex: '#ffeb3b', name: 'Yellow' },
        green: { hex: '#81c784', name: 'Green' },
        pink: { hex: '#f48fb1', name: 'Pink' },
        blue: { hex: '#64b5f6', name: 'Blue' }
    };

    // Module state
    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let scale = 1.0;
    let currentPaperId = null;
    let isSelecting = false;
    let selectionStart = null;
    let selectedColor = 'yellow';
    let textLayer = null;
    let pdfContainer = null;

    // Initialize PDF.js worker
    function initPDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
            return true;
        }
        return false;
    }

    // Create the PDF viewer modal HTML
    function createViewerModal() {
        if (document.getElementById('pdf-viewer-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.className = 'pdf-viewer-modal';
        modal.innerHTML = `
            <div class="pdf-viewer-container">
                <div class="pdf-viewer-header">
                    <div class="pdf-viewer-title">
                        <span id="pdf-viewer-paper-title">PDF Viewer</span>
                    </div>
                    <div class="pdf-viewer-controls">
                        <button id="pdf-zoom-out" class="pdf-control-btn" title="Zoom Out">−</button>
                        <span id="pdf-zoom-level">100%</span>
                        <button id="pdf-zoom-in" class="pdf-control-btn" title="Zoom In">+</button>
                        <button id="pdf-fit-width" class="pdf-control-btn" title="Fit Width">⇔</button>
                        <span class="pdf-page-controls">
                            <button id="pdf-prev-page" class="pdf-control-btn" title="Previous Page">◀</button>
                            <span id="pdf-page-info">1 / 1</span>
                            <button id="pdf-next-page" class="pdf-control-btn" title="Next Page">▶</button>
                        </span>
                        <button id="pdf-viewer-close" class="pdf-close-btn" title="Close">✕</button>
                    </div>
                </div>
                <div class="pdf-viewer-body">
                    <div class="pdf-highlight-toolbar">
                        <span class="toolbar-label">Highlight:</span>
                        <button class="highlight-color-btn selected" data-color="yellow" style="background-color: #ffeb3b;" title="Yellow"></button>
                        <button class="highlight-color-btn" data-color="green" style="background-color: #81c784;" title="Green"></button>
                        <button class="highlight-color-btn" data-color="pink" style="background-color: #f48fb1;" title="Pink"></button>
                        <button class="highlight-color-btn" data-color="blue" style="background-color: #64b5f6;" title="Blue"></button>
                        <span class="toolbar-separator"></span>
                        <button id="btn-add-highlight" class="pdf-action-btn" title="Add Highlight from Selection">✨ Highlight Selection</button>
                    </div>
                    <div class="pdf-viewer-main">
                        <div id="pdf-canvas-container" class="pdf-canvas-container">
                            <div class="pdf-loading">Loading PDF...</div>
                        </div>
                        <div class="pdf-annotations-sidebar">
                            <div class="annotations-header">
                                <h3>Annotations</h3>
                                <span id="annotation-count" class="annotation-count">0</span>
                            </div>
                            <div id="annotations-list" class="annotations-list">
                                <div class="no-annotations">No annotations yet. Select text and click "Highlight Selection" to add annotations.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        attachViewerEventListeners();
    }

    // Attach event listeners to the viewer
    function attachViewerEventListeners() {
        // Close button
        document.getElementById('pdf-viewer-close').addEventListener('click', closeViewer);

        // Close on backdrop click
        document.getElementById('pdf-viewer-modal').addEventListener('click', (e) => {
            if (e.target.id === 'pdf-viewer-modal') {
                closeViewer();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('pdf-viewer-modal').classList.contains('open')) {
                closeViewer();
            }
        });

        // Zoom controls
        document.getElementById('pdf-zoom-in').addEventListener('click', () => zoomPDF(0.25));
        document.getElementById('pdf-zoom-out').addEventListener('click', () => zoomPDF(-0.25));
        document.getElementById('pdf-fit-width').addEventListener('click', fitToWidth);

        // Page navigation
        document.getElementById('pdf-prev-page').addEventListener('click', () => changePage(-1));
        document.getElementById('pdf-next-page').addEventListener('click', () => changePage(1));

        // Highlight color selection
        document.querySelectorAll('.highlight-color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.highlight-color-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;
            });
        });

        // Add highlight button
        document.getElementById('btn-add-highlight').addEventListener('click', addHighlightFromSelection);
    }

    // Open PDF in viewer
    window.openPDFViewer = async function(paperId) {
        if (!initPDFJS()) {
            alert('PDF.js library not loaded. Please refresh the page.');
            return;
        }

        currentPaperId = paperId;
        const paper = papers.find(p => p.id === paperId);
        if (!paper) {
            alert('Paper not found.');
            return;
        }

        createViewerModal();
        const modal = document.getElementById('pdf-viewer-modal');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Set title
        document.getElementById('pdf-viewer-paper-title').textContent = paper.title || 'PDF Viewer';

        // Load PDF
        try {
            const pdfData = await getPDFData(paper);
            if (pdfData) {
                await loadPDF(pdfData);
                renderAnnotationsList();
            } else {
                document.getElementById('pdf-canvas-container').innerHTML =
                    '<div class="pdf-error">Could not load PDF. Please check if the file is available.</div>';
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
            document.getElementById('pdf-canvas-container').innerHTML =
                '<div class="pdf-error">Error loading PDF: ' + escapeHtml(error.message) + '</div>';
        }
    };

    // Get PDF data from various sources
    async function getPDFData(paper) {
        if (paper.hasPDF) {
            if (paper.pdfSource === "folder" && typeof papersFolderHandle !== 'undefined' && papersFolderHandle) {
                try {
                    const filename = paper.pdfPath.split('/').pop();
                    const fileHandle = await papersFolderHandle.getFileHandle(filename);
                    const file = await fileHandle.getFile();
                    return await file.arrayBuffer();
                } catch (error) {
                    console.error('Error loading PDF from folder:', error);
                }
            } else if (paper.pdfSource === "local" && paper.pdfHandle) {
                try {
                    const file = await paper.pdfHandle.getFile();
                    return await file.arrayBuffer();
                } catch (error) {
                    console.error('Error loading PDF from handle:', error);
                }
            } else if (paper.pdfSource === "indexeddb" || paper.pdfSource === "file") {
                try {
                    const pdfData = await getPDFFromIndexedDB(paper.id);
                    if (pdfData && pdfData.blob) {
                        return await pdfData.blob.arrayBuffer();
                    }
                } catch (error) {
                    console.error('Error loading PDF from IndexedDB:', error);
                }
            }
        }

        // Try online URL as fallback
        const pdfUrl = getPDFUrl ? getPDFUrl(paper) : null;
        if (pdfUrl) {
            try {
                const response = await fetch(pdfUrl);
                if (response.ok) {
                    return await response.arrayBuffer();
                }
            } catch (error) {
                console.error('Error fetching PDF from URL:', error);
            }
        }

        return null;
    }

    // Load and render PDF
    async function loadPDF(data) {
        pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;

        updatePageInfo();
        await renderPage(currentPage);
    }

    // Render a specific page
    async function renderPage(pageNum) {
        if (!pdfDoc) return;

        const container = document.getElementById('pdf-canvas-container');
        container.innerHTML = '';

        const page = await pdfDoc.getPage(pageNum);

        // Calculate scale to fit container width
        const containerWidth = container.clientWidth - 40;
        const viewport = page.getViewport({ scale: 1 });
        const autoScale = containerWidth / viewport.width;
        const effectiveScale = scale === 1.0 ? autoScale : scale;

        const scaledViewport = page.getViewport({ scale: effectiveScale });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'pdf-canvas';
        canvas.className = 'pdf-canvas';
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Create page wrapper
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'pdf-page-wrapper';
        pageWrapper.style.width = scaledViewport.width + 'px';
        pageWrapper.style.height = scaledViewport.height + 'px';
        pageWrapper.appendChild(canvas);

        // Create text layer for selection
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'pdf-text-layer';
        textLayerDiv.style.width = scaledViewport.width + 'px';
        textLayerDiv.style.height = scaledViewport.height + 'px';
        pageWrapper.appendChild(textLayerDiv);
        textLayer = textLayerDiv;

        // Create highlight layer
        const highlightLayer = document.createElement('div');
        highlightLayer.className = 'pdf-highlight-layer';
        highlightLayer.id = 'pdf-highlight-layer';
        highlightLayer.style.width = scaledViewport.width + 'px';
        highlightLayer.style.height = scaledViewport.height + 'px';
        pageWrapper.appendChild(highlightLayer);

        container.appendChild(pageWrapper);
        pdfContainer = pageWrapper;

        // Render canvas
        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        // Render text layer
        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: scaledViewport,
            textDivs: []
        }).promise;

        // Render existing highlights for this page
        renderHighlightsForPage(pageNum);

        // Setup text selection handling
        setupTextSelection(pageWrapper);
    }

    // Setup text selection
    function setupTextSelection(container) {
        container.addEventListener('mouseup', handleTextSelection);
    }

    // Handle text selection
    function handleTextSelection(e) {
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) {
            // Enable the highlight button
            document.getElementById('btn-add-highlight').classList.add('has-selection');
        } else {
            document.getElementById('btn-add-highlight').classList.remove('has-selection');
        }
    }

    // Add highlight from current selection
    function addHighlightFromSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText) {
            alert('Please select some text first.');
            return;
        }

        // Get selection position relative to the page
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const container = document.getElementById('pdf-canvas-container');
        const containerRect = container.getBoundingClientRect();
        const pageWrapper = pdfContainer;
        const pageRect = pageWrapper.getBoundingClientRect();

        const position = {
            x1: rect.left - pageRect.left,
            y1: rect.top - pageRect.top,
            x2: rect.right - pageRect.left,
            y2: rect.bottom - pageRect.top,
            width: rect.width,
            height: rect.height
        };

        // Create annotation
        const annotation = {
            id: Date.now(),
            type: 'highlight',
            page: currentPage,
            text: selectedText,
            color: HIGHLIGHT_COLORS[selectedColor].hex,
            colorName: selectedColor,
            position: position,
            note: '',
            timestamp: new Date().toISOString()
        };

        // Add to paper
        addAnnotationToPaper(annotation);

        // Render the highlight
        renderHighlight(annotation);

        // Clear selection
        selection.removeAllRanges();
        document.getElementById('btn-add-highlight').classList.remove('has-selection');

        // Update annotations list
        renderAnnotationsList();

        // Prompt for note
        setTimeout(() => {
            const notePrompt = prompt('Add a note to this highlight (optional):');
            if (notePrompt !== null && notePrompt.trim()) {
                annotation.note = notePrompt.trim();
                updateAnnotationInPaper(annotation);
                renderAnnotationsList();
            }
        }, 100);
    }

    // Add annotation to paper object
    function addAnnotationToPaper(annotation) {
        const paper = papers.find(p => p.id === currentPaperId);
        if (!paper) return;

        if (!paper.annotations) {
            paper.annotations = [];
        }
        paper.annotations.push(annotation);

        // Save to storage
        if (typeof storage !== 'undefined' && storage.save) {
            storage.save();
        }
    }

    // Update annotation in paper
    function updateAnnotationInPaper(annotation) {
        const paper = papers.find(p => p.id === currentPaperId);
        if (!paper || !paper.annotations) return;

        const index = paper.annotations.findIndex(a => a.id === annotation.id);
        if (index !== -1) {
            paper.annotations[index] = annotation;
            if (typeof storage !== 'undefined' && storage.save) {
                storage.save();
            }
        }
    }

    // Delete annotation from paper
    function deleteAnnotation(annotationId) {
        const paper = papers.find(p => p.id === currentPaperId);
        if (!paper || !paper.annotations) return;

        const index = paper.annotations.findIndex(a => a.id === annotationId);
        if (index !== -1) {
            paper.annotations.splice(index, 1);
            if (typeof storage !== 'undefined' && storage.save) {
                storage.save();
            }

            // Remove highlight element
            const highlightEl = document.querySelector(`.pdf-highlight[data-annotation-id="${annotationId}"]`);
            if (highlightEl) {
                highlightEl.remove();
            }

            renderAnnotationsList();

            // Update paper card
            if (typeof showSummary === 'function') {
                showSummary();
            }
        }
    }

    // Render a single highlight on the page
    function renderHighlight(annotation) {
        if (annotation.page !== currentPage) return;

        const highlightLayer = document.getElementById('pdf-highlight-layer');
        if (!highlightLayer) return;

        const highlight = document.createElement('div');
        highlight.className = 'pdf-highlight';
        highlight.dataset.annotationId = annotation.id;
        highlight.style.left = annotation.position.x1 + 'px';
        highlight.style.top = annotation.position.y1 + 'px';
        highlight.style.width = annotation.position.width + 'px';
        highlight.style.height = annotation.position.height + 'px';
        highlight.style.backgroundColor = annotation.color;
        highlight.title = annotation.text + (annotation.note ? '\n\nNote: ' + annotation.note : '');

        highlight.addEventListener('click', () => {
            scrollToAnnotation(annotation.id);
        });

        highlightLayer.appendChild(highlight);
    }

    // Render all highlights for the current page
    function renderHighlightsForPage(pageNum) {
        const paper = papers.find(p => p.id === currentPaperId);
        if (!paper || !paper.annotations) return;

        paper.annotations
            .filter(a => a.page === pageNum)
            .forEach(renderHighlight);
    }

    // Render annotations list in sidebar
    function renderAnnotationsList() {
        const paper = papers.find(p => p.id === currentPaperId);
        const listContainer = document.getElementById('annotations-list');
        const countSpan = document.getElementById('annotation-count');

        if (!paper || !paper.annotations || paper.annotations.length === 0) {
            listContainer.innerHTML = '<div class="no-annotations">No annotations yet. Select text and click "Highlight Selection" to add annotations.</div>';
            countSpan.textContent = '0';
            return;
        }

        // Sort by page, then by position
        const sortedAnnotations = [...paper.annotations].sort((a, b) => {
            if (a.page !== b.page) return a.page - b.page;
            return a.position.y1 - b.position.y1;
        });

        countSpan.textContent = sortedAnnotations.length;

        listContainer.innerHTML = sortedAnnotations.map(annotation => `
            <div class="annotation-item" data-annotation-id="${annotation.id}" data-page="${annotation.page}">
                <div class="annotation-header">
                    <span class="annotation-color-indicator" style="background-color: ${escapeHtml(annotation.color)}"></span>
                    <span class="annotation-page">Page ${annotation.page}</span>
                    <button class="annotation-delete-btn" data-id="${annotation.id}" title="Delete annotation">✕</button>
                </div>
                <div class="annotation-text">"${escapeHtml(annotation.text.substring(0, 150))}${annotation.text.length > 150 ? '...' : ''}"</div>
                ${annotation.note ? `<div class="annotation-note">${escapeHtml(annotation.note)}</div>` : ''}
                <div class="annotation-actions">
                    <button class="annotation-edit-note-btn" data-id="${annotation.id}">
                        ${annotation.note ? 'Edit Note' : 'Add Note'}
                    </button>
                    <span class="annotation-timestamp">${formatTimestamp(annotation.timestamp)}</span>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        listContainer.querySelectorAll('.annotation-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('annotation-delete-btn') &&
                    !e.target.classList.contains('annotation-edit-note-btn')) {
                    const page = parseInt(item.dataset.page);
                    if (page !== currentPage) {
                        currentPage = page;
                        renderPage(currentPage);
                        updatePageInfo();
                    }
                    setTimeout(() => scrollToAnnotation(item.dataset.annotationId), 100);
                }
            });
        });

        listContainer.querySelectorAll('.annotation-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this annotation?')) {
                    deleteAnnotation(parseInt(btn.dataset.id));
                }
            });
        });

        listContainer.querySelectorAll('.annotation-edit-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editAnnotationNote(parseInt(btn.dataset.id));
            });
        });
    }

    // Edit annotation note
    function editAnnotationNote(annotationId) {
        const paper = papers.find(p => p.id === currentPaperId);
        if (!paper || !paper.annotations) return;

        const annotation = paper.annotations.find(a => a.id === annotationId);
        if (!annotation) return;

        const newNote = prompt('Edit note:', annotation.note || '');
        if (newNote !== null) {
            annotation.note = newNote.trim();
            updateAnnotationInPaper(annotation);
            renderAnnotationsList();

            // Update highlight tooltip
            const highlightEl = document.querySelector(`.pdf-highlight[data-annotation-id="${annotationId}"]`);
            if (highlightEl) {
                highlightEl.title = annotation.text + (annotation.note ? '\n\nNote: ' + annotation.note : '');
            }
        }
    }

    // Scroll to annotation
    function scrollToAnnotation(annotationId) {
        const highlightEl = document.querySelector(`.pdf-highlight[data-annotation-id="${annotationId}"]`);
        if (highlightEl) {
            highlightEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightEl.classList.add('highlight-flash');
            setTimeout(() => highlightEl.classList.remove('highlight-flash'), 1000);
        }
    }

    // Format timestamp
    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Zoom PDF
    function zoomPDF(delta) {
        scale = Math.max(0.5, Math.min(3.0, scale + delta));
        document.getElementById('pdf-zoom-level').textContent = Math.round(scale * 100) + '%';
        renderPage(currentPage);
    }

    // Fit to width
    function fitToWidth() {
        scale = 1.0;
        document.getElementById('pdf-zoom-level').textContent = 'Fit';
        renderPage(currentPage);
    }

    // Change page
    function changePage(delta) {
        const newPage = currentPage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            updatePageInfo();
            renderPage(currentPage);
        }
    }

    // Update page info
    function updatePageInfo() {
        document.getElementById('pdf-page-info').textContent = `${currentPage} / ${totalPages}`;
        document.getElementById('pdf-prev-page').disabled = currentPage === 1;
        document.getElementById('pdf-next-page').disabled = currentPage === totalPages;
    }

    // Close viewer
    function closeViewer() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            pdfDoc = null;
            currentPaperId = null;

            // Update paper cards to show annotation counts
            if (typeof showSummary === 'function') {
                showSummary();
            }
        }
    }

    // Helper: escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get annotation count for a paper
    window.getAnnotationCount = function(paperId) {
        const paper = papers.find(p => p.id === paperId);
        return (paper && paper.annotations) ? paper.annotations.length : 0;
    };

    // Get annotations for a paper (for exports)
    window.getPaperAnnotations = function(paperId) {
        const paper = papers.find(p => p.id === paperId);
        return (paper && paper.annotations) ? paper.annotations : [];
    };

    // Format annotations for export
    window.formatAnnotationsForExport = function(annotations) {
        if (!annotations || annotations.length === 0) return '';

        return annotations.map(a => {
            let str = `[Page ${a.page}] "${a.text}"`;
            if (a.note) str += ` - Note: ${a.note}`;
            return str;
        }).join(' | ');
    };

    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
        // Preload PDF.js
        if (typeof pdfjsLib === 'undefined') {
            console.log('PDF.js will be loaded when opening a PDF');
        }
    });

})();
