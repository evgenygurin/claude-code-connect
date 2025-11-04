# Claude Code CLI Installation Troubleshooting Guide

## Common Installation Errors and Solutions

This guide addresses common issues encountered when installing Claude Code CLI.

## Error 1: macOS Version Too Old

### Error Message

```text
Error: This software does not run on macOS versions older than Big Sur.
```

### Cause

Claude Code CLI requires macOS 10.15 (Catalina) or later for Homebrew installation, and macOS 11.0 (Big Sur) or later for optimal compatibility.

### Solutions

#### Option A: Upgrade macOS (Recommended)

If possible, upgrade your macOS to Big Sur (11.0) or later:

1. Check your Mac compatibility at [Apple Support](https://support.apple.com/en-us/102861)
2. Backup your data using Time Machine
3. Install macOS Big Sur or later from System Preferences → Software Update

#### Option B: Use npm Installation (Legacy Method)

If you cannot upgrade macOS but have Node.js 18.0+, use npm installation:

```bash
# Check Node.js version (must be 18.0+)
node --version

# Install Claude Code via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

**Important Notes:**

- Do **NOT** use `sudo npm install -g` (causes permission issues)
- npm method is legacy and may have limited features
- Requires Node.js 18.0 or higher

#### Option C: Manual Binary Installation

Download and install the native binary manually:

1. Visit the Claude Code releases page or documentation
2. Download the binary for your macOS version
3. Move to `/usr/local/bin` or add to PATH
4. Make executable: `chmod +x /path/to/claude`

## Error 2: Install Script Returns HTML

### Error Message

```bash
curl -fsSL https://claude.ai/install.sh | bash
# bash: line 1: syntax error near unexpected token `<'
# bash: line 1: `<!DOCTYPE html>...
```

### Cause

This error occurs when:

1. **Geo-restriction**: Claude Code may not be available in your region
2. **URL redirect**: The URL redirects to a web page instead of serving a bash script
3. **Network issue**: Proxy, VPN, or firewall blocking the request

### Solutions

#### Solution 1: Check Region Availability

Claude Code may have geographic restrictions. Check if Claude services are available in your region:

```bash
# Test URL accessibility
curl -I https://claude.ai/install.sh

# If you see "HTTP/2 302" or HTML content, the service may be geo-restricted
```

If geo-restricted, consider:

- Using a VPN to a supported region (US, Europe, etc.)
- Checking [Claude's regional availability](https://www.claude.com/app-unavailable-in-region)

#### Solution 2: Use Alternative Installation Method

Try the PowerShell method (if on Windows with WSL) or npm installation:

```bash
# npm installation (cross-platform)
npm install -g @anthropic-ai/claude-code
```

#### Solution 3: Verify Network Configuration

If behind a corporate proxy or firewall:

```bash
# Test with verbose output
curl -v https://claude.ai/install.sh

# Check if proxy is interfering
echo $http_proxy
echo $https_proxy

# Try without proxy temporarily
unset http_proxy https_proxy
curl -fsSL https://claude.ai/install.sh | bash
```

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **macOS** | 10.15+ (Catalina) for npm, 11.0+ (Big Sur) for Homebrew |
| **Linux** | Ubuntu 20.04+, Debian 10+, Alpine (native builds) |
| **Windows** | Windows 10+ (via WSL, Git Bash, or PowerShell) |
| **RAM** | 4GB minimum (8GB recommended) |
| **Node.js** | 18.0+ (only for npm installation) |
| **Internet** | Active connection required |

### Platform-Specific Notes

#### macOS

- Homebrew installation requires macOS Big Sur (11.0+)
- npm installation works on macOS Catalina (10.15+)
- Native binary requires macOS 10.15+

#### Linux

- Ubuntu 20.04+ or Debian 10+ recommended
- Alpine Linux supported for native builds
- Requires curl or wget for installation

#### Windows

- WSL (Windows Subsystem for Linux) recommended
- Git Bash alternative for bash script execution
- PowerShell native installation available

## Installation Methods Comparison

### Method 1: Native Binary (Recommended)

**Pros:**

- No Node.js required
- Auto-updates built-in
- Better performance
- Smaller footprint

**Cons:**

- Requires modern OS version
- May have regional restrictions

**Installation:**

```bash
# macOS, Linux, WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex
```

### Method 2: npm Installation (Legacy)

**Pros:**

- Works on older systems
- Cross-platform compatibility
- No geo-restrictions

**Cons:**

- Requires Node.js 18+
- Manual updates needed
- Larger installation size

**Installation:**

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### Method 3: Homebrew (macOS)

**Pros:**

- Easy package management
- Automatic dependency resolution
- Familiar for Mac users

**Cons:**

- Requires macOS Big Sur (11.0+)
- Auto-updates may conflict with brew

**Installation:**

```bash
brew install claude

# Disable auto-updater if needed
export DISABLE_AUTOUPDATER=true
```

## Verification Steps

After installation, verify Claude Code is working:

```bash
# Check version
claude --version

# Check installation path
which claude

# Test basic functionality
claude --help

# Login to Claude (requires authentication)
claude auth login
```

## Common Post-Installation Issues

### Issue: Command Not Found

```bash
# Check if installed via npm
npm list -g @anthropic-ai/claude-code

# Add to PATH if needed
export PATH="$PATH:$HOME/.npm-global/bin"

# Or for Homebrew
export PATH="/usr/local/bin:$PATH"
```

### Issue: Permission Denied

```bash
# Fix npm global permissions (NOT using sudo)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall without sudo
npm install -g @anthropic-ai/claude-code
```

### Issue: Authentication Failure

```bash
# Clear existing credentials
claude auth logout

# Login again
claude auth login

# Verify authentication
claude auth status
```

## Migration from npm to Native Binary

If you have Claude Code installed via npm and want to migrate:

```bash
# Run migration command
claude install

# This will:
# 1. Download native binary
# 2. Migrate configuration
# 3. Preserve authentication
# 4. Update PATH
```

## Getting Help

If none of these solutions work:

1. **Check System Requirements**: Ensure your OS meets minimum requirements
2. **Review Error Logs**: Run with `--verbose` flag for detailed errors
3. **Check Regional Availability**: Verify Claude Code is available in your region
4. **Use Alternative Method**: Try npm installation if native fails
5. **Contact Support**: File an issue on [GitHub Issues](https://github.com/anthropics/claude-code/issues)

## Quick Reference

### Installation Command Matrix

| Platform | Method | Command |
|----------|--------|---------|
| macOS Big Sur+ | Homebrew | `brew install claude` |
| macOS Catalina+ | npm | `npm install -g @anthropic-ai/claude-code` |
| macOS/Linux/WSL | Native | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Windows PowerShell | Native | `irm https://claude.ai/install.ps1 \| iex` |
| Any with Node 18+ | npm | `npm install -g @anthropic-ai/claude-code` |

### Troubleshooting Checklist

- [ ] OS version meets minimum requirements (macOS 10.15+, Big Sur 11+ for brew)
- [ ] Internet connection is active and not blocked
- [ ] Region has access to Claude Code services
- [ ] Node.js 18+ installed (for npm method)
- [ ] Not using `sudo` with npm install
- [ ] PATH includes installation directory
- [ ] No proxy/firewall blocking installation
- [ ] Sufficient disk space for installation

## Related Documentation

- [Claude Code Setup Guide](https://docs.claude.com/en/docs/claude-code/setup)
- [Linear Integration Quick Start](./QUICK-START-GUIDE.md)
- [Webhook Configuration](./LINEAR-WEBHOOK-SETUP.md)

---

**Last Updated**: 2025-11-04

**Note**: This guide is specifically for installing Claude Code CLI, which is separate from the Claude Code + Linear integration project itself. Once Claude Code CLI is installed, you can proceed with setting up the Linear integration.
