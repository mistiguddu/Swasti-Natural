import * as categoryService from '../services/category.service.js';
import * as productService from '../services/product.service.js';

export async function list(req, res) {
  res.json({ data: await categoryService.listCategories(req.query) });
}

export async function get(req, res) {
  res.json({ data: await categoryService.getCategory(req.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await categoryService.createCategory(req.validated.body, req.files, req.user) });
}

export async function update(req, res) {
  res.json({ data: await categoryService.updateCategory(req.params.id, req.validated.body, req.files) });
}

export async function setStatus(req, res) {
  const { status } = req.validated.body;
  if (!['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: { message: 'Status must be active or inactive' } });
    return;
  }
  res.json({ data: await categoryService.setCategoryFields(req.params.id, { status }) });
}

export async function setFeatured(req, res) {
  res.json({ data: await categoryService.setCategoryFields(req.params.id, { isFeatured: req.validated.body.isFeatured }) });
}

export async function remove(req, res) {
  await categoryService.deleteCategory(req.params.id, req.user);
  res.status(204).end();
}

export async function bulkDelete(req, res) {
  res.json({ data: await categoryService.bulkDeleteCategories(req.validated.body.ids, req.user) });
}

export async function bulkStatus(req, res) {
  res.json({ data: await categoryService.bulkCategoryStatus(req.validated.body.ids, req.validated.body.status) });
}

export async function products(req, res) {
  res.json({ data: await productService.listCategoryProducts(req.params.categoryId, req.query) });
}
