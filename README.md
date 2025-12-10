# Open GitHub Repo - Stream Dock Plugin

A simple Stream Dock plugin that opens a GitHub repository in your browser when the button is pressed.

## Features

- Configure any GitHub repository (owner/repo)
- Opens the repository in your default browser with a single button press
- Clean, simple interface

## Installation

1. Copy the `com.keboo.github.sdPlugin` folder to your Stream Dock plugins directory:
   ```
   C:\Users\{username}\AppData\Roaming\HotSpot\StreamDock\plugins
   ```

2. Restart Stream Dock

3. The plugin "Open GitHub Repo" will appear in the "Keboo GitHub" category

## Usage

1. Drag the "Open GitHub Repo" action to a button on your Stream Dock
2. Click the button to open the Property Inspector
3. Enter the **Owner** (GitHub username or organization)
4. Enter the **Repository** name
5. Press the button to open `https://github.com/{Owner}/{Repo}`

## Configuration

| Setting | Description | Example |
|---------|-------------|---------|
| Owner | GitHub username or organization | `keboo` |
| Repository | Repository name | `dotnetconf` |

## Development

### Deployment

Use the included PowerShell script to deploy all plugins:

```powershell
.\deploy.ps1
```

This script will:
1. Find all `.sdPlugin` folders in the project
2. Stop Stream Controller if running
3. Copy plugins to `%APPDATA%\HotSpot\StreamDock\plugins`
4. Restart Stream Controller

### Debugging

After installing the plugin, you can debug it using Chrome DevTools:

1. **Open the debug URL**: Navigate to `http://localhost:23519/` in your browser
2. **Select your plugin**: You'll see a list of available plugin contexts
3. **Inspect elements**: Use the DevTools to inspect HTML, CSS, and JavaScript
4. **View console logs**: Check `console.log()` output and errors
5. **Hot reload**: Make changes to your plugin code and refresh to see updates without restarting Stream Dock

#### Debug Tips

- **Plugin not appearing?** Restart Stream Dock after adding a new plugin for the first time
- **Property Inspector issues?** Select the PI context separately from the main plugin context
- **Network requests**: Use the Network tab to debug GitHub API calls
- **Breakpoints**: Set breakpoints in your JavaScript code to step through execution

### Project Structure

```
com.keboo.github.sdPlugin/
├── manifest.json              # Plugin configuration
├── en.json                    # English localization
├── plugin/
│   ├── index.html             # Plugin entry point
│   ├── index.js               # Main plugin logic
│   └── utils/
│       ├── common.js          # SDK utilities
│       └── worker.js          # Timer worker
├── propertyInspector/
│   ├── action/
│   │   ├── index.html         # Settings UI
│   │   └── index.js           # Settings logic
│   └── utils/
│       ├── common.js
│       └── action.js
└── static/
    ├── icon.svg               # Plugin icon
    └── css/
        └── sdpi.css           # Property Inspector styles
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Keboo
