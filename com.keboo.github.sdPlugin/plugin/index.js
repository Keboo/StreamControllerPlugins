/// <reference path="./utils/common.js" />

const plugin = new Plugins("github");

// Open GitHub Repo Action
plugin.action = new Actions({
    default: {
        owner: "",
        repo: ""
    },
    _willAppear({ context }) {
        // Set the button title based on settings
        const settings = this.data[context] || {};
        const title = settings.repo || "GitHub";
        window.socket.setTitle(context, title);
    },
    _willDisappear({ context }) { },
    didReceiveSettings(data) {
        // Update title when settings change
        const { context, payload: { settings } } = data;
        this.data[context] = Object.assign({ ...this.default }, settings);
        const title = settings.repo || "GitHub";
        window.socket.setTitle(context, title);
    },
    keyUp(data) {
        // Open the GitHub URL when button is released
        const { context } = data;
        const settings = this.data[context] || {};
        const owner = settings.owner || "";
        const repo = settings.repo || "";
        
        if (owner && repo) {
            window.socket.openUrl(`https://github.com/${owner}/${repo}`);
        } else {
            // Default to keboo.dev if no settings
            window.socket.openUrl("https://keboo.dev");
        }
    },
    keyDown(data) {
        // Optional: could add visual feedback here
    }
});

// PR Count Action
plugin.prcount = new Actions({
    default: {
        owner: "",
        repo: "",
        token: "",
        refreshInterval: 5
    },
    intervals: {},
    
    _willAppear({ context }) {
        const settings = this.data[context] || {};
        this.fetchAndDisplayPRCount(context, settings);
        this.startRefreshInterval(context, settings);
    },
    
    _willDisappear({ context }) {
        this.stopRefreshInterval(context);
    },
    
    didReceiveSettings(data) {
        const { context, payload: { settings } } = data;
        this.data[context] = Object.assign({ ...this.default }, settings);
        this.fetchAndDisplayPRCount(context, settings);
        // Restart interval with new settings
        this.stopRefreshInterval(context);
        this.startRefreshInterval(context, settings);
    },
    
    startRefreshInterval(context, settings) {
        const minutes = Math.min(60, Math.max(1, parseInt(settings.refreshInterval) || 5));
        this.intervals[context] = setInterval(() => {
            this.fetchAndDisplayPRCount(context, this.data[context] || {});
        }, minutes * 60 * 1000);
    },
    
    stopRefreshInterval(context) {
        if (this.intervals[context]) {
            clearInterval(this.intervals[context]);
            delete this.intervals[context];
        }
    },
    
    keyUp(data) {
        // Open the PRs page when button is pressed
        const { context } = data;
        const settings = this.data[context] || {};
        const owner = settings.owner || "";
        const repo = settings.repo || "";
        
        if (owner && repo) {
            window.socket.openUrl(`https://github.com/${owner}/${repo}/pulls`);
        }
    },
    
    keyDown(data) {
        // Refresh on key down
        const { context } = data;
        this.fetchAndDisplayPRCount(context, this.data[context] || {});
    },
    
    async fetchAndDisplayPRCount(context, settings) {
        const owner = settings.owner || "";
        const repo = settings.repo || "";
        const token = settings.token || "";
        
        if (!owner || !repo) {
            window.socket.setTitle(context, "PR\n--");
            return;
        }
        
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'StreamDock-Plugin'
            };
            
            if (token) {
                // Use Bearer for both fine-grained PATs (github_pat_) and classic PATs (ghp_)
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Fetch repo info to get owner avatar
            const repoResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}`,
                { headers }
            );
            
            if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                const avatarUrl = repoData.owner?.avatar_url;
                if (avatarUrl) {
                    this.setOwnerAvatar(context, avatarUrl);
                }
            }
            
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=1`,
                { headers }
            );
            
            if (!response.ok) {
                window.socket.setTitle(context, "PR\nErr");
                return;
            }
            
            // Get total count from Link header or array length
            const linkHeader = response.headers.get('Link');
            let count = 0;
            
            if (linkHeader) {
                // Parse the last page number from Link header
                const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                if (lastMatch) {
                    count = parseInt(lastMatch[1], 10);
                } else {
                    const data = await response.json();
                    count = data.length;
                }
            } else {
                const data = await response.json();
                count = data.length;
            }
            
            window.socket.setTitle(context, `PR\n${count}`);
        } catch (error) {
            console.error('Error fetching PR count:', error);
            window.socket.setTitle(context, "PR\nErr");
        }
    },
    
    async setOwnerAvatar(context, avatarUrl) {
        try {
            // Fetch the image as blob to avoid CORS issues
            const response = await fetch(avatarUrl);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                
                // Create image to draw on canvas
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    const size = 144; // Standard Stream Dock icon size
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    
                    // Draw rounded rectangle background
                    ctx.fillStyle = '#1a1a2e';
                    ctx.beginPath();
                    ctx.roundRect(0, 0, size, size, 20);
                    ctx.fill();
                    
                    // Draw avatar scaled to fill the space
                    ctx.drawImage(image, 0, 0, size, size);
                    
                    // Send the image to Stream Dock
                    window.socket.send(JSON.stringify({
                        event: "setImage",
                        context,
                        payload: {
                            target: 0,
                            image: canvas.toDataURL("image/png")
                        }
                    }));
                };
                image.src = base64data;
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error setting owner avatar:', error);
        }
    }
});

