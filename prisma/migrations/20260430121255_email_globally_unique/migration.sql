-- Drop the per-tenant unique constraint and the secondary email index.
-- The new global email unique constraint subsumes both.
DROP INDEX `users_tenantId_email_key` ON `users`;
DROP INDEX `users_email_idx` ON `users`;

-- Add a global unique constraint on email.
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
