import * as productService from '../services/product.service.js';

export async function list(req, res) {
  res.json({ data: await productService.listProducts(req.query) });
}

export async function get(req, res) {
  res.json({ data: await productService.getProduct(req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await productService.createProduct(req.validated.body, req.files, req.user) });
}

export async function update(req, res) {
  res.json({ data: await productService.updateProduct(req.params.id, req.validated.body, req.files, req.user) });
}

export async function duplicate(req, res) {
  res.status(201).json({ data: await productService.duplicateProduct(req.params.id, req.user) });
}

export async function setStatus(req, res) {
  res.json({ data: await productService.setProductFields(req.params.id, { status: req.validated.body.status }) });
}

export async function setFeatured(req, res) {
  res.json({ data: await productService.setProductFields(req.params.id, { isFeatured: req.validated.body.isFeatured }) });
}

export async function updateStock(req, res) {
  res.json({ data: await productService.updateStock(req.params.id, req.validated.body, req.user) });
}

export async function remove(req, res) {
  await productService.deleteProduct(req.params.id, req.user);
  res.status(204).end();
}

export async function bulkDelete(req, res) {
  res.json({ data: await productService.bulkDeleteProducts(req.validated.body.ids, req.user) });
}

export async function bulkStatus(req, res) {
  res.json({ data: await productService.bulkProductStatus(req.validated.body.ids, req.validated.body.status) });
}

export async function bulkCategory(req, res) {
  const { ids, category, subcategory } = req.validated.body;
  res.json({ data: await productService.bulkProductCategory(ids, category, subcategory) });
}

export async function inventory(req, res) {
  res.json({ data: await productService.inventorySummary() });
}
