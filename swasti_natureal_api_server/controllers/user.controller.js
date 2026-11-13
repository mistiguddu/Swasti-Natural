import * as userService from '../services/user.service.js';
import { PERMISSIONS, ROLE_DEFINITIONS } from '../config/roles.js';
import User from '../models/User.js';

export async function list(req, res) {
  res.json({ data: await userService.listUsers(req.query) });
}

export async function get(req, res) {
  res.json({ data: await userService.getUser(req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await userService.createUser(req.validated.body, req.user) });
}

export async function update(req, res) {
  res.json({ data: await userService.updateUser(req.params.id, req.validated.body, req.user) });
}

export async function setStatus(req, res) {
  res.json({ data: await userService.setUserStatus(req.params.id, req.validated.body.isActive, req.user) });
}

export async function remove(req, res) {
  await userService.deleteUser(req.params.id, req.user);
  res.status(204).end();
}

export async function roles(req, res) {
  const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  res.json({
    data: {
      permissions: PERMISSIONS,
      roles: Object.entries(ROLE_DEFINITIONS).map(([key, role]) => ({ key, ...role, users: counts.find((row) => row._id === key)?.count ?? 0 })),
    },
  });
}

export async function listCustomers(req, res) {
  res.json({ data: await userService.listCustomers(req.query) });
}

export async function getCustomer(req, res) {
  res.json({ data: await userService.getCustomer(req.params.id) });
}
