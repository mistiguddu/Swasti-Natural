import * as orderService from '../services/order.service.js';

export async function list(req, res) {
  res.json({ data: await orderService.listOrders(req.query) });
}

export async function get(req, res) {
  const order = await orderService.getOrder(req.params.id);
  res.json({ data: { ...order.toJSON(), allowedStatuses: orderService.STATUS_TRANSITIONS[order.status] } });
}

export async function create(req, res) {
  res.status(201).json({ data: await orderService.createOrder(req.validated.body, req.user) });
}

export async function updateStatus(req, res) {
  res.json({ data: await orderService.updateOrderStatus(req.params.id, req.validated.body, req.user) });
}

export async function updatePayment(req, res) {
  res.json({ data: await orderService.updateOrderPayment(req.params.id, req.validated.body, req.user) });
}
