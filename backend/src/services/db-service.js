const { pool } = require('../config/db');
const { resolveDateRange } = require('../utils/date-range');

function pick(body, columns) {
  const row = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(body, column)) row[column] = body[column];
  }
  return row;
}

function requireFields(row, fields) {
  const missing = fields.filter((field) => row[field] === undefined || row[field] === null || row[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

function createCrudService(table, columns, required = []) {
  return {
    async list({
      page = 1,
      limit = 25,
      search = '',
      searchColumns = [],
      sortBy = 'id',
      order = 'asc',
      sortColumns = ['id'],
      dateField,
      datePreset,
      dateFrom,
      dateTo
    }) {
      const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
      const safePage = Math.max(Number(page) || 1, 1);
      const offset = (safePage - 1) * safeLimit;
      const values = [];
      const clauses = [];

      const allowedSort = Array.isArray(sortColumns) && sortColumns.length ? sortColumns : ['id'];
      const safeSortBy = allowedSort.indexOf(sortBy) >= 0 ? sortBy : (allowedSort.indexOf('id') >= 0 ? 'id' : allowedSort[0]);
      const safeOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      if (search && searchColumns.length) {
        clauses.push(`(${searchColumns.map((column) => `${column} LIKE ?`).join(' OR ')})`);
        for (let i = 0; i < searchColumns.length; i += 1) values.push(`%${search}%`);
      }

      const range = resolveDateRange(datePreset, dateFrom, dateTo);
      if (dateField && (range.from || range.to)) {
        if (range.from && range.to) {
          clauses.push(`${dateField} BETWEEN ? AND ?`);
          values.push(range.from, range.to);
        } else if (range.from) {
          clauses.push(`${dateField} >= ?`);
          values.push(range.from);
        } else if (range.to) {
          clauses.push(`${dateField} <= ?`);
          values.push(range.to);
        }
      }

      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const [rows] = await pool.query(
        `SELECT * FROM ${table} ${whereSql} ORDER BY ${safeSortBy} ${safeOrder} LIMIT ? OFFSET ?`,
        [...values, safeLimit, offset]
      );
      const [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM ${table} ${whereSql}`,
        values
      );
      return {
        rows,
        pagination: { page: safePage, limit: safeLimit, total: countRow.total },
        sorting: { sortBy: safeSortBy, order: safeOrder.toLowerCase() },
        filters: { dateFrom: range.from, dateTo: range.to, datePreset: datePreset || '' }
      };
    },

    async getById(id) {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      return rows[0] || null;
    },

    async create(body) {
      const row = pick(body, columns);
      requireFields(row, required);
      const keys = Object.keys(row);
      const placeholders = keys.map(() => '?').join(', ');
      const [result] = await pool.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        keys.map((key) => row[key])
      );
      return this.getById(result.insertId);
    },

    async update(id, body) {
      const row = pick(body, columns);
      const keys = Object.keys(row);
      if (!keys.length) {
        const error = new Error('No valid fields supplied for update');
        error.status = 400;
        throw error;
      }
      await pool.query(
        `UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((key) => row[key]), id]
      );
      return this.getById(id);
    },

    async remove(id) {
      const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    }
  };
}

module.exports = { createCrudService, requireFields, pick };
