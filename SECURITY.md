# Security Workflow

This document outlines the security practices and tools integrated into this project.

## NPM Audit Integration

### Available Scripts

Both frontend and backend projects include the following security-related scripts:

```bash
# Basic audit - shows all vulnerabilities
npm run audit

# Automatically fix vulnerabilities where possible
npm run audit:fix

# Force fix vulnerabilities (use with caution)
npm run audit:force

# Security check with moderate+ severity threshold
npm run security

# Full verification including security checks
npm run verify
```

### Audit Levels

- `info`: Informational vulnerabilities
- `low`: Low severity vulnerabilities
- `moderate`: Moderate severity vulnerabilities (our threshold)
- `high`: High severity vulnerabilities
- `critical`: Critical severity vulnerabilities

### Workflow Integration

The `npm run verify` command now includes security checks and will fail if:
- Any moderate+ severity vulnerabilities are found
- Build fails
- Linting fails
- Tests fail