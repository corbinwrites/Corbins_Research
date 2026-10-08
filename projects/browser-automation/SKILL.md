---
name: browser-automation
description: Control a local Chrome browser instance to automate web tasks. Use when the user wants to "drive" the browser, navigate to pages, click elements, fill forms, read content, or take screenshots.
---

# Browser Automation

This skill allows you to control a local Google Chrome instance using the Chrome DevTools Protocol (CDP) via `puppeteer-core`. It is useful for tasks that require a full browser context, such as navigating complex single-page applications (SPAs), taking screenshots, or interacting with page elements.

## Prerequisites

Before using this skill, ensure the dependencies are installed:

```bash
cd browser-automation && npm install
```

## Workflow

### 1. Launch Chrome

First, ensure Chrome is running with remote debugging enabled. Use the bundled launch script:

```bash
./browser-automation/scripts/launch_chrome.sh
```

This script will:
- Check if Chrome is already listening on port 9222.
- If not, launch a new Chrome instance with a temporary user profile (`/tmp/chrome-debug-profile`) to avoid interfering with your main browsing session.
- Enable the necessary flags for automation (`--enable-automation`, etc.).

### 2. Control the Browser

Use the `control_chrome.js` script to perform actions. The script connects to the running Chrome instance on `localhost:9222`.

**Basic Syntax:**

```bash
node browser-automation/scripts/control_chrome.js --action=<ACTION> [OPTIONS]
```

## Actions

| Action | Description | Required Options | Example |
| :--- | :--- | :--- | :--- |
| `navigate` | Navigate to a URL | `--url` | `--action=navigate --url="https://google.com"` |
| `click` | Click an element | `--selector` | `--action=click --selector="button.submit"` |
| `type` | Type text into a field | `--selector`, `--text` | `--action=type --selector="#search" --text="hello"` |
| `read` | Read text content | *(Optional: `--selector`)* | `--action=read` (reads body) or `--action=read --selector="h1"` |
| `screenshot` | Take a screenshot | *(Optional: `--output`)* | `--action=screenshot --output="page.png"` |
| `list_tabs` | List open tabs | None | `--action=list_tabs` |
| `switch_tab` | Focus a specific tab | `--target` (URL fragment) | `--action=switch_tab --target="google"` |
| `evaluate` | Execute JavaScript | `--expression` | `--action=evaluate --expression="document.title"` |

## Examples

**Navigate and Search:**
```bash
node browser-automation/scripts/control_chrome.js --action=navigate --url="https://www.google.com"
node browser-automation/scripts/control_chrome.js --action=type --selector="textarea[name='q']" --text="Gemini CLI"
node browser-automation/scripts/control_chrome.js --action=click --selector="input[name='btnK']"
```

**Take a Screenshot:**
```bash
node browser-automation/scripts/control_chrome.js --action=screenshot --output="search_results.png"
```

**Read Page Title:**
```bash
node browser-automation/scripts/control_chrome.js --action=evaluate --expression="document.title"
```

## Troubleshooting

- **"Error connecting to Chrome"**: Ensure `launch_chrome.sh` has been run and Chrome is actually open.
- **"Node not found"**: Ensure you are using a compatible Node.js version.
- **Port 9222 busy**: Check if another instance of Chrome or another app is using port 9222.
