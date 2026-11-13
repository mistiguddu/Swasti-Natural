import mongoose from 'mongoose';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureInitialAccounts } from './auth.service.js';

// Seeds the superadmin and admin accounts configured in .env (same logic as server startup).
try {
  await connectDatabase(env.mongodbUri, env.mongodbDatabase);
  const seeded = await ensureInitialAccounts(env.initialAccounts);
  let failed = false;
  for (const { role, email, status } of seeded) {
    if (status === 'created') console.log(`${role} account created for ${email}`);
    else if (status === 'already-exists') console.log(`${role} account already exists for ${email}`);
    else {
      failed = true;
      console.error(`Cannot create ${role} account for ${email}: ${status}`);
    }
  }
  if (failed) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
