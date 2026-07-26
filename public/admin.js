document.addEventListener('DOMContentLoaded', () => {
  const loginPanel = document.getElementById('login-panel');
  const dashboard = document.getElementById('dashboard-panel');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const leadsList = document.getElementById('leads-list');

  const tokenKey = 'admin_token_v1';

  async function verifyToken(token) {
    try {
      const res = await fetch('/api/admin-verify');
      if (res.ok) return true;
    } catch (e) {}
    return false;
  }

  function showDashboard() {
    loginPanel.style.display = 'none';
    dashboard.style.display = 'flex';
    fetchLeads();
  }

  function showLogin() {
    loginPanel.style.display = 'flex';
    dashboard.style.display = 'none';
  }

  async function fetchLeads() {
    const token = localStorage.getItem(tokenKey);
    if (!token) return showLogin();
    try {
      const res = await fetch('/api/contacts', { headers: { 'Authorization': 'Bearer ' + token } });
      const data = await res.json();
      if (!res.ok) { throw new Error(data.message || 'Failed'); }
      renderLeads(data.data || []);
    } catch (err) {
      console.error(err);
      showLogin();
    }
  }

  function renderLeads(items) {
    if (!items || items.length === 0) {
      leadsList.innerHTML = '<tr><td colspan="6" class="table-empty">No submissions found.</td></tr>';
      return;
    }
    leadsList.innerHTML = items.map(s => `
      <tr>
        <td>${new Date(s.timestamp).toLocaleString()}</td>
        <td>${s.name}</td>
        <td>${s.business || ''}</td>
        <td>${s.service}</td>
        <td>${s.budget}</td>
        <td>
          <button class="btn-action-view" data-id="${s.id}">View</button>
          <button class="btn-action-delete" data-id="${s.id}">Del</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-action-delete').forEach(btn => btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const token = localStorage.getItem(tokenKey);
      if (!confirm('Delete this inquiry?')) return;
      try {
        const res = await fetch('/api/contacts?id=' + encodeURIComponent(id), { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }});
        if (!res.ok) throw new Error('Failed');
        fetchLeads();
      } catch (err) { console.error(err); alert('Delete failed'); }
    }));

    document.querySelectorAll('.btn-action-view').forEach(btn => btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      const item = items.find(x => x.id === id);
      if (!item) return alert('Not found');
      const modal = document.getElementById('detail-modal');
      document.getElementById('modal-details-body').innerHTML = `
        <div class="modal-details-grid">
          <div class="detail-block"><span class="lbl">Name</span><span class="val">${item.name}</span></div>
          <div class="detail-block"><span class="lbl">Email</span><span class="val">${item.email}</span></div>
          <div class="detail-block"><span class="lbl">Phone</span><span class="val">${item.phone}</span></div>
          <div class="detail-block"><span class="lbl">Business</span><span class="val">${item.business}</span></div>
          <div class="detail-block full-width"><span class="lbl">Message</span><div class="message-box">${item.message}</div></div>
        </div>
      `;
      modal.style.display = 'flex';
    }));
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const res = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) { loginError.style.display = 'flex'; return; }
      localStorage.setItem(tokenKey, data.token);
      showDashboard();
    } catch (err) {
      console.error(err);
      loginError.style.display = 'flex';
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    showLogin();
  });

  // modal close
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
  });

  // init: check existing token
  const existingToken = localStorage.getItem(tokenKey);
  if (existingToken) {
    // optimistic: try to load leads; fetch will verify token
    fetchLeads();
    loginPanel.style.display = 'none';
    dashboard.style.display = 'flex';
  } else {
    showLogin();
  }
});
