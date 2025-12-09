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

### Debugging

After installing the plugin, you can debug it by navigating to:
```
http://localhost:23519/
```

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
