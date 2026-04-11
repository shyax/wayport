# Security Policy

## Reporting a Vulnerability

Wayport manages SSH tunnels and stored connection profiles. We take security seriously.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **shyamsundarv.dev@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce or a proof of concept
- The impact you've identified
- Your suggested fix (if any)

You should receive an acknowledgment within 48 hours. We will work with you to
understand the issue and coordinate a fix before any public disclosure.

## Scope

The following are in scope for security reports:

- Credential or SSH key material exposure
- Unauthorized access to stored tunnel profiles
- Command injection via profile fields or environment variable substitution
- Privilege escalation through the CLI or desktop app
- IPC vulnerabilities in the Tauri backend

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Disclosure Policy

We follow coordinated disclosure. Once a fix is available, we will:

1. Release a patched version
2. Publish a security advisory on GitHub
3. Credit the reporter (unless they prefer anonymity)
