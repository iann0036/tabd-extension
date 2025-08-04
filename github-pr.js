// GitHub Pull Request Files and Compare content script for Tab'd extension
// Modifies DOM on GitHub PR files and compare pages

class GitHubPRFilesScript {
    constructor() {
        this.isGitHubDiffPage = this.checkIfGitHubDiffPage();
        this.cleanup = null; // Will be set by setupNavigationListener
        this.integrationEnabled = false;
        this.compareData = null;
        this.isProcessingPageContent = false;

        this.initializeWithSettings();
    }

    // SHA256 hash function
    async sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async initializeWithSettings() {
        try {
            // Check if GitHub integration is enabled
            const options = await this.getOptions();
            this.integrationEnabled = options.githubIntegration;
            this.githubToken = options.githubToken || '';

            if (this.integrationEnabled && this.isGitHubDiffPage) {
                // Setup navigation listener immediately if DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        this.setupNavigationListener();
                    });
                } else {
                    // DOM is already ready, setup immediately
                    this.setupNavigationListener();
                }

                // Cleanup when page is unloaded
                window.addEventListener('beforeunload', () => {
                    if (this.cleanup) {
                        this.cleanup();
                    }
                });
            }
        } catch (error) {
            console.debug('Tab\'d: Error initializing GitHub integration:', error);
        }
    }

    async getOptions() {
        return new Promise((resolve) => {
            chrome.storage.sync.get({
                clipboardTracking: 'known',
                customDomains: '',
                githubIntegration: false,
                githubToken: ''
            }, resolve);
        });
    }

    // Helper method to make authenticated GitHub API requests
    async fetchGitHubAPI(url) {
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Tabd-Extension'
        };

        // Add authorization header if token is available
        if (this.githubToken) {
            headers['Authorization'] = `Bearer ${this.githubToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API request failed with status ${response.status}`);
        }

        return response.json();
    }

    checkIfGitHubDiffPage() {
        // Check if URL matches GitHub PR files pattern: https://github.com/<owner>/<repo>/pull/<number>/files
        // or GitHub compare pattern: https://github.com/<owner>/<repo>/compare/<branch>
        const prFilesPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/files/;
        const comparePattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/compare\/[^\/]+/;
        return prFilesPattern.test(window.location.href) || comparePattern.test(window.location.href);
    }

    setupNavigationListener() {
        // Store reference for cleanup
        this.pollingInterval = null;
        this.lastUrl = window.location.href;

        // Function to check for unprocessed tables
        const checkForUnprocessedTables = () => {
            if (!this.integrationEnabled) return;

            // Check if URL changed (navigation occurred)
            if (window.location.href !== this.lastUrl) {
                this.lastUrl = window.location.href;
            }

            // Always check for unprocessed tables if we're on a GitHub diff page
            if (this.checkIfGitHubDiffPage()) {
                this.processPageContent();
            }
        };

        // Start polling for unprocessed tables every 500ms
        this.pollingInterval = setInterval(checkForUnprocessedTables, 500);

        // Cleanup function
        this.cleanup = () => {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
            }
        };
    }

    createAIElement() {
        const aiElement = document.createElement('span');
        aiElement.style.backgroundColor = '#00ffff26';
        //aiElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #00ffff66';
        aiElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        aiElement.style.display = 'inline-block';

        return aiElement;
    }

    createPasteElement() {
        const pasteElement = document.createElement('span');
        pasteElement.style.backgroundColor = '#ff880026';
        //pasteElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #ff880066';
        pasteElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        pasteElement.style.display = 'inline-block';

        return pasteElement;
    }

    createIDEPasteElement() {
        const idePasteElement = document.createElement('span');
        idePasteElement.style.backgroundColor = '#a4f54226';
        //idePasteElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #a4f54266';
        idePasteElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        idePasteElement.style.display = 'inline-block';

        return idePasteElement;
    }

    createUndoRedoElement() {
        const undoRedoElement = document.createElement('span');
        undoRedoElement.style.backgroundColor = '#80008026';
        //undoRedoElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #80008066';
        undoRedoElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        undoRedoElement.style.display = 'inline-block';

        return undoRedoElement;
    }

    createUserEditElement() {
        const userEditElement = document.createElement('span');
        userEditElement.style.backgroundColor = '#88888811';
        //userEditElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #88888866';
        userEditElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        userEditElement.style.display = 'inline-block';

        return userEditElement;
    }

    getHighlightElementForChange(change) {
        switch (change.type) {
            case 'AI_GENERATED':
                const aiType = {
                    'inlineCompletion': ' • Using inline completion',
                    'applyPatch': ' • Using the apply patch tool',
                    'createFile': ' • Using the create file tool',
                    'insertEdit': ' • Using the insert edit tool',
                    'replaceString': ' • Using the replace string tool',
                    'applyEdit': ' • Using an internal command',
                    '': ''
                }[change.aiType] || '';
                const aiElement = this.createAIElement();
                aiElement.title = `AI Generated under ${change.author ? (change.author + "'s") : 'your'} control${change.aiName !== '' ? ` • ${change.aiName}` : ''}${change.aiModel !== '' ? ` (${change.aiModel})` : ''}${aiType} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return aiElement;
            case 'PASTE':
                const pasteElement = this.createPasteElement();
                pasteElement.title = `Clipboard Paste by ${change.author || 'you'}${change.pasteUrl !== '' ? ` • From the webpage "${change.pasteTitle}" (${change.pasteUrl})` : ''} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return pasteElement;
            case 'IDE_PASTE':
                const idePasteElement = this.createIDEPasteElement();
                idePasteElement.title = `Clipboard Paste by ${change.author || 'you'}${change.pasteUrl !== '' ? ` • From the ${change.pasteUrl} repository at ${change.pasteTitle}` : ''} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return idePasteElement;
            case 'UNDO_REDO':
                const undoRedoElement = this.createUndoRedoElement();
                undoRedoElement.title = `Undo/Redo by ${change.author || 'you'} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return undoRedoElement;
            case 'USER_EDIT':
                const userEditElement = this.createUserEditElement();
                userEditElement.title = `Edit by ${change.author || 'you'} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return userEditElement;
            default:
                return document.createElement('span');
        }
    }

    processLineHighlighting(cell, lineNumber, changeData) {
        // Find all changes that affect this line number
        const changesForLine = changeData.changes.filter(c =>
            c.start.line <= lineNumber && c.end.line >= lineNumber
        );

        if (changesForLine.length > 0) {
            // Find the diff-text-inner element containing the actual text
            const innerTextElement = cell.querySelector('.diff-text-inner, .blob-code-inner');

            if (innerTextElement) {
                const textContent = innerTextElement.textContent;

                // Create character ranges for each change on this line
                const characterRanges = [];

                for (const change of changesForLine) {
                    let startChar = 0;
                    let endChar = textContent.length;

                    // Handle multi-line changes properly
                    if (change.start.line === change.end.line) {
                        // Single line change
                        if (parseInt(lineNumber) === change.start.line) {
                            startChar = change.start.character;
                            endChar = change.end.character;
                        }
                    } else {
                        // Multi-line change
                        if (parseInt(lineNumber) === change.start.line) {
                            // Start line: highlight from start character to end of line
                            startChar = change.start.character;
                            endChar = textContent.length;
                        } else if (parseInt(lineNumber) === change.end.line) {
                            // End line: highlight from beginning to end character
                            startChar = 0;
                            endChar = change.end.character;
                        } else {
                            // Middle line: highlight entire line
                            startChar = 0;
                            endChar = textContent.length;
                        }
                    }

                    // Ensure the range is within bounds
                    startChar = Math.max(0, Math.min(startChar, textContent.length));
                    endChar = Math.max(startChar, Math.min(endChar, textContent.length));

                    // Only add non-empty ranges
                    if (endChar > startChar) {
                        characterRanges.push({
                            start: startChar,
                            end: endChar,
                            change: change
                        });
                    }
                }

                // Sort ranges by start position - don't merge to preserve change types
                characterRanges.sort((a, b) => a.start - b.start);

                // Clear the existing content
                innerTextElement.innerHTML = '';

                // Build the content with highlights, handling overlaps by prioritizing later changes
                let currentPos = 0;

                for (const range of characterRanges) {
                    // Skip ranges that start before our current position (already processed)
                    if (range.start < currentPos) {
                        continue;
                    }

                    // Add text before this highlight
                    if (currentPos < range.start) {
                        const beforeText = textContent.substring(currentPos, range.start);
                        const beforeSpan = document.createElement('span');
                        beforeSpan.textContent = beforeText;
                        innerTextElement.appendChild(beforeSpan);
                    }

                    // Add the highlighted text
                    const highlightedText = textContent.substring(range.start, range.end);
                    if (highlightedText) {
                        const highlightElement = this.getHighlightElementForChange(range.change);
                        highlightElement.textContent = highlightedText;
                        innerTextElement.appendChild(highlightElement);
                    }

                    currentPos = range.end;
                }

                // Add any remaining text after the last highlight
                if (currentPos < textContent.length) {
                    const afterText = textContent.substring(currentPos);
                    const afterSpan = document.createElement('span');
                    afterSpan.textContent = afterText;
                    innerTextElement.appendChild(afterSpan);
                }
            }
        }
    }

    async processPageContent() {
        if (this.isProcessingPageContent) {
            return;
        }
        this.isProcessingPageContent = true;

        let prInfo = {};
        try {
            prInfo = this.getPRInfo();
        } catch (error) {
            this.isProcessingPageContent = false;
            return;
        }

        if (!prInfo.repo) {
            this.isProcessingPageContent = false;
            return;
        }

        // Get all <table> elements that are part of the diff and haven't been processed yet
        const diffTables = document.querySelectorAll('table[data-diff-anchor]:not([data-tabd-processed])');
        if (diffTables.length === 0) {
            this.isProcessingPageContent = false;
            return;
        }

        for (const table of diffTables) {
            const diffCells = table.querySelectorAll('td.diff-text-cell, td.blob-num');
            if (diffCells.length === 0) {
                // No diff cells found, skip this table
                continue;
            }

            // Mark this table as being processed to avoid duplicate processing
            table.setAttribute('data-tabd-processed', 'true');

            try {
                // Check if the table has a data-diff-anchor attribute
                const diffAnchor = table.getAttribute('data-diff-anchor');
                if (diffAnchor) {
                    // Extract the SHA256 hash from the data-diff-anchor
                    const match = diffAnchor.match(/diff-([a-f0-9]+)/);
                    if (match) {
                        const hash = match[1];

                        let changeData = {};
                        try {
                            // Fetch the diff data from the GitHub API (Git Notes)
                            const apiUrl1 = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/git/ref/notes/tabd__${prInfo.branch}__${hash}`;
                            const apiData1 = await this.fetchGitHubAPI(apiUrl1);
                            const apiData2 = await this.fetchGitHubAPI(apiData1.object.url);
                            const apiData3 = await this.fetchGitHubAPI(apiData2.tree.url);
                            const apiData4 = await this.fetchGitHubAPI(apiData3.tree[0].url); // TODO: Order this by latest, also merge changes
                            changeData = JSON.parse(atob(apiData4.content));
                        } catch (error) {
                            if (!prInfo.base || !prInfo.branch) {
                                console.debug(`Tab'd: Error fetching change data for hash ${hash}:`, prInfo);
                                continue;
                            }

                            if (!this.compareData) {
                                const apiUrl1 = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/compare/${prInfo.base}...${prInfo.branch}?per_page=100`; // TODO: paginate
                                this.compareData = await this.fetchGitHubAPI(apiUrl1);

                                // sort files
                                this.compareData.files.sort((a, b) => a.filename.localeCompare(b.filename));
                            }

                            let matchingFile = "";
                            for (const filedata of this.compareData.files) {
                                if (await this.sha256(filedata.filename) === hash) {
                                    matchingFile = filedata.filename;
                                    break;
                                }
                            }

                            if (!matchingFile) {
                                console.debug(`Tab'd: No matching file found for hash ${hash}`);
                                continue;
                            }

                            // Skip files with leading periods anywhere in their filepath
                            if (matchingFile.split('/').some(part => part.startsWith('.'))) {
                                continue;
                            }

                            for (const filedata of this.compareData.files) {
                                if (filedata.filename.startsWith('.tabd/log/' + matchingFile + "/tabd-") && filedata.status !== 'removed') {
                                    const trackingData1 = await this.fetchGitHubAPI(filedata.contents_url);
                                    const trackingData2 = await this.fetchGitHubAPI(trackingData1.url);
                                    let content = trackingData2.content;
                                    if (trackingData2.encoding === 'base64') {
                                        content = atob(content);
                                    }
                                    changeData = this.deepMerge(changeData, JSON.parse(content));
                                }
                            }

                            if (!changeData.changes || changeData.changes.length === 0) {
                                continue;
                            }
                        }

                        for (const cell of diffCells) {
                            if (cell.classList.contains('diff-text-cell')) {
                                // Check if the cell has a data-line-anchor attribute
                                const lineAnchor = cell.getAttribute('data-line-anchor');
                                if (lineAnchor) {
                                    // Extract the SHA256 hash and line number from the data-line-anchor
                                    const match = lineAnchor.match(/diff-([a-f0-9]+)R(\d+)/);
                                    if (match) {
                                        if (match[1] === hash) {
                                            const lineNumber = parseInt(match[2]) - 1; // GitHub uses 1-based line numbers, convert to 0-based to match our data
                                            this.processLineHighlighting(cell, lineNumber, changeData);
                                        }
                                    }
                                }
                            } else {
                                // Check if the cell has an id attribute with line number information
                                const cellId = cell.getAttribute('id');
                                if (cellId) {
                                    // Extract the SHA256 hash and line number from the id
                                    const match = cellId.match(/diff-([a-f0-9]+)R(\d+)/);
                                    if (match) {
                                        if (match[1] === hash) {
                                            const lineNumber = parseInt(match[2]) - 1; // GitHub uses 1-based line numbers, convert to 0-based to match our data
                                            // Find the corresponding code cell in the same row
                                            const row = cell.parentElement;
                                            const codeCell = row.querySelector('td.blob-code:last-of-type');
                                            if (codeCell) {
                                                this.processLineHighlighting(codeCell, lineNumber, changeData);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.debug(`Tab'd: Error processing table:`, error);
                // Remove the processed attribute so it can be retried later
                table.removeAttribute('data-tabd-processed');
            }
        }

        this.isProcessingPageContent = false;
    }

    // Method to wait for page content to be ready
    waitForPageContent(callback, maxAttempts = 10, attempt = 1) {
        const unprocessedTables = document.querySelectorAll('table[data-diff-anchor]:not([data-tabd-processed])');

        if (unprocessedTables.length > 0) {
            // Content is ready, execute callback
            callback();
        } else if (attempt < maxAttempts) {
            // Content not ready, wait and try again
            setTimeout(() => {
                this.waitForPageContent(callback, maxAttempts, attempt + 1);
            }, Math.min(100 * attempt, 2000)); // Exponential backoff to 2s
        } else {
            console.debug('Tab\'d: Timed out waiting for diff content to load');
        }
    }

    // Method to check if there are unprocessed tables
    hasUnprocessedTables() {
        const unprocessedTables = document.querySelectorAll('table[data-diff-anchor]:not([data-tabd-processed])');
        return unprocessedTables.length > 0;
    }

    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (Array.isArray(source[key])) {
                    // If both target and source have arrays for the same key, combine them
                    if (Array.isArray(result[key])) {
                        result[key] = [...result[key], ...source[key]];
                    } else {
                        // If target doesn't have an array for this key, use source array
                        result[key] = [...source[key]];
                    }
                } else if (source[key] !== null && typeof source[key] === 'object') {
                    // If both target and source have the same key and both are objects, merge recursively
                    if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                        result[key] = this.deepMerge(result[key], source[key]);
                    } else {
                        // If target doesn't have this key or it's not an object, replace it
                        result[key] = this.deepMerge({}, source[key]);
                    }
                } else {
                    // For primitive values or null, replace the value
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    getPRInfo() {
        // Handle PR files: https://github.com/<owner>/<repo>/pull/<number>/files
        const prMatch = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
        if (prMatch) {
            // Extract branch from script JSON within embedded data
            const scriptElements = document.querySelectorAll('script[type="application/json"][data-target="react-app.embeddedData"], script[type="application/json"][data-target="react-partial.embeddedData"]');
            if (scriptElements) {
                try {
                    let data = {};
                    for (const scriptElement of scriptElements) {
                        // Deep merge all data
                        data = this.deepMerge(data, JSON.parse(scriptElement.textContent));
                    }
                    
                    if (data && data.payload && data.payload.pullRequest) {
                        const pullRequest = data.payload.pullRequest;
                        return {
                            owner: pullRequest.headRepositoryOwnerLogin,
                            repo: pullRequest.headRepositoryName,
                            pr: pullRequest.number,
                            base: pullRequest.baseBranch,
                            branch: pullRequest.headBranch,
                        };
                    } else if (data && data.props && data.props.number && data.props.repo && data.props.currentTopic.refInfo.name && document.querySelector('clipboard-copy.js-copy-branch').getAttribute('value')) {
                        return {
                            owner: data.props.owner,
                            repo: data.props.repo,
                            pr: data.props.number,
                            base: data.props.currentTopic.refInfo.name,
                            branch: document.querySelector('clipboard-copy.js-copy-branch').getAttribute('value')
                        };
                    }
                } catch (error) {
                    console.debug('Tab\'d: Error parsing PR data from script:', error);
                    throw new Error('Not a valid GitHub diff page');
                }
            }
        }

        // Handle compare: https://github.com/<owner>/<repo>/compare/<branch>
        const compareMatch = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)\/compare\/([^\/]+)/);
        if (compareMatch) {
            const scriptElements = document.querySelectorAll('script[type="application/json"][data-target="react-partial.embeddedData"], script[type="application/json"][data-target="react-app.embeddedData"]');
            if (scriptElements) {
                try {
                    let data = {};
                    for (const scriptElement of scriptElements) {
                        // Deep merge all data
                        data = this.deepMerge(data, JSON.parse(scriptElement.textContent));
                    }

                    if (!compareMatch[3].includes('...')) {
                        try {
                            compareMatch[3] = `${data.props.currentTopic.refInfo.name}...${compareMatch[3]}`;
                        } catch (error) {
                            throw new Error('Not a valid GitHub diff page');
                        }
                    }

                    return {
                        owner: compareMatch[1],
                        repo: compareMatch[2],
                        pr: null, // No PR number for compare pages
                        base: compareMatch[3].split('...')[0],
                        branch: compareMatch[3].split('...')[1],
                    };
                } catch (error) {
                    console.debug('Tab\'d: Error parsing PR data from script:', error);
                }
            }
        }

        throw new Error('Not a valid GitHub diff page');
    }
}

// Initialize the GitHub diff script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GitHubPRFilesScript();
    });
} else {
    new GitHubPRFilesScript();
}
