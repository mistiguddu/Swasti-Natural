import { Router } from 'express';
import AppError from './AppError.js';
import { asyncHandler } from './asyncHandler.js';
import { assertObjectId, paginate, parseIdList, parseListQuery, searchRegex } from './query.js';
import { validate } from '../middlewares/validate.middleware.js';
import { bulkIdsSchema, bulkStatusSchema, statusSchema } from '../middlewares/admin-schemas.js';
import { imageUpload, parseMultipartJson, publicPath } from '../config/upload.js';
import { deleteUnusedFiles } from '../services/file.service.js';
import { notify } from '../services/notification.service.js';

/**
 * Builds a list/get/create/update/delete service for simple resources
 * (coupons, discounts, banners, sliders, shipping methods).
 */
export function createCrudService({
  Model, label, searchFields = ['name'], sortable = ['createdAt'], baseFilter = {}, filters = () => ({}),
  populate, imageFolder, uniqueField, notifyType,
}) {
  async function get(id) {
    assertObjectId(id);
    let query = Model.findOne({ _id: id, ...baseFilter });
    for (const item of [].concat(populate ?? [])) query = query.populate(item);
    const document = await query;
    if (!document) throw new AppError(`${label} not found`, 404);
    return document;
  }

  async function assertUnique(data, excludeId) {
    if (!uniqueField || !data[uniqueField]) return;
    const filter = { [uniqueField]: data[uniqueField] };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await Model.exists(filter)) throw new AppError(`${label} "${data[uniqueField]}" already exists`, 409);
  }

  const uploaded = (files) => (imageFolder && files?.image?.[0] ? publicPath(files.image[0], imageFolder) : null);

  return {
    get,
    async list(query) {
      const filter = { ...baseFilter, ...filters(query) };
      const regex = searchRegex(query.search);
      if (regex) filter.$or = searchFields.map((field) => ({ [field]: regex }));
      if (['active', 'inactive'].includes(query.status)) filter.status = query.status;
      const listQuery = parseListQuery(query, { sortable });
      return paginate(Model, filter, listQuery, { populate });
    },
    async create(data, files, actor) {
      await assertUnique(data);
      const { removeImage, ...fields } = data;
      const document = await Model.create({ ...fields, ...baseFilter, ...(imageFolder ? { image: uploaded(files) ?? '' } : {}) });
      if (notifyType) await notify({ type: `${notifyType}.created`, title: `${label} created`, message: document.name ?? document.title ?? document.code, actor });
      return get(document.id);
    },
    async update(id, data, files) {
      const document = await get(id);
      await assertUnique(data, id);
      const { removeImage, ...fields } = data;
      const replaced = [];
      const upload = uploaded(files);
      if (imageFolder && (upload || removeImage)) {
        replaced.push(document.image);
        document.image = upload ?? '';
      }
      document.set(fields);
      await document.save();
      await deleteUnusedFiles(replaced);
      return get(id);
    },
    async setStatus(id, status) {
      const document = await get(id);
      document.status = status;
      await document.save();
      return document;
    },
    async remove(id, actor) {
      const document = await get(id);
      await document.deleteOne();
      if (imageFolder) await deleteUnusedFiles([document.image]);
      if (notifyType) await notify({ type: `${notifyType}.deleted`, title: `${label} deleted`, message: document.name ?? document.title ?? document.code, actor });
    },
    async bulkDelete(ids) {
      const documents = await Model.find({ _id: { $in: parseIdList(ids) }, ...baseFilter });
      for (const document of documents) await document.deleteOne();
      if (imageFolder) await deleteUnusedFiles(documents.map((document) => document.image));
      return { deleted: documents.length };
    },
    async bulkStatus(ids, status) {
      if (!['active', 'inactive'].includes(status)) throw new AppError('Status must be active or inactive', 400);
      const result = await Model.updateMany({ _id: { $in: parseIdList(ids) }, ...baseFilter }, { status });
      return { updated: result.modifiedCount };
    },
  };
}

/** REST router for a createCrudService() service. Mount behind authenticate + requirePermission. */
export function createCrudRouter(service, schema, { imageFolder } = {}) {
  const router = Router();
  const upload = imageFolder ? [imageUpload(imageFolder, [{ name: 'image', maxCount: 1 }]), parseMultipartJson] : [];
  router.get('/', asyncHandler(async (req, res) => res.json({ data: await service.list(req.query) })));
  router.post('/bulk-delete', validate(bulkIdsSchema), asyncHandler(async (req, res) => res.json({ data: await service.bulkDelete(req.validated.body.ids) })));
  router.patch('/bulk-status', validate(bulkStatusSchema), asyncHandler(async (req, res) => {
    res.json({ data: await service.bulkStatus(req.validated.body.ids, req.validated.body.status) });
  }));
  router.post('/', ...upload, validate(schema), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.create(req.validated.body, req.files, req.user) });
  }));
  router.get('/:id', asyncHandler(async (req, res) => res.json({ data: await service.get(req.params.id) })));
  router.put('/:id', ...upload, validate(schema), asyncHandler(async (req, res) => {
    res.json({ data: await service.update(req.params.id, req.validated.body, req.files, req.user) });
  }));
  router.patch('/:id/status', validate(statusSchema), asyncHandler(async (req, res) => {
    res.json({ data: await service.setStatus(req.params.id, req.validated.body.status) });
  }));
  router.delete('/:id', asyncHandler(async (req, res) => {
    await service.remove(req.params.id, req.user);
    res.status(204).end();
  }));
  return router;
}
