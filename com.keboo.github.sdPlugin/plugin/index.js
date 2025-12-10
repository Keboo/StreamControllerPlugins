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
                headers['Authorization'] = `token ${token}`;
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
        repo: "",
        workflow: "",
        branch: "",
        token: "",
        refreshInterval: 5
    },
    intervals: {},
    
    _willAppear({ context }) {
        const settings = this.data[context] || {};
        this.fetchAndDisplayStatus(context, settings);
        this.startRefreshInterval(context, settings);
    },
    
    _willDisappear({ context }) {
        this.stopRefreshInterval(context);
    },
    
    didReceiveSettings(data) {
        const { context, payload: { settings } } = data;
        this.data[context] = Object.assign({ ...this.default }, settings);
        this.fetchAndDisplayStatus(context, settings);
        // Restart interval with new settings
        this.stopRefreshInterval(context);
        this.startRefreshInterval(context, settings);
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
        // Open the Actions page when button is pressed
        const { context } = data;
        const settings = this.data[context] || {};
        const owner = settings.owner || "";
        const repo = settings.repo || "";
        const workflow = settings.workflow || "";
        const branch = settings.branch || "";
        
        if (owner && repo) {
            let url;
            if (workflow) {
                url = `https://github.com/${owner}/${repo}/actions/workflows/${workflow}`;
            } else {
                url = `https://github.com/${owner}/${repo}/actions`;
            }
            if (branch) {
                url += `?query=branch%3A${encodeURIComponent(branch)}`;
            }
            window.socket.openUrl(url);
        }
    },
    
    keyDown(data) {
        // Refresh on key down
        const { context } = data;
        this.fetchAndDisplayStatus(context, this.data[context] || {});
    },
    
    async fetchAndDisplayStatus(context, settings) {
        const owner = settings.owner || "";
        const repo = settings.repo || "";
        const workflow = settings.workflow || "";
        const branch = settings.branch || "";
        const token = settings.token || "";
        
        if (!owner || !repo) {
            window.socket.setTitle(context, "Action\n--");
            return;
        }
        
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'StreamDock-Plugin'
            };
            
            if (token) {
                headers['Authorization'] = `token ${token}`;
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
                    // We'll overlay status on the avatar
                    const status = await this.getWorkflowStatus(owner, repo, workflow, branch, headers);
                    this.setStatusImage(context, avatarUrl, status);
                }
            }
            
            // Get workflow runs
            let url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`;
            if (workflow) {
                url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=1`;
            }
            if (branch) {
                url += `&branch=${encodeURIComponent(branch)}`;
            }
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                window.socket.setTitle(context, "Action\nErr");
                return;
            }
            
            const data = await response.json();
            const runs = data.workflow_runs || [];
            
            if (runs.length === 0) {
                window.socket.setTitle(context, "Action\nNone");
                return;
            }
            
            const latestRun = runs[0];
            const status = latestRun.status;
            const conclusion = latestRun.conclusion;
            
            let displayText = "";
            if (status === "completed") {
                switch (conclusion) {
                    case "success":
                        displayText = "✓";
                        break;
                    case "failure":
                        displayText = "✗";
                        break;
                    case "cancelled":
                        displayText = "⊘";
                        break;
                    case "skipped":
                        displayText = "⊘";
                        break;
                    default:
                        displayText = conclusion || "?";
                }
            } else {
                switch (status) {
                    case "queued":
                        displayText = "⏳";
                        break;
                    case "in_progress":
                        displayText = "⟳";
                        break;
                    case "waiting":
                        displayText = "⏳";
                        break;
                    default:
                        displayText = status || "?";
                }
            }
            
            window.socket.setTitle(context, displayText);
        } catch (error) {
            console.error('Error fetching action status:', error);
            window.socket.setTitle(context, "Action\nErr");
        }
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
    
    async setStatusImage(context, avatarUrl, status) {
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
                    
                    // Draw status indicator in bottom-right corner
                    const indicatorSize = 40;
                    const indicatorX = size - indicatorSize - 8;
                    const indicatorY = size - indicatorSize - 8;
                    
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
                        default:
                            color = '#6c757d'; // Gray
                    }
                    
                    // Draw circle background
                    ctx.beginPath();
                    ctx.arc(indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2, indicatorSize / 2, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                    
                    // Draw border
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    
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
    }
});
