import bcrypt from 'bcrypt';
import User from './models/User.js';
import AppError from './utils/AppError.js';
import { createAccessToken } from './utils/jwt.js';
import { notify } from './services/notification.service.js';

const SALT_ROUNDS = 12;

export async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) throw new AppError('Email is already registered', 409);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email: normalizedEmail, passwordHash });
  await notify({ type: 'customer.registered', title: 'New customer registered', message: `${user.name} (${user.email})`, link: `/customers/${user.id}` });
  return { user, accessToken: createAccessToken(user) };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Email or password is incorrect', 401);
  }
  user.lastLoginAt = new Date();
  await user.save();
  return { user, accessToken: createAccessToken(user) };
}

export async function updateProfile(user, { name, phone, address }) {
  user.set({ name, phone, ...(address ? { address: { ...user.address?.toObject?.(), ...address } } : {}) });
  await user.save();
  return user;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }
  if (currentPassword === newPassword) throw new AppError('Choose a password different from the current one', 400);
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

const SEED_PASSWORD_MIN_LENGTH = 8;

// Creates a seeded account (superadmin/admin) if its email is not registered yet.
// Never changes the role or password of an existing account.
export async function ensureInitialAccount({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select('role');
  if (existingUser) return existingUser.role === role ? 'already-exists' : 'account-conflict';
  if (!password || password.length < SEED_PASSWORD_MIN_LENGTH) return 'password-required';

  try {
    await User.create({
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      role,
    });
    return 'created';
  } catch (error) {
    if (error.code === 11000) return 'already-exists';
    throw error;
  }
}

export async function ensureInitialAccounts(accounts) {
  const results = [];
  for (const account of accounts) {
    results.push({ ...account, status: await ensureInitialAccount(account) });
  }
  return results;
}