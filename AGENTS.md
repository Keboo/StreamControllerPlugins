# AGENTS.md

## Project Overview

Stream Dock plugin for GitHub integration. JavaScript-based plugin using the Stream Dock SDK.

## Official SDK Documentation

> **📚 Full documentation:** https://sdk.key123.vip/en/

| Topic | Link | Description |
|-------|------|-------------|
| Getting Started | [Guide](https://sdk.key123.vip/en/guide/get-started.html) | Quick start with plugin templates |
| Overview | [Overview](https://sdk.key123.vip/en/guide/overview.html) | SDK concepts and architecture |
| Terminology | [Terminology](https://sdk.key123.vip/en/guide/terminology.html) | Key terms and definitions |
| Architecture | [Architecture](https://sdk.key123.vip/en/guide/architecture.html) | Plugin structure and communication |
| Manifest | [Manifest](https://sdk.key123.vip/en/guide/manifest.html) | Plugin configuration reference |
| Internationalization | [i18n](https://sdk.key123.vip/en/guide/i18n.html) | Localization setup |
| Received Events | [Events Received](https://sdk.key123.vip/en/guide/events-received.html) | Events plugins receive from Stream Dock |
| Events Sent | [Events Sent](https://sdk.key123.vip/en/guide/events-sent.html) | Events plugins send to Stream Dock |
| Registration | [Registration](https://sdk.key123.vip/en/guide/registration.html) | Plugin registration procedure |
| Property Inspector | [Property Inspector](https://sdk.key123.vip/en/guide/property-inspector.html) | Custom settings UI |
| Style Guide | [Style Guide](https://sdk.key123.vip/en/guide/style-guide.html) | UI styling guidelines |

### Examples
- [Counter](https://sdk.key123.vip/en/example/counter.html) - Basic counter action
- [Timer](https://sdk.key123.vip/en/example/timer.html) - Timer implementation
- [Number Display](https://sdk.key123.vip/en/example/showNumber.html) - Display numbers
- [Time/Clock](https://sdk.key123.vip/en/example/clock.html) - Clock display

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
1. Add action object to `manifest.json` Actions array with unique UUID ([Manifest Docs](https://sdk.key123.vip/en/guide/manifest.html#actions))
2. Add handler in `plugin/index.js`: `plugin.{actionName} = new Actions({...})`
3. Create Property Inspector in `propertyInspector/{actionName}/` ([PI Docs](https://sdk.key123.vip/en/guide/property-inspector.html))
4. Update `en.json` for localization ([i18n Docs](https://sdk.key123.vip/en/guide/i18n.html))

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

### Received Events (Plugin ← Stream Dock)
> Full reference: [Events Received](https://sdk.key123.vip/en/guide/events-received.html)

| Event | Description |
|-------|-------------|
| `didReceiveSettings` | Settings changed for action instance |
| `didReceiveGlobalSettings` | Global plugin settings changed |
| `keyDown` | User pressed a key |
| `keyUp` | User released a key |
| `willAppear` | Action instance appears on device |
| `willDisappear` | Action instance removed from device |
| `dialDown` / `dialUp` / `dialRotate` | Knob/dial interactions |
| `deviceDidConnect` / `deviceDidDisconnect` | Device connection events |
| `propertyInspectorDidAppear` / `propertyInspectorDidDisappear` | PI visibility |
| `sendToPlugin` | Data sent from Property Inspector |

### Events Sent (Plugin → Stream Dock)
> Full reference: [Events Sent](https://sdk.key123.vip/en/guide/events-sent.html)

| Event | Description |
|-------|-------------|
| `setSettings` | Save persistent data for action instance |
| `getSettings` | Request stored settings |
| `setGlobalSettings` / `getGlobalSettings` | Global plugin data |
| `setTitle` | Change button title dynamically |
| `setImage` | Change button image (base64 or SVG) |
| `showAlert` | Show temporary alert icon |
| `showOk` | Show temporary checkmark icon |
| `setState` | Change action state (multi-state actions) |
| `openUrl` | Open URL in default browser |
| `logMessage` | Write to debug log |
| `sendToPropertyInspector` | Send data to PI |

### SDK Methods (via window.socket)
- `setTitle(context, text)` - Set button text
- `setImage(context, url)` - Set button image (supports base64, SVG)
- `openUrl(url)` - Open URL in browser
- `setSettings(context, payload)` - Save settings

### Manifest Configuration
> Full reference: [Manifest Docs](https://sdk.key123.vip/en/guide/manifest.html)

Required fields:
- `Actions` - Array of action definitions
- `Author`, `Name`, `Version`, `Description`
- `CodePath` - Relative path to plugin HTML/JS
- `Icon` - 128x128px plugin icon
- `SDKVersion` - Set to `1`
- `OS` - Supported platforms array

Action fields:
- `UUID` - Unique identifier (reverse DNS: `com.company.plugin.action`)
- `Name`, `Icon`, `States[]`
- `Controllers` - `["Keypad", "Information", "SecondaryScreen", "Knob"]`
- `PropertyInspectorPath` - Custom settings UI

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

> **Tip:** Restart Stream Dock after adding plugins for the first time. Use the debug URL to reload plugins during development.

## Quick Start for New Plugins

1. Clone the SDK template: `git clone git@github.com:MiraboxSpace/StreamDock-Plugin-SDK.git`
2. Rename folder to `com.yourcompany.yourplugin.sdPlugin`
3. Update `UUID` in `manifest.json` to match folder name
4. Implement action handlers in `plugin/index.js`
5. Create Property Inspector UI in `propertyInspector/`
6. Copy to plugins folder and restart Stream Dock
7. Debug at `http://localhost:23519/`

> **More help:** [Help and Error Reporting](https://sdk.key123.vip/en/support/help.html)
