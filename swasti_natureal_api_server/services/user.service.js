import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User, { ROLES } from '../models/User.js';
import Order, { NON_REVENUE_STATUS } from '../models/Order.js';
import { Review } from '../models/Marketing.js';
import AppError from '../utils/AppError.js';
import { assertObjectId, paginate, paginationMeta, parseListQuery, searchRegex } from '../utils/query.js';
import { hasPermission } from '../config/roles.js';
import { notify } from './notification.service.js';

const SALT_ROUNDS = 12;

/** Admins may only manage customer accounts; super admins may manage everyone. */
function assertCanManageRole(actor, role) {
  const permission = role === 'user' ? 'users.manage' : 'admins.manage';
  if (!hasPermission(actor, permission)) throw new AppError(`You do not have permission to manage ${role} accounts`, 403);
}

async function assertNotLastSuperadmin(user, change) {
  if (user.role !== 'superadmin' || !user.isActive) return;
  const remaining = await User.countDocuments({ role: 'superadmin', isActive: true, _id: { $ne: user._id } });
  if (!remaining) throw new AppError(`Cannot ${change} the last active super administrator`, 400);
}

function userFilter(query) {
  const filter = {};
  const regex = searchRegex(query.search);
  if (regex) filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  if (query.role === 'staff') filter.role = { $in: ['admin', 'superadmin'] };
  else if (ROLES.includes(query.role)) filter.role = query.role;
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  return filter;
}

export function listUsers(query) {
  const listQuery = parseListQuery(query, { sortable: ['name', 'email', 'role', 'createdAt', 'lastLoginAt'] });
  return paginate(User, userFilter(query), listQuery);
}

export async function getUser(id) {
  assertObjectId(id);
  const user = await User.findById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function createUser(data, actor) {
  assertCanManageRole(actor, data.role);
  if (await User.exists({ email: data.email })) throw new AppError('Email is already registered', 409);
  const { password, ...fields } = data;
  const user = await User.create({ ...fields, passwordHash: await bcrypt.hash(password, SALT_ROUNDS) });
  await notify({ type: 'user.created', title: `${user.role === 'user' ? 'Customer' : 'User'} account created`, message: `${user.name} (${user.email})`, link: `/users/${user.id}`, actor });
  return user;
}

export async function updateUser(id, data, actor) {
  const user = await getUser(id);
  assertCanManageRole(actor, user.role);
  assertCanManageRole(actor, data.role);
  const isSelf = String(user._id) === String(actor._id);
  if (isSelf && data.role !== user.role) throw new AppError('You cannot change your own role', 400);
  if (isSelf && !data.isActive) throw new AppError('You cannot deactivate your own account', 400);
  if (data.role !== user.role) await assertNotLastSuperadmin(user, 'demote');
  if (!data.isActive) await assertNotLastSuperadmin(user, 'deactivate');
  if (data.email !== user.email && await User.exists({ email: data.email, _id: { $ne: user._id } })) {
    throw new AppError('Email is already registered', 409);
  }
  const { password, ...fields } = data;
  user.set(fields);
  if (password) user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await user.save();
  return user;
}

export async function setUserStatus(id, isActive, actor) {
  const user = await getUser(id);
  assertCanManageRole(actor, user.role);
  if (String(user._id) === String(actor._id)) throw new AppError('You cannot change your own status', 400);
  if (!isActive) await assertNotLastSuperadmin(user, 'deactivate');
  user.isActive = isActive;
  await user.save();
  return user;
}

export async function deleteUser(id, actor) {
  const user = await getUser(id);
  assertCanManageRole(actor, user.role);
  if (String(user._id) === String(actor._id)) throw new AppError('You cannot delete your own account', 400);
  await assertNotLastSuperadmin(user, 'delete');
  if (await Order.exists({ customer: user._id })) {
    throw new AppError('This customer has orders. Deactivate the account instead of deleting it.', 409);
  }
  await Review.deleteMany({ customer: user._id });
  await user.deleteOne();
  await notify({ type: 'user.deleted', title: 'Account deleted', message: `${user.name} (${user.email})`, actor });
}

/* ── Customers (users with the `user` role, with order statistics) ── */

const orderStatsLookup = [
  {
    $lookup: {
      from: Order.collection.name,
      let: { userId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$customer', '$$userId'] } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: { $cond: [{ $in: ['$status', NON_REVENUE_STATUS] }, 0, '$grandTotal'] } },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
      ],
      as: 'stats',
    },
  },
  {
    $addFields: {
      totalOrders: { $ifNull: [{ $first: '$stats.totalOrders' }, 0] },
      totalSpent: { $ifNull: [{ $first: '$stats.totalSpent' }, 0] },
      lastOrderAt: { $first: '$stats.lastOrderAt' },
    },
  },
  { $project: { stats: 0, passwordHash: 0, __v: 0 } },
];

export async function listCustomers(query) {
  const listQuery = parseListQuery(query, { sortable: ['name', 'email', 'createdAt', 'totalOrders', 'totalSpent', 'lastOrderAt'] });
  const match = { ...userFilter(query), role: 'user' };
  const [result] = await User.aggregate([
    { $match: match },
    ...orderStatsLookup,
    {
      $facet: {
        items: [{ $sort: listQuery.sort }, { $skip: listQuery.skip }, { $limit: listQuery.limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);
  const items = result.items.map(({ _id, ...rest }) => ({ id: String(_id), _id, ...rest }));
  return { items, pagination: paginationMeta(result.total[0]?.count ?? 0, listQuery.page, listQuery.limit) };
}

export async function getCustomer(id) {
  assertObjectId(id);
  const [customer] = await User.aggregate([{ $match: { _id: new mongoose.Types.ObjectId(id), role: 'user' } }, ...orderStatsLookup]);
  if (!customer) throw new AppError('Customer not found', 404);
  const [recentOrders, statusBreakdown, reviews] = await Promise.all([
    Order.find({ customer: id }).sort({ createdAt: -1 }).limit(10).select('orderNumber status paymentStatus grandTotal currency createdAt items'),
    Order.aggregate([{ $match: { customer: customer._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Review.countDocuments({ customer: id }),
  ]);
  return {
    ...customer,
    id: String(customer._id),
    averageOrderValue: customer.totalOrders ? Math.round((customer.totalSpent / customer.totalOrders) * 100) / 100 : 0,
    recentOrders,
    statusBreakdown: Object.fromEntries(statusBreakdown.map((row) => [row._id, row.count])),
    reviewCount: reviews,
  };
}
