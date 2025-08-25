# Musubi TUI

**Musubi (結び)** - *"knot, connection, binding"* - A visual tapestry of your connected tasks.

A terminal user interface for managing synchronization between Todoist, Things 3, and Obsidian.

## Features

- **Real-time Dashboard**: View sync status across all platforms
- **One-click Sync**: Quick sync with keyboard shortcuts
- **Visual Feedback**: Progress bars and activity logs
- **Maintenance Tools**: Duplicate cleanup, health checks
- **Keyboard-driven**: Fast navigation with shortcuts

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Configure (first time)
npm run configure

# Run the TUI
npm start
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Usage

### Keyboard Shortcuts

- `F1` / `?` / `h` - Show help
- `F2` - Open sync menu
- `F3` - Task browser
- `F4` - Maintenance tools
- `F5` / `r` - Refresh status
- `F6` - Settings
- `F7` - Metrics view
- `s` - Quick sync (Todoist ↔ Things)
- `f` - Full sync (all platforms)
- `l` - Toggle logs
- `q` / `Ctrl+C` - Quit

### First Run

If not configured, a simple setup wizard will prompt you to:
1. Enter your Cloudflare Worker URL
2. (Optional) Enter your Todoist API token
3. Choose auto-sync and interval

### Metrics

- Dashboard includes mini charts: success rate (donut) and sync counts by type (bar).
- Press `F7` to open the Metrics view. Use `1/2/3` to switch timeframe (1h, 24h, 7d).

## Architecture

The TUI wraps existing shell scripts and provides a unified interface:

```
TUI Application
    ├── Dashboard (UI)
    ├── SyncOrchestrator (Logic)
    ├── ScriptRunner (Shell execution)
    └── ConfigManager (Settings)
```

## Configuration

Configuration is stored in `~/.musubi/config.json`:

```json
{
  "api": {
    "workerUrl": "https://musubi-sync.workers.dev",
    "todoistApiToken": "your-token-here"
  },
  "sync": {
    "autoSync": true,
    "interval": 900000
  }
}
```

## Logs

Logs are stored in `~/.musubi/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only

Press `l` in the TUI to open a read-only log viewer.

## Requirements

- Node.js 18+
- macOS (for Things integration)
- Todoist API token
- Deployed Cloudflare Worker

## Troubleshooting

### TUI doesn't start
- Check Node.js version: `node --version`
- Verify scripts directory exists
- Check log files for errors

### Sync fails
- Verify API tokens are correct
- Check network connectivity
- Review error logs

### Display issues
- Ensure terminal supports Unicode
- Try different terminal emulator
- Resize terminal window

## Future Enhancements

- [ ] Task editing within TUI
- [ ] Conflict resolution UI
- [ ] Scheduled sync configuration
- [ ] Export/import functionality
- [ ] Performance metrics dashboard

## Related Projects

- [musubi-sync-engine](https://github.com/thalysguimaraes/musubi-sync-engine) - Core sync engine
- [musubi-obsidian-plugin](https://github.com/thalysguimaraes/musubi-obsidian-plugin) - Obsidian plugin for three-way sync

## License

MIT
