# Budget Dashboard Launchers

Files:

- `start_budget_dashboard.sh`: starts the dashboard from Terminal
- `Launch Budget Dashboard.command`: double-clickable launcher
- `open_budget_dashboard_terminal.applescript`: opens Terminal and runs the launcher

## Direct use

Run:

```bash
/Users/corbin/Hal9000/scripts/tools/budget-dashboard/start_budget_dashboard.sh
```

## Apple Shortcuts

The macOS `shortcuts` CLI cannot create shortcuts, but you can wire one in manually:

1. Open Shortcuts
2. Create a new shortcut
3. Add `Run Shell Script`
4. Use this command:

```bash
/Users/corbin/Hal9000/scripts/tools/budget-dashboard/start_budget_dashboard.sh
```

Alternative:

1. In Finder, use `Launch Budget Dashboard.command`
2. Or in Shortcuts, use `Open File` and point it at:

```text
/Users/corbin/Hal9000/scripts/tools/budget-dashboard/Launch Budget Dashboard.command
```
