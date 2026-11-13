import http from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { ensureInitialAccounts } from './auth.service.js';

const httpServer = http.createServer(app);

try {
  await connectDatabase(env.mongodbUri, env.mongodbDatabase);
  const seeded = await ensureInitialAccounts(env.initialAccounts);
  for (const { role, email, status } of seeded) {
    if (status === 'created') console.log(`Initial ${role} created: ${email}`);
    if (status === 'password-required') {
      console.warn(`Initial ${role} not created; set ${role.toUpperCase()}_PASSWORD (8+ characters) in .env.`);
    }
    if (status === 'account-conflict') {
      console.warn(`${email} already exists with a different role; no role or password was changed.`);
    }
  }
  httpServer.listen(env.port, () => {
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });
} catch (error) {
  console.error('Server startup failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  if (httpServer.listening) {
    httpServer.close(async (error) => {
      if (error) console.error('HTTP server shutdown failed:', error.message);
      await mongoose.disconnect();
      process.exitCode = error ? 1 : 0;
    });
  } else {
    await mongoose.disconnect();
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));