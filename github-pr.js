// GitHub Pull Request Files content script for Tab'd extension
// Modifies DOM on GitHub PR files pages

class GitHubPRFilesScript {
    constructor() {
        this.isGitHubPRFiles = this.checkIfGitHubPRFiles();

        if (this.isGitHubPRFiles) {
            console.log('Tab\'d: GitHub PR files page detected');
            this.initializePRFileModifications();
        }
    }

    checkIfGitHubPRFiles() {
        // Check if URL matches GitHub PR files pattern: https://github.com/<owner>/<repo>/pull/<number>/files
        const urlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+\/files/;
        return urlPattern.test(window.location.href);
    }

    initializePRFileModifications() {
        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.modifyPRFilesPage();
            });
        } else {
            this.modifyPRFilesPage();
        }

        // Also listen for navigation changes (GitHub uses PJAX/SPA navigation)
        this.setupNavigationListener();
    }

    setupNavigationListener() {
        // Listen for GitHub's navigation events
        document.addEventListener('pjax:end', () => {
            if (this.checkIfGitHubPRFiles()) {
                setTimeout(() => this.modifyPRFilesPage(), 100);
            }
        });

        // Fallback: Listen for URL changes
        let currentUrl = window.location.href;
        const urlChangeObserver = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                if (this.checkIfGitHubPRFiles()) {
                    setTimeout(() => this.modifyPRFilesPage(), 100);
                }
            }
        });

        urlChangeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    createAIElement() {
        const aiElement = document.createElement('span');
        aiElement.style.backgroundColor = '#00ffff26';
        aiElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #00ffff66';
        aiElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        aiElement.style.display = 'inline-block';

        return aiElement;
    }

    createPasteElement() {
        const pasteElement = document.createElement('span');
        pasteElement.style.backgroundColor = '#ff880026';
        pasteElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #ff880066';
        pasteElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        pasteElement.style.display = 'inline-block';

        return pasteElement;
    }

    createUndoRedoElement() {
        const undoRedoElement = document.createElement('span');
        undoRedoElement.style.backgroundColor = '#80008026';
        undoRedoElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #80008066';
        undoRedoElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        undoRedoElement.style.display = 'inline-block';

        return undoRedoElement;
    }

    createUserEditElement() {
        const userEditElement = document.createElement('span');
        userEditElement.style.backgroundColor = '#88888811';
        userEditElement.style.boxShadow = 'inset 0 0 0 var(--borderWidth-thin, 1px) #88888866';
        userEditElement.style.mixBlendMode = 'var(--color-diff-blob-x-selected-line-highlight-mix-blend-mode)';
        userEditElement.style.display = 'inline-block';

        return userEditElement;
    }

    getHighlightElementForChange(change) {
        switch (change.type) {
            case 'AI_GENERATED':
                const aiElement = this.createAIElement();
                aiElement.title = `AI Generated under ${change.author ? (change.author + "'s") : 'your'} control${change.aiName !== '' ? ` • ${change.aiName} (${change.aiModel})` : ''} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return aiElement;
            case 'PASTE':
                const pasteElement = this.createPasteElement();
                pasteElement.title = `Clipboard Paste by ${change.author || 'you'}${change.pasteUrl !== '' ? ` • From the webpage [${change.pasteTitle}](${change.pasteUrl})` : ''} • Created at: ${new Date(change.creationTimestamp).toLocaleString()}`;
                return pasteElement;
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

    modifyPRFilesPage() {
        console.log('Tab\'d: Modifying GitHub PR files page');
        /*
        <table aria-label="Diff for: README.md" class="tab-size width-full DiffLines-module__tableLayoutFixed--YZcIJ" data-diff-anchor="diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5" data-tab-size="8" data-paste-markdown-skip="true" role="grid" style="--line-number-cell-width: 40px; --line-number-cell-width-unified: 80px;">
        <td
         data-grid-cell-id="diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5-empty-11-3"
         data-line-anchor="diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5R11"
         data-selected="false" role="gridcell" tabindex="-1" valign="top" class="focusable-grid-cell diff-text-cell right-side-diff-cell  "
         style="background-color: var(--diffBlob-additionLine-bgColor, var(--diffBlob-addition-bgColor-line)); padding-right: 24px;"
        >
          <code class="diff-text syntax-highlighted-line addition">
            <span class="diff-text-marker">+</span>
            <div class="diff-text-inner">Line 5</div>
          </code>
        </td>
        */
        const prInfo = this.getPRInfo();
        console.log('Tab\'d: PR Info:', prInfo);

        // Get all <table> elements that are part of the diff
        const diffTables = document.querySelectorAll('table[data-diff-anchor]');
        if (diffTables.length === 0) {
            console.warn('Tab\'d: No diff tables found on this PR files page');
            return;
        }
        diffTables.forEach(async (table) => {
            // Check if the table has a data-diff-anchor attribute
            const diffAnchor = table.getAttribute('data-diff-anchor');
            if (diffAnchor) {
                // Extract the SHA256 hash from the data-diff-anchor
                const match = diffAnchor.match(/diff-([a-f0-9]+)/);
                if (match) {
                    const hash = match[1];
                    console.log(`Tab'd: Processing diff table for hash ${hash}`);

                    // Fetch the diff data from the GitHub API
                    const apiUrl1 = `https://api.github.com/repos/${prInfo.owner}/${prInfo.repo}/git/ref/notes/tabd__${prInfo.branch}__${hash}`;
                    const apiData1 = await fetch(apiUrl1)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`GitHub API request failed with status ${response.status}`);
                            }
                            return response.json();
                        });
                    const apiData2 = await fetch(apiData1.object.url)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`GitHub API request failed with status ${response.status}`);
                            }
                            return response.json();
                        });
                    const apiData3 = await fetch(apiData2.tree.url)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`GitHub API request failed with status ${response.status}`);
                            }
                            return response.json();
                        });
                    const apiData4 = await fetch(apiData3.tree[0].url)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`GitHub API request failed with status ${response.status}`);
                            }
                            return response.json();
                        });
                    const changeData = JSON.parse(atob(apiData4.content));

                    console.log(`Tab'd: Fetched diff data for hash ${hash}`, changeData);

                    // Get all <td> elements that are part of the table
                    const diffCells = table.querySelectorAll('td.diff-text-cell');
                    if (diffCells.length === 0) {
                        console.warn('Tab\'d: No diff cells found on this PR files page');
                        return;
                    }
                    diffCells.forEach(cell => {
                        // Check if the cell has a data-line-anchor attribute
                        const lineAnchor = cell.getAttribute('data-line-anchor');
                        if (lineAnchor) {
                            // Extract the SHA256 hash and line number from the data-line-anchor
                            const match = lineAnchor.match(/diff-([a-f0-9]+)R(\d+)/);
                            if (match) {
                                const lineNumber = parseInt(match[2]) - 1; // GitHub uses 1-based line numbers, convert to 0-based to match our data
                                console.log(`Tab'd: Processing cell for hash ${hash} at line ${lineNumber}`);

                                /*
                                {
                                    "version": 1,
                                    "changes": [
                                        {
                                            "start": {
                                                "line": 11,
                                                "character": 0
                                            },
                                            "end": {
                                                "line": 21,
                                                "character": 0
                                            },
                                            "type": "USER_EDIT",
                                            "creationTimestamp": 1751453263508,
                                            "author": "Ian Mckay",
                                            "pasteUrl": "",
                                            "pasteTitle": "",
                                            "aiName": "",
                                            "aiModel": ""
                                        }
                                    ]
                                }
                                */

                                // Find all changes that affect this line number
                                const changesForLine = changeData.changes.filter(c =>
                                    c.start.line <= lineNumber && c.end.line >= lineNumber
                                );

                                if (changesForLine.length > 0) {
                                    console.log(`Tab'd: Found ${changesForLine.length} change(s) for line ${lineNumber}`, changesForLine);

                                    // Find the diff-text-inner element containing the actual text
                                    const innerTextElement = cell.querySelector('.diff-text-inner');
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
                        }
                    });
                }
            }
        });
    }

    getPRInfo() {
        const match = window.location.pathname.match(/\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
        if (match) {
            // Extract branch from script JSON within <react-app>
            const scriptElement = document.querySelector('script[type="application/json"][data-target="react-app.embeddedData"]');
            if (scriptElement) {
                try {
                    const data = JSON.parse(scriptElement.textContent);
                    if (data && data.payload && data.payload.pullRequest) {
                        const pullRequest = data.payload.pullRequest;
                        return {
                            owner: pullRequest.headRepositoryOwnerLogin,
                            repo: pullRequest.headRepositoryName,
                            pr: pullRequest.number,
                            branch: pullRequest.headBranch,
                        };
                    }
                } catch (error) {
                    console.error('Tab\'d: Error parsing PR data from script:', error);
                }
            }
        }
        throw new Error('Not a valid GitHub PR files page');
    }
}

// Initialize the GitHub PR files script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GitHubPRFilesScript();
    });
} else {
    new GitHubPRFilesScript();
}
