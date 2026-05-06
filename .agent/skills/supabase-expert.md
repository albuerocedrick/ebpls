---
name: ebpls-supabase
description: Defines strict database rules for the eBPLS PostgreSQL/Supabase backend. Use this skill when configuring the 3NF schema, Row Level Security, Storage buckets, and Audit Logs.
---

# Supabase Architecture & Security Rules
* **Normalized Schema:** All tables must follow Third Normal Form (3NF)[cite: 2]. Use UUIDs generated server-side for primary keys[cite: 2].
* **Storage Security:** Document uploads must be secured in Supabase Storage and accessed strictly via Pre-Signed URLs with a 15-minute expiry[cite: 2].
* **Row Level Security (RLS):** ALL tables must have RLS explicitly enabled. Policies must strictly check the user's UUID or role before granting access.
* **Audit Logging:** To comply with the Data Privacy Act of 2012, every significant mutation (Application submission, payment, permit generation) must trigger an insert into the `audit_logs` table containing `old_value` and `new_value` JSONB snapshots[cite: 2].
* **Authentication Links:** The `users` table `user_id` must strictly reference `auth.users(id)`[cite: 2]. Use database triggers to automatically insert a new row into `public.users` upon signup.
* **Migration Files:** All database schema changes, table creations, and RLS policy updates must be written as formal SQL migration files. Do not suggest manual dashboard changes.