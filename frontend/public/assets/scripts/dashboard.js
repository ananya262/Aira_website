(function () {
  'use strict';

  var api = window.AiraDashboardAPI;
  var user = JSON.parse(localStorage.getItem('aira_dbms_user') || 'null');
  var token = localStorage.getItem('aira_dbms_token');
  var nav = document.getElementById('roleNavigation');
  var title = document.getElementById('viewTitle');
  var subtitle = document.getElementById('viewSubtitle');
  var workspace = document.getElementById('workspaceContent');
  var message = document.getElementById('dashboardMessage');

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('userRole').textContent = user.role;
  document.getElementById('userName').textContent = user.username;
  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('aira_dbms_token');
    localStorage.removeItem('aira_dbms_user');
    window.location.href = 'login.html';
  });

  var datePresets = [
    ['today', 'Today'],
    ['this_week', 'This Week'],
    ['this_month', 'This Month']
  ];

  var views = {
    students: {
      label: 'Students',
      path: 'students',
      subtitle: 'Create, review, and manage student records.',
      editable: true,
      datePresetField: 'joining_date',
      formFields: [
        ['name', 'Name', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Phone', 'text'],
        ['grade_level', 'Grade', 'text'],
        ['joining_date', 'Joining Date', 'date'],
        ['parent_phone', 'Parent Phone', 'text']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'display_name', label: 'Name' },
        { key: 'email', label: 'Email', sortable: true, sortKey: 'email' },
        { key: 'grade_level', label: 'Grade', sortable: true, sortKey: 'grade_level' },
        { key: 'joining_date', label: 'Joining Date', sortable: true, sortKey: 'joining_date' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    courses: {
      label: 'Courses',
      path: 'courses',
      subtitle: 'Create, review, and manage course records.',
      editable: true,
      datePresetField: 'created_at',
      formFields: [
        ['course_name', 'Course Name', 'text'],
        ['grade_level', 'Grade', 'text'],
        ['course_code', 'Code', 'text'],
        ['duration_hours', 'Hours', 'number'],
        ['max_capacity', 'Capacity', 'number']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'display_name', label: 'Name' },
        { key: 'course_code', label: 'Course Code', sortable: true, sortKey: 'course_code' },
        { key: 'grade_level', label: 'Grade', sortable: false },
        { key: 'max_capacity', label: 'Capacity', sortable: false },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    faculty: {
      label: 'Faculty',
      path: 'faculty',
      subtitle: 'Create, review, and manage faculty records.',
      editable: true,
      datePresetField: 'created_at',
      formFields: [
        ['faculty_name', 'Faculty Name', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Phone', 'text'],
        ['specialization', 'Specialization', 'text'],
        ['qualification', 'Qualification', 'text']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'display_name', label: 'Name' },
        { key: 'email', label: 'Email', sortable: true, sortKey: 'email' },
        { key: 'specialization', label: 'Specialization', sortable: false },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    enrollments: {
      label: 'Enrollments',
      path: 'enrollments',
      subtitle: 'Create, review, and manage enrollment records.',
      editable: true,
      datePresetField: 'enrollment_date',
      formFields: [
        ['student_id', 'Student ID', 'number'],
        ['course_id', 'Course ID', 'number'],
        ['enrollment_date', 'Enrollment Date', 'date'],
        ['status', 'Status', 'select:active,completed,cancelled']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'enrollment_date', label: 'Enrollment Date', sortable: true, sortKey: 'enrollment_date' },
        { key: 'status', label: 'Status', sortable: true, sortKey: 'status' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    grades: {
      label: 'Grades',
      path: 'grades',
      subtitle: 'Create, review, and manage grade records.',
      editable: true,
      datePresetField: 'date_recorded',
      formFields: [
        ['student_id', 'Student ID', 'number'],
        ['course_id', 'Course ID', 'number'],
        ['marks_obtained', 'Marks', 'number'],
        ['total_marks', 'Total', 'number'],
        ['date_recorded', 'Date Recorded', 'date']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'marks_obtained', label: 'Marks', sortable: true, sortKey: 'marks_obtained' },
        { key: 'total_marks', label: 'Total', sortable: true, sortKey: 'total_marks' },
        { key: 'percentage', label: 'Percentage', sortable: true, sortKey: 'percentage' },
        { key: 'date_recorded', label: 'Date Recorded', sortable: true, sortKey: 'date_recorded' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    attendance: {
      label: 'Attendance',
      path: 'attendance',
      subtitle: 'Create, review, and manage attendance records.',
      editable: true,
      datePresetField: 'attendance_date',
      formFields: [
        ['student_id', 'Student ID', 'number'],
        ['course_id', 'Course ID', 'number'],
        ['attendance_date', 'Attendance Date', 'date'],
        ['is_present', 'Present', 'select:true,false'],
        ['class_count', 'Class Count', 'number']
      ],
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'attendance_date', label: 'Attendance Date', sortable: true, sortKey: 'attendance_date' },
        { key: 'is_present', label: 'Present', sortable: false },
        { key: 'class_count', label: 'Class Count', sortable: true, sortKey: 'class_count' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    facultyCourses: {
      label: 'Assigned Courses',
      path: 'course-faculty',
      subtitle: 'Read-only data for your role.',
      editable: false,
      datePresetField: 'assigned_date',
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'display_name', label: 'Name' },
        { key: 'course_id', label: 'Course ID', sortable: true, sortKey: 'course_id' },
        { key: 'faculty_id', label: 'Faculty ID', sortable: true, sortKey: 'faculty_id' },
        { key: 'assigned_date', label: 'Assigned Date', sortable: true, sortKey: 'assigned_date' }
      ]
    },
    studentCourses: {
      label: 'My Courses',
      path: 'enrollments',
      subtitle: 'Read-only data for your role.',
      editable: false,
      datePresetField: 'enrollment_date',
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'enrollment_date', label: 'Enrollment Date', sortable: true, sortKey: 'enrollment_date' },
        { key: 'status', label: 'Status', sortable: true, sortKey: 'status' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    studentGrades: {
      label: 'Grade History',
      path: 'grades',
      subtitle: 'Read-only data for your role.',
      editable: false,
      datePresetField: 'date_recorded',
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'marks_obtained', label: 'Marks', sortable: true, sortKey: 'marks_obtained' },
        { key: 'total_marks', label: 'Total', sortable: true, sortKey: 'total_marks' },
        { key: 'percentage', label: 'Percentage', sortable: true, sortKey: 'percentage' },
        { key: 'date_recorded', label: 'Date Recorded', sortable: true, sortKey: 'date_recorded' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    },
    studentAttendance: {
      label: 'Attendance',
      path: 'attendance',
      subtitle: 'Read-only data for your role.',
      editable: false,
      datePresetField: 'attendance_date',
      columns: [
        { key: 'id', label: 'ID', sortable: true, sortKey: 'id' },
        { key: 'student_name', label: 'Student Name', sortable: true, sortKey: 'student_name' },
        { key: 'course_name', label: 'Course Name', sortable: true, sortKey: 'course_name' },
        { key: 'display_name', label: 'Name' },
        { key: 'attendance_date', label: 'Attendance Date', sortable: true, sortKey: 'attendance_date' },
        { key: 'is_present', label: 'Present', sortable: false },
        { key: 'class_count', label: 'Class Count', sortable: true, sortKey: 'class_count' },
        { key: 'created_date', label: 'Created Date', sortable: true, sortKey: 'created_at' },
        { key: 'created_time', label: 'Created Time', sortable: false }
      ]
    }
  };

  var adminViews = [
    ['students', 'Students'],
    ['courses', 'Courses'],
    ['faculty', 'Faculty'],
    ['enrollments', 'Enrollments'],
    ['grades', 'Grades'],
    ['attendance', 'Attendance'],
    ['reports', 'Reports']
  ];
  var facultyViews = [
    ['facultyCourses', 'Assigned Courses'],
    ['grades', 'Grade Entry'],
    ['attendance', 'Attendance']
  ];
  var studentViews = [
    ['studentCourses', 'My Courses'],
    ['studentGrades', 'Grade History'],
    ['studentAttendance', 'Attendance']
  ];

  var state = {
    activeView: null,
    sortBy: 'id',
    order: 'asc',
    datePreset: '',
    dateFrom: '',
    dateTo: ''
  };

  function showMessage(text, isError) {
    message.textContent = text || '';
    message.style.color = isError ? '#b91c1c' : '#2E7D32';
    message.classList.toggle('hidden', !text);
  }

  function setHeader(nextTitle, nextSubtitle) {
    title.textContent = nextTitle;
    subtitle.textContent = nextSubtitle;
    showMessage('');
  }

  function setActive(view) {
    Array.prototype.forEach.call(nav.querySelectorAll('.dbms-tab'), function (button) {
      button.classList.toggle('active', button.dataset.view === view);
    });
  }

  function normalizeDateTime(row) {
    var created = row.created_at;
    if (!created) {
      row.created_date = '';
      row.created_time = '';
      return;
    }

    var date = new Date(created);
    if (Number.isNaN(date.getTime())) {
      var pieces = String(created).split(/[T ]/);
      row.created_date = pieces[0] || '';
      row.created_time = pieces[1] ? pieces[1].replace('Z', '').slice(0, 8) : '';
      return;
    }

    row.created_date = date.toLocaleDateString('en-CA');
    row.created_time = date.toLocaleTimeString('en-GB', { hour12: false });
  }

  function deriveDisplayName(row) {
    if (row.name) return row.name;
    if (row.student_name && row.course_name) return row.student_name + ' / ' + row.course_name;
    if (row.student_name) return row.student_name;
    if (row.course_name) return row.course_name;
    if (row.faculty_name) return row.faculty_name;
    if (row.course_name) return row.course_name;
    if (row.course_code) return row.course_code;
    if (row.account_username) return row.account_username;
    if (row.username) return row.username;
    if (row.email) return row.email;
    return row.id ? ('Record #' + row.id) : 'Record';
  }

  function decorateRows(rows) {
    return rows.map(function (item) {
      var row = Object.assign({}, item);
      row.display_name = deriveDisplayName(row);
      normalizeDateTime(row);
      return row;
    });
  }

  function inputFor(field) {
    var name = field[0];
    var label = field[1];
    var type = field[2];
    var wrapper = document.createElement('label');
    wrapper.className = 'form-group';
    wrapper.textContent = label;

    if (type.indexOf('select:') === 0) {
      var select = document.createElement('select');
      select.className = 'form-control';
      select.name = name;
      type.slice(7).split(',').forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
      wrapper.appendChild(select);
      return wrapper;
    }

    var input = document.createElement('input');
    input.className = 'form-control';
    input.name = name;
    input.type = type;
    if (type === 'number') input.step = '0.01';
    wrapper.appendChild(input);
    return wrapper;
  }

  function formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  function buildToolbar(container, config, onFilterChange) {
    if (!config.datePresetField) return;
    var toolbar = document.createElement('div');
    toolbar.className = 'dbms-table-toolbar';

    var label = document.createElement('span');
    label.className = 'dbms-toolbar-label';
    label.textContent = 'Date Access:';
    toolbar.appendChild(label);

    var presetButtons = [];
    datePresets.forEach(function (preset) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline dbms-preset-btn';
      button.textContent = preset[1];
      button.addEventListener('click', function () {
        state.datePreset = preset[0];
        state.dateFrom = '';
        state.dateTo = '';
        updateButtons();
        onFilterChange();
      });
      toolbar.appendChild(button);
      presetButtons.push({ id: preset[0], button: button });
    });

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'btn btn-outline dbms-preset-btn';
    clear.textContent = 'Clear';
    clear.addEventListener('click', function () {
      state.datePreset = '';
      state.dateFrom = '';
      state.dateTo = '';
      updateButtons();
      onFilterChange();
    });
    toolbar.appendChild(clear);

    var rangeGroup = document.createElement('div');
    rangeGroup.className = 'dbms-date-range';

    var fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.className = 'dbms-date-input';
    fromInput.placeholder = 'From';
    fromInput.value = state.dateFrom || '';
    fromInput.addEventListener('change', function () {
      state.dateFrom = fromInput.value;
      if (state.dateFrom) state.datePreset = '';
      updateButtons();
    });
    rangeGroup.appendChild(fromInput);

    var toInput = document.createElement('input');
    toInput.type = 'date';
    toInput.className = 'dbms-date-input';
    toInput.placeholder = 'To';
    toInput.value = state.dateTo || '';
    toInput.addEventListener('change', function () {
      state.dateTo = toInput.value;
      if (state.dateTo) state.datePreset = '';
      updateButtons();
    });
    rangeGroup.appendChild(toInput);

    var apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'btn btn-primary dbms-date-apply';
    apply.textContent = 'Apply';
    apply.addEventListener('click', function () {
      state.datePreset = '';
      updateButtons();
      onFilterChange();
    });
    rangeGroup.appendChild(apply);

    toolbar.appendChild(rangeGroup);

    function updateButtons() {
      presetButtons.forEach(function (entry) {
        entry.button.classList.toggle('active', state.datePreset === entry.id);
      });
      clear.classList.toggle('active', !state.datePreset && !state.dateFrom && !state.dateTo);
      fromInput.value = state.dateFrom || '';
      toInput.value = state.dateTo || '';
    }

    updateButtons();
    container.appendChild(toolbar);
  }

  function renderTable(container, config, rows, reload, actions) {
    var template = document.getElementById('tableTemplate');
    var node = template.content.cloneNode(true);
    node.querySelector('h2').textContent = config.label + ' Table';
    node.querySelector('.dbms-refresh').addEventListener('click', reload);

    var card = node.querySelector('.dbms-card');
    buildToolbar(card, config, function () {
      reload();
    });

    var thead = node.querySelector('thead');
    var tbody = node.querySelector('tbody');
    var columns = config.columns || [];

    var headRow = document.createElement('tr');
    columns.forEach(function (column) {
      var th = document.createElement('th');
      if (column.sortable) {
        var sortBtn = document.createElement('button');
        sortBtn.type = 'button';
        sortBtn.className = 'dbms-sortable-head';
        sortBtn.textContent = column.label;
        if (state.sortBy === column.sortKey) {
          sortBtn.setAttribute('data-order', state.order);
          sortBtn.textContent += state.order === 'asc' ? ' ^' : ' v';
        }
        sortBtn.addEventListener('click', function () {
          if (state.sortBy === column.sortKey) {
            state.order = state.order === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortBy = column.sortKey;
            state.order = 'asc';
          }
          reload();
        });
        th.appendChild(sortBtn);
      } else {
        th.textContent = column.label;
      }
      headRow.appendChild(th);
    });
    if (actions) {
      var actionHead = document.createElement('th');
      actionHead.textContent = 'Actions';
      headRow.appendChild(actionHead);
    }
    thead.appendChild(headRow);

    (rows.length ? rows : [{ emptyRow: true }]).forEach(function (row) {
      var tr = document.createElement('tr');

      if (row.emptyRow) {
        var td = document.createElement('td');
        td.colSpan = columns.length + (actions ? 1 : 0);
        td.textContent = 'No records found';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      columns.forEach(function (column) {
        var td = document.createElement('td');
        td.textContent = formatValue(row[column.key]);
        tr.appendChild(td);
      });

      if (actions && row.id) {
        var actionCell = document.createElement('td');
        actionCell.className = 'dbms-table-actions';

        var editButton = document.createElement('button');
        editButton.className = 'btn btn-outline';
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function () { actions.edit(row); });

        var removeButton = document.createElement('button');
        removeButton.className = 'btn btn-outline';
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', function () { actions.remove(row); });

        actionCell.appendChild(editButton);
        actionCell.appendChild(removeButton);
        tr.appendChild(actionCell);
      }
      tbody.appendChild(tr);
    });

    container.appendChild(node);
  }

  function renderForm(container, config, reload, editRow) {
    if (!config.editable || !config.formFields) return;

    var form = document.createElement('form');
    form.className = 'dbms-inline-form';

    config.formFields.forEach(function (field) {
      var control = inputFor(field);
      var element = control.querySelector('[name="' + field[0] + '"]');
      if (editRow && element && editRow[field[0]] !== null && editRow[field[0]] !== undefined) {
        element.value = String(editRow[field[0]]).slice(0, element.type === 'date' ? 10 : undefined);
      }
      form.appendChild(control);
    });

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    submit.textContent = editRow ? 'Update' : 'Create';

    var actionsRow = document.createElement('div');
    actionsRow.className = 'dbms-form-actions';
    actionsRow.appendChild(submit);

    if (editRow) {
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn btn-outline';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', reload);
      actionsRow.appendChild(cancel);
    }

    form.appendChild(actionsRow);
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = {};

      config.formFields.forEach(function (field) {
        var value = form.elements[field[0]].value;
        if (value !== '') {
          data[field[0]] = value === 'true' ? true : value === 'false' ? false : value;
        }
      });

      try {
        if (editRow) {
          await api.update(config.path, editRow.id, data);
        } else {
          await api.create(config.path, data);
        }
        form.reset();
        showMessage(editRow ? 'Record updated successfully.' : 'Record created successfully.');
        reload();
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    container.appendChild(form);
  }

  async function loadViewData(config) {
    var params = {
      sortBy: state.sortBy,
      order: state.order
    };

    if (config.datePresetField) {
      if (state.dateFrom || state.dateTo) {
        if (state.dateFrom) params.dateFrom = state.dateFrom;
        if (state.dateTo) params.dateTo = state.dateTo;
      } else if (state.datePreset) {
        params.datePreset = state.datePreset;
      }
    }

    var result = await api.list(config.path, params);
    var rows = result.data.rows || result.data;
    return decorateRows(rows);
  }

  async function renderDataView(viewKey) {
    var config = views[viewKey];
    if (!config) return;

    setHeader(config.label, config.subtitle);
    setActive(viewKey);
    workspace.innerHTML = '';

    if (config.editable) {
      var panel = document.createElement('div');
      panel.className = 'dbms-card';
      renderForm(panel, config, function () { renderDataView(viewKey); });
      workspace.appendChild(panel);
    }

    var rows = await loadViewData(config);

    renderTable(workspace, config, rows, function () {
      renderDataView(viewKey);
    }, config.editable ? {
      edit: function (row) {
        workspace.innerHTML = '';
        var editPanel = document.createElement('div');
        editPanel.className = 'dbms-card';
        renderForm(editPanel, config, function () { renderDataView(viewKey); }, row);
        workspace.appendChild(editPanel);

        renderTable(workspace, config, rows, function () {
          renderDataView(viewKey);
        }, {
          edit: function (nextRow) {
            workspace.innerHTML = '';
            var nextEditPanel = document.createElement('div');
            nextEditPanel.className = 'dbms-card';
            renderForm(nextEditPanel, config, function () { renderDataView(viewKey); }, nextRow);
            workspace.appendChild(nextEditPanel);

            renderTable(workspace, config, rows, function () {
              renderDataView(viewKey);
            }, {
              edit: function () {},
              remove: function () {}
            });
          },
          remove: async function (nextRow) {
            if (!window.confirm('Delete record #' + nextRow.id + '?')) return;
            try {
              await api.remove(config.path, nextRow.id);
              showMessage('Record deleted successfully.');
              renderDataView(viewKey);
            } catch (error) {
              showMessage(error.message, true);
            }
          }
        });
      },
      remove: async function (row) {
        if (!window.confirm('Delete record #' + row.id + '?')) return;
        try {
          await api.remove(config.path, row.id);
          showMessage('Record deleted successfully.');
          renderDataView(viewKey);
        } catch (error) {
          showMessage(error.message, true);
        }
      }
    } : null);
  }

  async function renderReports() {
    setHeader('Reports', 'Analytical views powered by MySQL joins, indexes, and triggers.');
    setActive('reports');
    workspace.innerHTML = '<div class="dbms-chart-grid"><div class="dbms-card dbms-chart-box"><canvas id="utilizationChart"></canvas></div><div class="dbms-card dbms-chart-box"><canvas id="attendanceChart"></canvas></div></div>';

    var utilization = (await api.dashboard('course-utilization')).data;
    var attendance = (await api.dashboard('attendance-summary')).data;

    var performanceRows = decorateRows((await api.dashboard('student-performance')).data);
    var workloadRows = decorateRows((await api.dashboard('faculty-workload')).data);

    renderTable(workspace, {
      label: 'Student Performance',
      columns: [
        { key: 'student_id', label: 'Student ID', sortable: false },
        { key: 'student_name', label: 'Student Name', sortable: false },
        { key: 'average_percentage', label: 'Average %', sortable: false },
        { key: 'gpa', label: 'GPA', sortable: false },
        { key: 'attendance_percentage', label: 'Attendance %', sortable: false }
      ]
    }, performanceRows, renderReports);

    renderTable(workspace, {
      label: 'Faculty Workload',
      columns: [
        { key: 'faculty_id', label: 'Faculty ID', sortable: false },
        { key: 'faculty_name', label: 'Faculty Name', sortable: false },
        { key: 'assigned_courses', label: 'Assigned Courses', sortable: false }
      ]
    }, workloadRows, renderReports);

    if (window.Chart) {
      new Chart(document.getElementById('utilizationChart'), {
        type: 'bar',
        data: {
          labels: utilization.map(function (row) { return row.course_name; }),
          datasets: [{ label: 'Course Fill %', data: utilization.map(function (row) { return row.fill_percentage; }), backgroundColor: '#2E7D32' }]
        }
      });
      new Chart(document.getElementById('attendanceChart'), {
        type: 'pie',
        data: {
          labels: attendance.map(function (row) { return row.student_name + ' - ' + row.course_name; }),
          datasets: [{ label: 'Attendance %', data: attendance.map(function (row) { return row.attendance_percentage; }), backgroundColor: ['#2E7D32', '#FDD835', '#64748b', '#1b5220'] }]
        }
      });
    }
  }

  function navigate(view) {
    state.activeView = view;
    state.sortBy = 'id';
    state.order = 'asc';
    state.datePreset = '';
    state.dateFrom = '';
    state.dateTo = '';

    if (view === 'reports') {
      renderReports().catch(function (error) {
        showMessage(error.message, true);
      });
      return;
    }

    renderDataView(view).catch(function (error) {
      showMessage(error.message, true);
    });
  }

  function buildNav() {
    var roleViews = user.role === 'admin' ? adminViews : user.role === 'faculty' ? facultyViews : studentViews;
    roleViews.forEach(function (item) {
      var button = document.createElement('button');
      button.className = 'dbms-tab';
      button.dataset.view = item[0];
      button.textContent = item[1];
      button.addEventListener('click', function () { navigate(item[0]); });
      nav.appendChild(button);
    });
    navigate(roleViews[0][0]);
  }

  buildNav();
})();