function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveDateRange(datePreset, dateFrom, dateTo) {
  if (dateFrom || dateTo) {
    return { from: dateFrom || null, to: dateTo || null };
  }
  if (!datePreset) {
    return { from: null, to: null };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (datePreset === 'today') {
    const date = new Date(year, month, day);
    return { from: formatDate(date), to: formatDate(date) };
  }

  if (datePreset === 'this_week') {
    const current = new Date(year, month, day);
    const dayOfWeek = current.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: formatDate(monday), to: formatDate(sunday) };
  }

  if (datePreset === 'this_month') {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    return { from: formatDate(first), to: formatDate(last) };
  }

  return { from: null, to: null };
}

module.exports = { resolveDateRange };