// GitHub Actions Status Action
plugin.actionstatus = new Actions({
    default: {
        owner: "",
        // Workflow 1
        repo1: "",
        workflow1: "",
        branch1: "",
        // Workflow 2
        repo2: "",
        workflow2: "",
        branch2: "",
        // Workflow 3
        repo3: "",
        workflow3: "",
        branch3: "",
        token: "",
        refreshInterval: 5
    },
    intervals: {},
    cachedStatuses: {},
    
    _willAppear({ context }) {
        const settings = this.data[context] || {};
        this.fetchAndDisplayStatus(context, settings);
        this.startRefreshInterval(context, settings);
    },
    
    _willDisappear({ context }) {
        this.stopRefreshInterval(context);
    },
    
    sendToPlugin(data) {
        // Handle messages from Property Inspector
        const { context, payload } = data;
        if (payload?.action === 'refresh') {
            // Trigger immediate refresh when settings change
            this.fetchAndDisplayStatus(context, this.data[context] || {});
        }
    },
    
    didReceiveSettings(data) {
        const { context, payload: { settings } } = data;
        // Support legacy settings migration
        const migratedSettings = { ...settings };
        if (settings.repo && !settings.repo1) {
            migratedSettings.repo1 = settings.repo;
            migratedSettings.workflow1 = settings.workflow || '';
            migratedSettings.branch1 = settings.branch || '';
        }
        this.data[context] = Object.assign({ ...this.default }, migratedSettings);
        this.fetchAndDisplayStatus(context, this.data[context]);
        // Restart interval with new settings
        this.stopRefreshInterval(context);
        this.startRefreshInterval(context, this.data[context]);
    },
    
    startRefreshInterval(context, settings) {
        const minutes = Math.min(60, Math.max(1, parseInt(settings.refreshInterval) || 5));
        this.intervals[context] = setInterval(() => {
            this.fetchAndDisplayStatus(context, this.data[context] || {});
        }, minutes * 60 * 1000);
    },
    
    stopRefreshInterval(context) {
        if (this.intervals[context]) {
            clearInterval(this.intervals[context]);
            delete this.intervals[context];
        }
    },
    
    keyUp(data) {
        // Open the Actions page for the workflow with the highest priority status
        // Priority: failure > cancelled/skipped/none > in_progress/queued/waiting > success
        const { context } = data;
        const settings = this.data[context] || {};
        const owner = settings.owner || "";
        
        const workflows = this.getConfiguredWorkflows(settings);
        if (!owner || workflows.length === 0) return;
        
        // Get cached statuses or default to opening first workflow
        const cachedStatuses = this.cachedStatuses?.[context] || [];
        
        // Find the workflow to open based on priority
        const workflowToOpen = this.getHighestPriorityWorkflow(workflows, cachedStatuses);
        
        if (workflowToOpen) {
            let url;
            if (workflowToOpen.workflow) {
                url = `https://github.com/${owner}/${workflowToOpen.repo}/actions/workflows/${workflowToOpen.workflow}`;
            } else {
                url = `https://github.com/${owner}/${workflowToOpen.repo}/actions`;
            }
            if (workflowToOpen.branch) {
                url += `?query=branch%3A${encodeURIComponent(workflowToOpen.branch)}`;
            }
            window.socket.openUrl(url);
        }
    },
    
    getHighestPriorityWorkflow(workflows, statuses) {
        // Priority levels (lower number = higher priority)
        const getPriority = (status) => {
            switch (status) {
                case 'failure': return 1;
                case 'cancelled':
                case 'skipped':
                case 'none':
                case 'unknown': return 2;
                case 'in_progress':
                case 'queued':
                case 'waiting': return 3;
                case 'success': return 4;
                default: return 5;
            }
        };
        
        // If no statuses cached, return first workflow
        if (statuses.length === 0) {
            return workflows[0];
        }
        
        // Find workflow with highest priority (lowest number)
        let bestIndex = 0;
        let bestPriority = getPriority(statuses[0]);
        
        for (let i = 1; i < workflows.length && i < statuses.length; i++) {
            const priority = getPriority(statuses[i]);
            if (priority < bestPriority) {
                bestPriority = priority;
                bestIndex = i;
            }
        }
        
        return workflows[bestIndex];
    },
    
    keyDown(data) {
        // Refresh on key down
        const { context } = data;
        this.fetchAndDisplayStatus(context, this.data[context] || {});
    },
    
    getConfiguredWorkflows(settings) {
        // Build array of configured workflows (those with at least a repo)
        const workflows = [];
        
        // Support legacy settings
        const repo1 = settings.repo1 || settings.repo || "";
        const workflow1 = settings.workflow1 || settings.workflow || "";
        const branch1 = settings.branch1 || settings.branch || "";
        
        if (repo1) {
            workflows.push({ repo: repo1, workflow: workflow1, branch: branch1 });
        }
        if (settings.repo2) {
            workflows.push({ repo: settings.repo2, workflow: settings.workflow2 || '', branch: settings.branch2 || '' });
        }
        if (settings.repo3) {
            workflows.push({ repo: settings.repo3, workflow: settings.workflow3 || '', branch: settings.branch3 || '' });
        }
        
        return workflows;
    },
    
    async fetchAndDisplayStatus(context, settings) {
        const owner = settings.owner || "";
        const token = settings.token || "";
        
        const workflows = this.getConfiguredWorkflows(settings);
        
        if (!owner || workflows.length === 0) {
            window.socket.setTitle(context, "Action\n--");
            return;
        }
        
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'StreamDock-Plugin'
            };
            
            if (token) {
                // Use Bearer for both fine-grained PATs (github_pat_) and classic PATs (ghp_)
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Fetch repo info to get owner avatar (use first repo)
            const repoResponse = await fetch(
                `https://api.github.com/repos/${owner}/${workflows[0].repo}`,
                { headers }
            );
            
            let avatarUrl = null;
            if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                avatarUrl = repoData.owner?.avatar_url;
            }
            
            // Fetch status for all configured workflows
            const statuses = await Promise.all(
                workflows.map(wf => this.getWorkflowStatus(owner, wf.repo, wf.workflow, wf.branch, headers))
            );
            
            // Cache statuses for use in keyUp navigation
            this.cachedStatuses[context] = statuses;
            
            // Set the image with status indicators
            if (avatarUrl) {
                this.setStatusImage(context, avatarUrl, statuses);
            } else {
                // If no avatar, just set a title based on first status
                this.setTitleFromStatuses(context, statuses);
            }
            
        } catch (error) {
            console.error('Error fetching action status:', error);
            window.socket.setTitle(context, "Action\nErr");
        }
    },
    
    setTitleFromStatuses(context, statuses) {
        // Build a simple title showing status symbols for each workflow
        const symbols = statuses.map(status => {
            switch (status) {
                case 'success': return '✓';
                case 'failure': return '✗';
                case 'cancelled':
                case 'skipped': return '⊘';
                case 'in_progress':
                case 'queued':
                case 'waiting': return '⟳';
                case 'none': return '-';
                default: return '?';
            }
        });
        
        window.socket.setTitle(context, symbols.join(' '));
    },
    
    async getWorkflowStatus(owner, repo, workflow, branch, headers) {
        try {
            let url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`;
            if (workflow) {
                url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=1`;
            }
            if (branch) {
                url += `&branch=${encodeURIComponent(branch)}`;
            }
            
            const response = await fetch(url, { headers });
            if (!response.ok) return 'unknown';
            
            const data = await response.json();
            const runs = data.workflow_runs || [];
            
            if (runs.length === 0) return 'none';
            
            const latestRun = runs[0];
            if (latestRun.status === 'completed') {
                return latestRun.conclusion || 'unknown';
            }
            return latestRun.status || 'unknown';
        } catch {
            return 'unknown';
        }
    },
    
    async setStatusImage(context, avatarUrl, statuses) {
        const self = this;
        try {
            // Fetch the image as blob to avoid CORS issues
            const response = await fetch(avatarUrl);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                
                // Create image to draw on canvas
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    const size = 144;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    
                    // Draw avatar scaled to fill the space
                    ctx.drawImage(image, 0, 0, size, size);
                    
                    // Calculate indicator positions based on number of statuses
                    // 1 workflow: bottom-right
                    // 2 workflows: bottom-left, bottom-right
                    // 3 workflows: bottom-left, bottom-center, bottom-right
                    const indicatorSize = 32;
                    const padding = 6;
                    const bottomY = size - indicatorSize - padding;
                    
                    let positions = [];
                    if (statuses.length === 1) {
                        // Bottom-right only
                        positions = [
                            { x: size - indicatorSize - padding, y: bottomY }
                        ];
                    } else if (statuses.length === 2) {
                        // Bottom-left and bottom-right
                        positions = [
                            { x: padding, y: bottomY },
                            { x: size - indicatorSize - padding, y: bottomY }
                        ];
                    } else if (statuses.length >= 3) {
                        // Bottom-left, bottom-center, bottom-right
                        positions = [
                            { x: padding, y: bottomY },
                            { x: (size - indicatorSize) / 2, y: bottomY },
                            { x: size - indicatorSize - padding, y: bottomY }
                        ];
                    }
                    
                    // Draw each status indicator
                    statuses.forEach((status, index) => {
                        if (index < positions.length) {
                            const pos = positions[index];
                            self.drawStatusIndicator(ctx, pos.x, pos.y, indicatorSize, status);
                        }
                    });
                    
                    // Send the image to Stream Dock
                    window.socket.send(JSON.stringify({
                        event: "setImage",
                        context,
                        payload: {
                            target: 0,
                            image: canvas.toDataURL("image/png")
                        }
                    }));
                };
                image.src = base64data;
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error setting status image:', error);
        }
    },
    
    drawStatusIndicator(ctx, x, y, size, status) {
        // Determine color based on status
        let color;
        switch (status) {
            case 'success':
                color = '#28a745'; // Green
                break;
            case 'failure':
                color = '#dc3545'; // Red
                break;
            case 'cancelled':
            case 'skipped':
                color = '#6c757d'; // Gray
                break;
            case 'in_progress':
            case 'queued':
            case 'waiting':
                color = '#ffc107'; // Yellow
                break;
            case 'none':
                color = '#6c757d'; // Gray
                break;
            default:
                color = '#6c757d'; // Gray
        }
        
        // Draw circle background
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
});
