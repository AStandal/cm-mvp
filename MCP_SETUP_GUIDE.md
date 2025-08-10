# Playwright MCP Setup Guide

This guide will help your team set up and use the Playwright MCP (Model Context Protocol) server for browser automation and testing.

## 🎯 What is Playwright MCP?

Playwright MCP provides AI-powered browser automation tools that can:
- Fill out forms automatically
- Take screenshots
- Navigate between pages
- Extract data from web pages
- Test user interactions
- Monitor network requests
- And much more!

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Cursor IDE** (or VS Code with MCP support)
3. **Git** access to this repository

## 🚀 Setup Instructions

### Step 1: Install Playwright MCP Server

```bash
npm install -g @playwright/mcp
```

### Step 2: Configure MCP in Cursor

1. Open Cursor IDE
2. Go to **Settings** → **MCP** → **Add new MCP Server**
3. Configure with these settings:
   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "npx",
         "args": [
           "@playwright/mcp@latest"
         ]
       }
     }
   }
   ```

### Step 3: Start the Development Server

```bash
# From the project root
npm run dev:frontend
```

The frontend will be available at `http://localhost:3002`

## 🧪 Testing the Setup

### Test 1: Basic Navigation
Ask the AI: "Navigate to the NewCase page and take a screenshot"

### Test 2: Form Automation
Ask the AI: "Fill out the NewCase form with sample data"

### Test 3: Data Extraction
Ask the AI: "Extract all form fields and their values from the current page"

## 🛠️ Available MCP Tools

The Playwright MCP server provides these tools:

### Navigation
- `mcp_playwright_browser_navigate` - Navigate to URLs
- `mcp_playwright_browser_navigate_back` - Go back
- `mcp_playwright_browser_navigate_forward` - Go forward

### Interaction
- `mcp_playwright_browser_click` - Click elements
- `mcp_playwright_browser_type` - Type text
- `mcp_playwright_browser_select_option` - Select dropdown options
- `mcp_playwright_browser_hover` - Hover over elements
- `mcp_playwright_browser_press_key` - Press keyboard keys

### Screenshots & Media
- `mcp_playwright_browser_take_screenshot` - Take screenshots
- `mcp_playwright_browser_snapshot` - Get accessibility snapshot

### Data & Analysis
- `mcp_playwright_browser_evaluate` - Run JavaScript on the page
- `mcp_playwright_browser_network_requests` - Monitor network requests
- `mcp_playwright_browser_console_messages` - Get console messages

### File Operations
- `mcp_playwright_browser_file_upload` - Upload files

## 📁 Project Structure

```
cm-mvp/
├── frontend/                 # React frontend
│   ├── e2e/                 # Playwright E2E tests
│   │   └── smoke.spec.ts    # Basic smoke test
│   └── playwright.config.ts # Playwright configuration
├── mcp/
│   └── playwright-mcp/      # Custom MCP server (optional)
└── MCP_SETUP_GUIDE.md       # This guide
```

## 🔧 Troubleshooting

### Issue: MCP Server Not Starting
```bash
# Check if the server is installed
npx @playwright/mcp --help

# Reinstall if needed
npm uninstall -g @playwright/mcp
npm install -g @playwright/mcp@latest
```

### Issue: Frontend Not Loading
```bash
# Check if the server is running
netstat -an | findstr :3002

# Restart the development server
npm run dev:frontend
```

### Issue: MCP Tools Not Available
1. Restart Cursor IDE
2. Check MCP configuration in settings
3. Verify the server is running: `npx @playwright/mcp --help`

## 🎯 Use Cases for Your Team

### 1. Automated Testing
- "Test the NewCase form validation"
- "Verify all required fields are marked with asterisks"
- "Test the AI analysis feature"

### 2. Data Entry Automation
- "Fill out the form with test data"
- "Submit multiple test applications"
- "Validate form submission workflow"

### 3. UI Testing
- "Take screenshots of all pages"
- "Test responsive design on different viewport sizes"
- "Verify accessibility features"

### 4. Performance Testing
- "Monitor network requests during form submission"
- "Check page load times"
- "Analyze console errors"

## 📚 Additional Resources

- [Playwright MCP Documentation](https://playwright.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor MCP Setup](https://code.visualstudio.com/mcp)

## 🤝 Team Collaboration

### Best Practices
1. **Document Test Scenarios**: Create test cases for new features
2. **Share Screenshots**: Use MCP for visual documentation
3. **Automate Repetitive Tasks**: Use MCP for data entry and validation
4. **Monitor Performance**: Use network and console monitoring

### Common Commands
```bash
# Start development environment
npm run dev:frontend

# Run E2E tests
cd frontend && npm run e2e

# Install dependencies
npm run install:all
```

## 🎉 You're Ready!

Once you've completed this setup, you can ask the AI to:
- "Help me test the new feature"
- "Take a screenshot of the current page"
- "Fill out this form with sample data"
- "Check for console errors"
- "Monitor network requests"

The AI will use the Playwright MCP tools to automate these tasks for you!
