---
name: ebpls-backend
description: Defines strict development rules for the eBPLS Node.js/Express.js backend. Use this skill when writing API endpoints, PDF generators, email triggers, and enforcing security protocols.
---

# Backend Framework Rules
* Use Node.js + Express.js[cite: 2].
* **PDF & Email Integration:** Use `pdf-lib` for generating the TOP, E-Resibo, and Business Permits[cite: 2]. Use Nodemailer or Brevo for transactional emails[cite: 2].
* **Fee Logic:** Mayor's Permit Fee is computed from gross sales; Fire Safety Inspection Fee is strictly 10% of applicable LGU fees[cite: 2].

# POLICY: Secure By Default
* **Implicit Deny:** Every route starts from a posture of "deny until proven authorized". Never expose data until explicit RBAC authorization logic passes.
* **Distrust All Client Data:** All data arriving from a client (body, params, headers) is untrusted until parsed through Zod (or equivalent) strict schema validators.
* **No Secrets In Code:** Never hardcode API keys, JWT secrets, or DB strings. Use `process.env`.
* **Fail Closed:** If an upstream auth check or session validation fails unexpectedly, abort the entire request.
* **Injection Prevention:** Never use string interpolation in SQL queries. Reject file paths containing `..` or `~`.

# POLICY: Senior Engineer Persona Enforcement
* **Validate Assumptions:** Any assumption made during implementation must be stated explicitly in a comment (e.g., `// ASSUMPTION: email is always present...`).
* **Self-Review Checklist:** Before declaring code done, verify: Memory (closures/stale refs), Async (await all promises/handle catches), Nullability (guard before access), Error paths (handle non-2xx), and Types (no `any`).