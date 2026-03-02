# Shashclaw Security Guide

This document outlines the security architecture, best practices, and threat mitigation strategies implemented in Shashclaw. It is intended for developers, operators, and security teams deploying or extending the platform.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Credential Management](#credential-management)
3. [Authentication & Authorization](#authentication--authorization)
4. [Container Isolation](#container-isolation)
5. [Audit Logging](#audit-logging)
6. [Rate Limiting](#rate-limiting)
7. [API Security](#api-security)
8. [Data Protection](#data-protection)
9. [Deployment Security](#deployment-security)
10. [Incident Response](#incident-response)

## Security Architecture

Shashclaw implements a **defense-in-depth** security model inspired by NanoClaw's principles. Multiple layers of security controls work together to protect agents, credentials, and user data.

### Core Principles

**Least Privilege** — Each agent runs with the minimum permissions required for its specific tasks. Directory access is explicitly mounted, and skill execution is sandboxed.

**Defense in Depth** — Security is implemented at multiple layers: authentication, authorization, encryption, audit logging, rate limiting, and container isolation.

**Zero Trust** — All requests are authenticated and authorized, regardless of origin. No implicit trust is granted based on network location or previous authentication.

**Audit Everything** — All actions that affect system state are logged with full traceability, including who performed the action, when, and what changed.

## Credential Management

### Encryption at Rest

All sensitive credentials (API keys, OAuth tokens, webhook URLs) are encrypted at rest using **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode). This provides both confidentiality and integrity protection.

**Encryption Implementation:**

```typescript
// Credentials are encrypted before storage
const encryptedKey = encryptCredential(apiKey);
await db.insert(llmConfigs).values({
  apiKey: encryptedKey,  // Stored encrypted
  // ... other fields
});

// Decryption happens only when needed
const decryptedKey = decryptCredential(config.apiKey);
```

**Key Management:**

- Encryption keys are derived from the `JWT_SECRET` environment variable
- Keys are never logged or exposed in error messages
- Decryption happens only in memory, never persisted to disk
- Encrypted values are salted with random IVs to prevent pattern analysis

### Credential Access Control

Credentials are strictly scoped to their owner:

- **User Credentials** — LLM configs and service integrations are accessible only to the user who created them
- **Database Queries** — All credential queries include `userId` filters to prevent cross-user access
- **Error Messages** — Decrypted credentials are never included in error responses or logs

### Credential Rotation

To rotate credentials without downtime:

1. Create a new integration/configuration with the updated API key
2. Update agents to use the new configuration
3. Delete the old configuration
4. Encrypted values are securely wiped from the database

### Secret Scanning

When deploying to production:

1. **Scan repositories** — Use tools like `git-secrets` or `truffleHog` to detect accidentally committed secrets
2. **Rotate all secrets** — Assume any exposed secret is compromised
3. **Monitor logs** — Ensure logs never contain plaintext credentials
4. **Use environment variables** — Never hardcode secrets in code

## Authentication & Authorization

### Custom Authentication

Shashclaw implements a custom email-based authentication system that works independently of external OAuth providers. This approach:

- Eliminates redirect URI mismatches and OAuth configuration issues
- Provides full control over the authentication flow
- Enables offline operation and self-hosted deployments
- Supports token-based verification for testing

**Authentication Flow:**

1. User submits email via `/api/auth/login`
2. Server generates a secure token and stores it with an expiration time
3. Token is returned to client (in production, send via email)
4. Client submits token via `/api/auth/verify-token`
5. Server validates token and creates session cookie
6. Session cookie is HTTP-only, secure, and SameSite-strict

### Authorization Levels

**Public Procedures** — Accessible without authentication (login page, health checks)

**Protected Procedures** — Require valid session (dashboard, agents, integrations)

**Admin Procedures** — Require admin role (platform configuration, user management)

```typescript
// Protected procedure example
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx });
});

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

### Session Management

Sessions are managed via HTTP-only cookies with the following properties:

| Property | Value | Reason |
|----------|-------|--------|
| **HttpOnly** | true | Prevents XSS attacks from stealing cookies |
| **Secure** | true | Only transmitted over HTTPS |
| **SameSite** | Strict | Prevents CSRF attacks |
| **Path** | / | Cookie is available site-wide |
| **MaxAge** | 7 days | Sessions expire after 7 days of inactivity |

## Container Isolation

### Agent Sandboxing

Each agent runs in an isolated environment with explicit security boundaries:

**Directory Mounting** — Agents can only access explicitly mounted directories. All other filesystem access is denied.

**Permission Controls** — Each agent has a permissions object defining:
- Allowed directories (read/write/execute)
- Allowed skills and tools
- Resource limits (CPU, memory, disk)
- Network access restrictions

**Example Agent Configuration:**

```json
{
  "name": "file-processor",
  "mountedDirs": [
    { "path": "/data/input", "access": "read" },
    { "path": "/data/output", "access": "write" }
  ],
  "permissions": {
    "skills": ["file-reader", "text-processor"],
    "network": false,
    "maxMemory": "512MB",
    "maxCpuTime": "60s"
  }
}
```

### Skill Sandboxing

Skills execute in isolated processes with:

- **Resource Limits** — CPU, memory, and disk quotas prevent resource exhaustion
- **Timeout Protection** — Long-running skills are automatically terminated
- **Input Validation** — All skill inputs are validated before execution
- **Output Sanitization** — Skill outputs are sanitized before storage or transmission

## Audit Logging

### Logged Events

All security-relevant events are logged with full context:

| Event Type | Details Logged |
|-----------|-----------------|
| **Authentication** | Login attempts, token generation, session creation |
| **Authorization** | Permission checks, access denials |
| **Agent Lifecycle** | Creation, updates, deletion, execution |
| **Skill Management** | Installation, uninstallation, execution |
| **Integration Changes** | Creation, updates, deletion, test results |
| **Configuration Changes** | LLM provider changes, security settings |
| **Data Access** | File access, credential retrieval |
| **Errors** | All errors with stack traces (no sensitive data) |

### Audit Log Schema

Each audit log entry contains:

```typescript
{
  id: number;
  userId: number;
  agentId?: number;
  action: string;           // e.g., "agent.created", "llm.tested"
  category: string;         // "agent", "skill", "system", "security"
  severity: "info" | "warning" | "error" | "critical";
  details: Record<string, any>;  // Action-specific details
  ipAddress?: string;       // Client IP (when available)
  userAgent?: string;       // Browser/client info
  createdAt: Date;
}
```

### Log Retention

- **Development** — Logs retained for 30 days
- **Production** — Logs retained for 90 days
- **Compliance** — Logs archived for 1 year for regulatory compliance
- **Secure Deletion** — Logs are securely wiped using cryptographic erasure

### Log Access Control

- Logs are accessible only to the user who performed the action or admins
- Bulk log exports require admin privileges
- Log queries are rate-limited to prevent information disclosure attacks

## Rate Limiting

### Rate Limit Tiers

Shashclaw implements tiered rate limiting to protect against abuse:

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| **Integration API** | 10 req/min | Per integration | Prevent brute-force credential testing |
| **LLM API** | 100 req/min | Per user | Prevent token exhaustion attacks |
| **Webhook Delivery** | 50 req/min | Per webhook | Prevent webhook flooding |
| **Agent Execution** | 5 concurrent | Per user | Prevent resource exhaustion |

### Rate Limit Headers

Rate limit information is returned in HTTP headers:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000000
Retry-After: 45
```

### Bypass Mechanisms

- **Admin Bypass** — Admins can reset rate limits for specific users
- **Whitelist** — Trusted services can be whitelisted for higher limits
- **Gradual Backoff** — Clients should implement exponential backoff when rate-limited

## API Security

### Input Validation

All API inputs are validated using Zod schemas:

```typescript
// Example: LLM configuration validation
const llmCreateSchema = z.object({
  name: z.string().min(1).max(255),
  provider: z.enum(["openai", "anthropic", "custom", "manus"]),
  model: z.string().min(1).max(255),
  apiKey: z.string().optional(),
  apiUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
});
```

**Validation Rules:**

- **Type Checking** — All inputs are validated against expected types
- **Length Limits** — Strings have maximum length constraints
- **Format Validation** — URLs, emails, and other formats are validated
- **Enum Validation** — Only allowed values are accepted
- **Sanitization** — Inputs are sanitized to prevent injection attacks

### Error Handling

Error responses never expose sensitive information:

```typescript
// ❌ Bad: Exposes internal details
throw new Error(`Failed to connect to API: ${apiKey}`);

// ✅ Good: Generic error message
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Failed to connect to external service',
});
```

### CORS Configuration

CORS is configured to allow only trusted origins:

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://shashclaw.manus.space'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

## Data Protection

### In-Transit Encryption

- **HTTPS Only** — All traffic is encrypted with TLS 1.2+
- **Certificate Pinning** — Production deployments should implement certificate pinning
- **HSTS** — Strict-Transport-Security header enforces HTTPS

### At-Rest Encryption

- **Database Encryption** — Sensitive fields are encrypted with AES-256-GCM
- **File Storage** — Files in S3 are encrypted with server-side encryption
- **Backup Encryption** — Database backups are encrypted before storage

### Data Retention

- **Agent Data** — Retained for 90 days after agent deletion
- **Audit Logs** — Retained for 90 days (1 year for compliance)
- **User Data** — Deleted immediately upon account deletion
- **Temporary Files** — Cleaned up within 24 hours

### Data Minimization

- Only necessary data is collected
- Personally identifiable information (PII) is minimized
- Aggregated metrics are used instead of individual tracking

## Deployment Security

### Environment Variables

All secrets must be provided via environment variables:

```bash
# Required secrets
JWT_SECRET=<random-256-bit-key>
DATABASE_URL=mysql://user:pass@host/db
VITE_APP_ID=<manus-app-id>

# Optional: Custom LLM providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=claude-...

# Optional: Service integrations
SLACK_BOT_TOKEN=xoxb-...
DISCORD_BOT_TOKEN=...
```

**Secret Generation:**

```bash
# Generate a secure JWT secret
openssl rand -base64 32
```

### Network Security

**Firewall Rules:**

- Only expose HTTPS (port 443) to the internet
- Database access is restricted to application servers
- Redis/cache access is restricted to application servers
- Outbound traffic is restricted to necessary services only

**DDoS Protection:**

- Use a CDN with DDoS protection (Cloudflare, AWS Shield)
- Implement rate limiting at the edge
- Monitor traffic patterns for anomalies

### Container Security

When deploying with Docker:

```dockerfile
# Run as non-root user
RUN useradd -m -u 1000 appuser
USER appuser

# Use read-only filesystem where possible
RUN --mount=type=tmpfs,target=/tmp

# Scan for vulnerabilities
RUN trivy image --severity HIGH,CRITICAL .
```

### Database Security

- **Principle of Least Privilege** — Database user has only necessary permissions
- **Connection Encryption** — Database connections use SSL/TLS
- **Backup Encryption** — Backups are encrypted and stored securely
- **Access Logging** — All database access is logged

## Incident Response

### Security Incident Procedure

**1. Detection & Assessment**

- Monitor logs for suspicious patterns
- Set up alerts for failed authentication attempts
- Track rate limit violations

**2. Containment**

- Revoke compromised credentials immediately
- Disable affected user accounts if necessary
- Block suspicious IP addresses

**3. Investigation**

- Review audit logs for the incident timeline
- Identify affected users and data
- Determine root cause

**4. Remediation**

- Patch vulnerabilities
- Rotate all affected credentials
- Update security policies

**5. Communication**

- Notify affected users
- Document the incident
- Share lessons learned

### Vulnerability Disclosure

If you discover a security vulnerability:

1. **Do not** disclose it publicly
2. Email security@manus.im with details
3. Include proof-of-concept if possible
4. Allow 90 days for a fix before public disclosure

### Security Updates

- Monitor security advisories for dependencies
- Apply security patches within 24 hours
- Test patches in staging before production
- Document all security updates

## Compliance

Shashclaw is designed to support compliance with:

- **GDPR** — Data minimization, encryption, audit logging
- **HIPAA** — Encryption, access controls, audit trails
- **SOC 2** — Security monitoring, incident response, change management
- **ISO 27001** — Information security management system

## References

For more information on security best practices, see:

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-01 | Initial security documentation |

---

**Last Updated:** 2026-03-01  
**Maintained By:** Manus Security Team  
**Review Frequency:** Quarterly
