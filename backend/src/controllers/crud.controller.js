const { ok, fail } = require('../utils/response');

function crudController(service, options = {}) {
  const searchColumns = options.searchColumns || [];
  const sortColumns = options.sortColumns || ['id'];
  const dateField = options.dateField || '';

  return {
    async list(req, res) {
      const data = await service.list({ ...req.query, searchColumns, sortColumns, dateField });
      return ok(res, data, 'Records fetched');
    },

    async get(req, res) {
      const row = await service.getById(req.params.id);
      if (!row) return fail(res, 404, 'Record not found');
      return ok(res, row, 'Record fetched');
    },

    async create(req, res) {
      const row = await service.create(req.body);
      return ok(res, row, 'Record created', 201);
    },

    async update(req, res) {
      const row = await service.update(req.params.id, req.body);
      if (!row) return fail(res, 404, 'Record not found');
      return ok(res, row, 'Record updated');
    },

    async remove(req, res) {
      const removed = await service.remove(req.params.id);
      if (!removed) return fail(res, 404, 'Record not found');
      return ok(res, { id: Number(req.params.id) }, 'Record deleted');
    }
  };
}

module.exports = crudController;
