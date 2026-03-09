# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

📧 **Email:** hawthornhollows@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Scope

This package interacts with on-chain smart contracts. Security concerns include:
- ABI encoding/decoding correctness
- Transaction parameter validation
- Private key handling (delegated to ethers.js Signer)

## Disclaimer

> **⚠️ Pre-release software — no formal security audit has been conducted.**
