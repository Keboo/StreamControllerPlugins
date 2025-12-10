/// <reference path="./utils/common.js" />

const plugin = new Plugins("azuredevops");

// Azure DevOps PR Count Action
plugin.prcount = new Actions({
    default: {
        organization: "",
        project: "",
        token: "",
        refreshInterval: 5,
        excludeUsers: "",
        includeDrafts: false
    },
    intervals: {},
    cachedPRs: {},
    
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
        // Open the PRs page for the first repository with a matching PR
        const { context } = data;
        const settings = this.data[context] || {};
        const org = settings.organization || "";
        const project = settings.project || "";
        const cachedPRs = this.cachedPRs[context] || [];
        
        // Only open if there are matching PRs
        if (org && project && cachedPRs.length > 0) {
            const firstPR = cachedPRs[0];
            const repoName = firstPR.repository?.name || '';
            if (repoName) {
                window.socket.openUrl(`https://dev.azure.com/${org}/${project}/_git/${repoName}/pullrequests?_a=active`);
            }
        }
    },
    
    keyDown(data) {
        // Refresh on key down
        const { context } = data;
        this.fetchAndDisplayPRCount(context, this.data[context] || {});
    },
    
    async fetchAndDisplayPRCount(context, settings) {
        const org = settings.organization || "";
        const project = settings.project || "";
        const token = settings.token || "";
        const excludeUsers = settings.excludeUsers || "";
        const includeDrafts = settings.includeDrafts || false;
        
        if (!org || !project || !token) {
            window.socket.setTitle(context, "PR\n--");
            return;
        }
        
        // Parse excluded users list (comma-separated, trimmed, lowercase for comparison)
        const excludedUsersList = excludeUsers
            .split(',')
            .map(u => u.trim().toLowerCase())
            .filter(u => u.length > 0);
        
        try {
            // Azure DevOps uses Basic auth with PAT as password
            const authHeader = 'Basic ' + btoa(':' + token);
            const headers = {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            };
            
            // Fetch active pull requests for the project
            // Status 1 = Active PRs
            const response = await fetch(
                `https://dev.azure.com/${org}/${project}/_apis/git/pullrequests?searchCriteria.status=active&api-version=7.0`,
                { headers }
            );
            
            if (!response.ok) {
                window.socket.setTitle(context, "PR\nErr");
                return;
            }
            
            const data = await response.json();
            let pullRequests = data.value || [];
            
            // Filter out draft PRs unless includeDrafts is true
            if (!includeDrafts) {
                pullRequests = pullRequests.filter(pr => !pr.isDraft);
            }
            
            // Filter out PRs if we have excluded users
            if (excludedUsersList.length > 0) {
                pullRequests = await this.filterExcludedPRs(pullRequests, excludedUsersList, org, headers);
            }
            
            // Cache the filtered PRs for use in keyUp
            this.cachedPRs[context] = pullRequests;
            
            const count = pullRequests.length;
            
            window.socket.setTitle(context, `PR\n${count}`);
            
            // Try to set project avatar/icon
            this.setProjectAvatar(context, org, project, headers);
            
        } catch (error) {
            console.error('Error fetching PR count:', error);
            window.socket.setTitle(context, "PR\nErr");
        }
    },
    
    async filterExcludedPRs(pullRequests, excludedUsersList, org, headers) {
        const filteredPRs = [];
        
        for (const pr of pullRequests) {
            // Check if PR author is in excluded list
            const authorName = (pr.createdBy?.uniqueName || pr.createdBy?.displayName || '').toLowerCase();
            const authorEmail = (pr.createdBy?.uniqueName || '').toLowerCase();
            
            // Check author against excluded users (match on username part of email or display name)
            const authorUsername = authorEmail.includes('@') ? authorEmail.split('@')[0] : authorEmail;
            const isAuthorExcluded = excludedUsersList.some(excluded => 
                authorName.includes(excluded) || 
                authorUsername === excluded ||
                authorEmail === excluded
            );
            
            if (isAuthorExcluded) {
                continue; // Skip this PR
            }
            
            // Fetch reviewers/threads to check for reviews from excluded users
            try {
                const reviewersResponse = await fetch(
                    `https://dev.azure.com/${org}/_apis/git/repositories/${pr.repository.id}/pullRequests/${pr.pullRequestId}/reviewers?api-version=7.0`,
                    { headers }
                );
                
                if (reviewersResponse.ok) {
                    const reviewersData = await reviewersResponse.json();
                    const reviewers = reviewersData.value || [];
                    
                    // Check if any excluded user has voted (non-zero vote means they reviewed)
                    const hasExcludedReview = reviewers.some(reviewer => {
                        if (reviewer.vote === 0) return false; // No vote yet
                        
                        const reviewerName = (reviewer.uniqueName || reviewer.displayName || '').toLowerCase();
                        const reviewerEmail = (reviewer.uniqueName || '').toLowerCase();
                        const reviewerUsername = reviewerEmail.includes('@') ? reviewerEmail.split('@')[0] : reviewerEmail;
                        
                        return excludedUsersList.some(excluded =>
                            reviewerName.includes(excluded) ||
                            reviewerUsername === excluded ||
                            reviewerEmail === excluded
                        );
                    });
                    
                    if (hasExcludedReview) {
                        continue; // Skip this PR
                    }
                }
            } catch (e) {
                console.error('Error fetching reviewers for PR:', pr.pullRequestId, e);
            }
            
            // PR passed all filters
            filteredPRs.push(pr);
        }
        
        return filteredPRs;
    },
    
    async setProjectAvatar(context, org, project, headers) {
        try {
            // Fetch project info to get project ID
            const response = await fetch(
                `https://dev.azure.com/${org}/_apis/projects/${project}?api-version=7.1`,
                { headers }
            );
            
            if (!response.ok) return;
            
            const data = await response.json();
            const teamId = data.defaultTeam.id;
            
            if (!teamId) return;
            
            // Fetch avatar using GraphProfile/MemberAvatars endpoint
            const avatarUrl = `https://dev.azure.com/${org}/_apis/GraphProfile/MemberAvatars/${teamId}`;
            const avatarResponse = await fetch(avatarUrl, { headers });
            if (!avatarResponse.ok) return;
            
            const blob = await avatarResponse.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    const size = 144;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    
                    // Draw rounded rectangle background
                    ctx.fillStyle = '#0078d4'; // Azure blue
                    ctx.beginPath();
                    ctx.roundRect(0, 0, size, size, 20);
                    ctx.fill();
                    
                    // Draw avatar scaled to fill the space
                    ctx.drawImage(image, 0, 0, size, size);
                    
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
            console.error('Error setting project avatar:', error);
        }
    }
});

