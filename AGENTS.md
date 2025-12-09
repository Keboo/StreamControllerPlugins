# AGENTS.md

## Project Overview

Stream Dock plugin for GitHub integration. JavaScript-based plugin using the Stream Dock SDK.

## Structure

```
com.keboo.github.sdPlugin/
├── manifest.json                      # Plugin config, actions, UUIDs
├── en.json                            # Localization
├── plugin/
│   ├── index.html                     # Entry point
│   ├── index.js                       # Action handlers
│   └── utils/common.js                # SDK utilities (WebSocket, setTitle, setImage)
├── propertyInspector/
│   ├── action/                        # Open GitHub Repo settings
│   ├── prcount/                       # PR Count settings
│   └── utils/                         # PI utilities
└── static/                            # Icons, CSS
```

## Actions

| UUID | Name | Description |
|------|------|-------------|
| `com.keboo.github.action` | Open GitHub Repo | Opens `github.com/{owner}/{repo}` on keyUp |
| `com.keboo.github.prcount` | PR Count | Displays open PR count, fetches owner avatar as icon |

## Key Patterns

### Adding a New Action
1. Add action object to `manifest.json` Actions array with unique UUID
2. Add handler in `plugin/index.js`: `plugin.{actionName} = new Actions({...})`
3. Create Property Inspector in `propertyInspector/{actionName}/`
4. Update `en.json` for localization

### Action Handler Structure
```javascript
plugin.actionname = new Actions({
    default: { /* default settings */ },
    _willAppear({ context }) { /* init */ },
    _willDisappear({ context }) { /* cleanup */ },
    didReceiveSettings(data) { /* settings changed */ },
    keyUp(data) { /* button released */ },
    keyDown(data) { /* button pressed */ }
});
```

### SDK Methods (via window.socket)
- `setTitle(context, text)` - Set button text
- `setImage(context, url)` - Set button image
- `openUrl(url)` - Open URL in browser
- `setSettings(context, payload)` - Save settings

### GitHub API
- Auth header: `Authorization: token {PAT}` 
- Base URL: `https://api.github.com`
- Rate limits apply without token

## Installation Path
```
C:\Users\{username}\AppData\Roaming\HotSpot\StreamDock\plugins
```

## Debugging
```
http://localhost:23519/
```
