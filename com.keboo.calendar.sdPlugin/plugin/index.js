/// <reference path="./utils/common.js" />

const plugin = new Plugins("calendar");

// Next Meeting Action
plugin.nextmeeting = new Actions({
    default: {
        icsUrl: "",
        refreshInterval: 5
    },
    intervals: {},
    scrollIntervals: {},
    isScrolling: {},
    nextEvent: {},
    
    _willAppear({ context }) {
        const settings = this.data[context] || {};
        this.fetchAndDisplayNextMeeting(context, settings);
        this.startRefreshInterval(context, settings);
    },
    
    _willDisappear({ context }) {
        this.stopRefreshInterval(context);
        this.stopScrolling(context);
    },
    
    didReceiveSettings(data) {
        const { context, payload: { settings } } = data;
        this.data[context] = Object.assign({ ...this.default }, settings);
        this.fetchAndDisplayNextMeeting(context, settings);
        // Restart interval with new settings
        this.stopRefreshInterval(context);
        this.startRefreshInterval(context, settings);
    },
    
    startRefreshInterval(context, settings) {
        const minutes = Math.min(60, Math.max(1, parseInt(settings.refreshInterval) || 5));
        // Update every 10 seconds to keep countdown accurate
        this.intervals[context] = setInterval(() => {
            if (!this.isScrolling[context]) {
                this.displayTimeUntilMeeting(context);
            }
        }, 10 * 1000);
        
        // Refresh calendar data at the specified interval
        this.intervals[context + '_fetch'] = setInterval(() => {
            this.fetchAndDisplayNextMeeting(context, this.data[context] || {});
        }, minutes * 60 * 1000);
    },
    
    stopRefreshInterval(context) {
        if (this.intervals[context]) {
            clearInterval(this.intervals[context]);
            delete this.intervals[context];
        }
        if (this.intervals[context + '_fetch']) {
            clearInterval(this.intervals[context + '_fetch']);
            delete this.intervals[context + '_fetch'];
        }
    },
    
    stopScrolling(context) {
        if (this.scrollIntervals[context]) {
            clearInterval(this.scrollIntervals[context]);
            delete this.scrollIntervals[context];
        }
        this.isScrolling[context] = false;
    },
    
    keyUp(data) {
        const { context } = data;
        
        // If already scrolling, stop and go back to time display
        if (this.isScrolling[context]) {
            this.stopScrolling(context);
            this.displayTimeUntilMeeting(context);
            return;
        }
        
        const event = this.nextEvent[context];
        if (!event || !event.summary) {
            return;
        }
        
        // Wait 0.5 seconds, then start scrolling
        this.isScrolling[context] = true;
        setTimeout(() => {
            this.scrollTitle(context, event.summary);
        }, 500);
    },
    
    keyDown(data) {
        // Optional: could add visual feedback here
    },
    
    scrollTitle(context, title) {
        const displayLength = 6; // Characters that fit on button
        const paddedTitle = title + "   "; // Add spaces for smooth looping
        let scrollPosition = 0;
        
        // Show initial title
        const getDisplayText = () => {
            const doubled = paddedTitle + paddedTitle;
            return doubled.substring(scrollPosition, scrollPosition + displayLength);
        };
        
        window.socket.setTitle(context, getDisplayText());
        
        // Start scrolling
        this.scrollIntervals[context] = setInterval(() => {
            scrollPosition++;
            if (scrollPosition >= paddedTitle.length) {
                scrollPosition = 0;
            }
            window.socket.setTitle(context, getDisplayText());
        }, 300); // Scroll speed: 300ms per character
        
        // Stop scrolling after title has scrolled through twice
        const scrollDuration = (paddedTitle.length * 2 + displayLength) * 300;
        setTimeout(() => {
            this.stopScrolling(context);
            this.displayTimeUntilMeeting(context);
        }, scrollDuration);
    },
    
    displayTimeUntilMeeting(context) {
        const event = this.nextEvent[context];
        
        if (!event) {
            window.socket.setTitle(context, "No\nMtgs");
            return;
        }
        
        const now = new Date();
        const start = new Date(event.start);
        const diffMs = start - now;
        
        if (diffMs < 0) {
            // Meeting is happening now or has passed, refresh
            this.fetchAndDisplayNextMeeting(context, this.data[context] || {});
            return;
        }
        
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            window.socket.setTitle(context, `${days}d`);
        } else {
            const hh = hours.toString().padStart(2, '0');
            const mm = mins.toString().padStart(2, '0');
            window.socket.setTitle(context, `${hh}:${mm}`);
        }
    },
    
    async fetchAndDisplayNextMeeting(context, settings) {
        const icsUrl = settings.icsUrl || "";
        
        if (!icsUrl) {
            window.socket.setTitle(context, "Set\nURL");
            this.nextEvent[context] = null;
            return;
        }
        
        try {
            const response = await fetch(icsUrl);
            
            if (!response.ok) {
                window.socket.setTitle(context, "Err");
                this.nextEvent[context] = null;
                return;
            }
            
            const icsText = await response.text();
            const events = this.parseICS(icsText);
            const now = new Date();
            
            // Find next upcoming event
            const upcomingEvents = events
                .filter(e => new Date(e.start) > now)
                .sort((a, b) => new Date(a.start) - new Date(b.start));
            
            if (upcomingEvents.length === 0) {
                window.socket.setTitle(context, "No\nMtgs");
                this.nextEvent[context] = null;
                return;
            }
            
            this.nextEvent[context] = upcomingEvents[0];
            this.displayTimeUntilMeeting(context);
            
        } catch (error) {
            console.error('Error fetching ICS:', error);
            window.socket.setTitle(context, "Err");
            this.nextEvent[context] = null;
        }
    },
    
    parseICS(icsText) {
        const events = [];
        const lines = icsText.replace(/\r\n /g, '').split(/\r?\n/);
        
        let currentEvent = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line === 'END:VEVENT') {
                if (currentEvent && currentEvent.start) {
                    events.push(currentEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > -1) {
                    let key = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);
                    
                    // Handle parameters in key (e.g., DTSTART;TZID=...)
                    const semicolonIndex = key.indexOf(';');
                    if (semicolonIndex > -1) {
                        key = key.substring(0, semicolonIndex);
                    }
                    
                    switch (key) {
                        case 'SUMMARY':
                            currentEvent.summary = this.unescapeICS(value);
                            break;
                        case 'DTSTART':
                            currentEvent.start = this.parseICSDate(value);
                            break;
                        case 'DTEND':
                            currentEvent.end = this.parseICSDate(value);
                            break;
                    }
                }
            }
        }
        
        return events;
    },
    
    parseICSDate(dateStr) {
        // Handle various ICS date formats
        // YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
        dateStr = dateStr.trim();
        
        if (dateStr.length === 8) {
            // Date only: YYYYMMDD
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return new Date(year, month - 1, day).toISOString();
        }
        
        // Remove 'Z' suffix if present and handle as UTC
        const isUTC = dateStr.endsWith('Z');
        dateStr = dateStr.replace('Z', '').replace('T', '');
        
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10) || '00';
        const minute = dateStr.substring(10, 12) || '00';
        const second = dateStr.substring(12, 14) || '00';
        
        if (isUTC) {
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
        }
        
        return new Date(year, month - 1, day, hour, minute, second).toISOString();
    },
    
    unescapeICS(text) {
        return text
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }
});
