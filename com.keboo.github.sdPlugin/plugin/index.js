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