// Azure DevOps Pipeline Status Action
plugin.pipelinestatus = new Actions({
    default: {
        organization: "",
        project: "",
        token: "",
        // Pipeline 1
        pipeline1: "",
        branch1: "",
        // Pipeline 2
        pipeline2: "",
        branch2: "",
        // Pipeline 3
        pipeline3: "",
        branch3: "",
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
            this.fetchAndDisplayStatus(context, this.data[context] || {});
        }
    },
    
    didReceiveSettings(data) {
        const { context, payload: { settings } } = data;
        this.data[context] = Object.assign({ ...this.default }, settings);
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
        // Open the pipelines page or specific pipeline based on status priority
        const { context } = data;
        const settings = this.data[context] || {};
        const org = settings.organization || "";
        const project = settings.project || "";
        
        const pipelines = this.getConfiguredPipelines(settings);
        if (!org || !project || pipelines.length === 0) return;
        
        // Get cached statuses
        const cachedStatuses = this.cachedStatuses?.[context] || [];
        
        // Find the pipeline to open based on priority (failures first)
        const pipelineToOpen = this.getHighestPriorityPipeline(pipelines, cachedStatuses);
        
        if (pipelineToOpen && pipelineToOpen.id) {
            window.socket.openUrl(`https://dev.azure.com/${org}/${project}/_build?definitionId=${pipelineToOpen.id}`);
        } else {
            window.socket.openUrl(`https://dev.azure.com/${org}/${project}/_build`);
        }
    },
    
    getHighestPriorityPipeline(pipelines, statuses) {
        // Priority levels (lower number = higher priority)
        const getPriority = (status) => {
            switch (status) {
                case 'failed': return 1;
                case 'partiallySucceeded': return 2;
                case 'canceled': return 3;
                case 'inProgress':
                case 'notStarted': return 4;
                case 'succeeded': return 5;
                default: return 6;
            }
        };
        
        if (statuses.length === 0) {
            return pipelines[0];
        }
        
        let bestIndex = 0;
        let bestPriority = getPriority(statuses[0]);
        
        for (let i = 1; i < pipelines.length && i < statuses.length; i++) {
            const priority = getPriority(statuses[i]);
            if (priority < bestPriority) {
                bestPriority = priority;
                bestIndex = i;
            }
        }
        
        return pipelines[bestIndex];
    },
    
    keyDown(data) {
        // Refresh on key down
        const { context } = data;
        this.fetchAndDisplayStatus(context, this.data[context] || {});
    },
    
    getConfiguredPipelines(settings) {
        const pipelines = [];
        
        if (settings.pipeline1) {
            pipelines.push({ id: settings.pipeline1, branch: settings.branch1 || '' });
        }
        if (settings.pipeline2) {
            pipelines.push({ id: settings.pipeline2, branch: settings.branch2 || '' });
        }
        if (settings.pipeline3) {
            pipelines.push({ id: settings.pipeline3, branch: settings.branch3 || '' });
        }
        
        return pipelines;
    },
    
    async fetchAndDisplayStatus(context, settings) {
        const org = settings.organization || "";
        const project = settings.project || "";
        const token = settings.token || "";
        
        const pipelines = this.getConfiguredPipelines(settings);
        
        if (!org || !project || !token || pipelines.length === 0) {
            window.socket.setTitle(context, "Build\n--");
            return;
        }
        
        try {
            const authHeader = 'Basic ' + btoa(':' + token);
            const headers = {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            };
            
            // Fetch status for all configured pipelines
            const statuses = await Promise.all(
                pipelines.map(p => this.getPipelineStatus(org, project, p.id, p.branch, headers))
            );
            
            // Cache statuses for keyUp navigation
            this.cachedStatuses[context] = statuses;
            
            // Set the image with status indicators
            this.setStatusImage(context, org, project, headers, statuses);
            
        } catch (error) {
            console.error('Error fetching pipeline status:', error);
            window.socket.setTitle(context, "Build\nErr");
        }
    },
    
    async getPipelineStatus(org, project, pipelineId, branch, headers) {
        try {
            let url = `https://dev.azure.com/${org}/${project}/_apis/build/builds?definitions=${pipelineId}&$top=1&api-version=7.0`;
            if (branch) {
                url += `&branchName=refs/heads/${encodeURIComponent(branch)}`;
            }
            
            const response = await fetch(url, { headers });
            if (!response.ok) return 'unknown';
            
            const data = await response.json();
            const builds = data.value || [];
            
            if (builds.length === 0) return 'none';
            
            const latestBuild = builds[0];
            // Azure DevOps status: notStarted, inProgress, completed
            // Azure DevOps result: succeeded, failed, canceled, partiallySucceeded
            if (latestBuild.status === 'completed') {
                return latestBuild.result || 'unknown';
            }
            return latestBuild.status || 'unknown';
        } catch {
            return 'unknown';
        }
    },
    
    async setStatusImage(context, org, project, headers, statuses) {
        const self = this;
        try {
            // Fetch project info to get project ID
            const projectResponse = await fetch(
                `https://dev.azure.com/${org}/_apis/projects/${project}?api-version=7.1`,
                { headers }
            );
            
            if (!projectResponse.ok) {
                this.setTitleFromStatuses(context, statuses);
                return;
            }
            
            const projectData = await projectResponse.json();
            const teamId = projectData.defaultTeam.id;
            
            if (!teamId) {
                this.setTitleFromStatuses(context, statuses);
                return;
            }
            
            // Fetch avatar using GraphProfile/MemberAvatars endpoint
            const avatarUrl = `https://dev.azure.com/${org}/_apis/GraphProfile/MemberAvatars/${teamId}`;
            const response = await fetch(avatarUrl, { headers });
            
            if (!response.ok) {
                // If no avatar, just set title with status symbols
                this.setTitleFromStatuses(context, statuses);
                return;
            }
            
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                
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
                    const indicatorSize = 32;
                    const padding = 6;
                    const bottomY = size - indicatorSize - padding;
                    
                    let positions = [];
                    if (statuses.length === 1) {
                        positions = [
                            { x: size - indicatorSize - padding, y: bottomY }
                        ];
                    } else if (statuses.length === 2) {
                        positions = [
                            { x: padding, y: bottomY },
                            { x: size - indicatorSize - padding, y: bottomY }
                        ];
                    } else if (statuses.length >= 3) {
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
            this.setTitleFromStatuses(context, statuses);
        }
    },
    
    setTitleFromStatuses(context, statuses) {
        const symbols = statuses.map(status => {
            switch (status) {
                case 'succeeded': return '✓';
                case 'failed': return '✗';
                case 'partiallySucceeded': return '⚠';
                case 'canceled': return '⊘';
                case 'inProgress':
                case 'notStarted': return '⟳';
                case 'none': return '-';
                default: return '?';
            }
        });
        
        window.socket.setTitle(context, symbols.join(' '));
    },
    
    drawStatusIndicator(ctx, x, y, size, status) {
        // Determine color based on Azure DevOps status/result
        let color;
        switch (status) {
            case 'succeeded':
                color = '#28a745'; // Green
                break;
            case 'failed':
                color = '#dc3545'; // Red
                break;
            case 'partiallySucceeded':
                color = '#fd7e14'; // Orange
                break;
            case 'canceled':
                color = '#6c757d'; // Gray
                break;
            case 'inProgress':
            case 'notStarted':
                color = '#0078d4'; // Azure blue
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
