(function () {
  'use strict';

  var configuredBase = window.AIRA_API_BASE_URL || '__AIRA_API_BASE_URL__';
  var API_BASE = configuredBase.indexOf('__') === 0 ? 'http://localhost:3000/api' : configuredBase.replace(/\/$/, '');

  function token() {
    return localStorage.getItem('aira_dbms_token') || '';
  }

  function buildQuery(params) {
    if (!params) return '';
    var search = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        search.append(key, String(value));
      }
    });
    var serialized = search.toString();
    return serialized ? ('?' + serialized) : '';
  }

  async function request(path, options) {
    var response = await fetch(API_BASE + path, Object.assign({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token() ? 'Bearer ' + token() : ''
      }
    }, options || {}));

    var payload = await response.json().catch(function () {
      return { success: false, message: 'Invalid server response' };
    });

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || payload.error || 'Request failed');
    }
    return payload;
  }

  window.AiraDashboardAPI = {
    apiBase: API_BASE,
    login: function (body) {
      return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    },
    list: function (resource, params) {
      return request('/' + resource + buildQuery(params));
    },
    get: function (resource, id) {
      return request('/' + resource + '/' + id);
    },
    create: function (resource, body) {
      return request('/' + resource, { method: 'POST', body: JSON.stringify(body) });
    },
    update: function (resource, id, body) {
      return request('/' + resource + '/' + id, { method: 'PUT', body: JSON.stringify(body) });
    },
    remove: function (resource, id) {
      return request('/' + resource + '/' + id, { method: 'DELETE' });
    },
    dashboard: function (view) {
      return request('/dashboard/' + view);
    },
    gradeByStudentCourse: function (studentId, courseId) {
      return request('/grades/' + studentId + '/' + courseId);
    },
    attendanceByStudentCourse: function (studentId, courseId) {
      return request('/attendance/' + studentId + '/' + courseId);
    }
  };
})();
