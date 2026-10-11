/**
 * DOCUMENT VERSION MANAGER - Admin Dashboard Controller
 * Handles user management, storage monitoring, and system activity auditing
 */

const ADMIN_USERS = [
  { id: 'usr-1', name: 'Dinesh Kumar R', mobile: '+91 9876543210', role: 'System Admin', docs: 8, status: 'Active' },
  { id: 'usr-2', name: 'Priya Sharma', mobile: '+91 9845123456', role: 'Contributor', docs: 14, status: 'Active' },
  { id: 'usr-3', name: 'Rahul Verma', mobile: '+91 9712345678', role: 'Reviewer', docs: 6, status: 'Active' },
  { id: 'usr-4', name: 'Ananya Patel', mobile: '+91 9623456789', role: 'User', docs: 4, status: 'Disabled' },
  { id: 'usr-5', name: 'Karthik Sundaram', mobile: '+91 9534567890', role: 'Contributor', docs: 11, status: 'Active' },
  { id: 'usr-6', name: 'Sneha Reddy', mobile: '+91 9412309876', role: 'User', docs: 2, status: 'Active' }
];

document.addEventListener('DOMContentLoaded', () => {
  DVM.checkAuth(true);

  renderUsersTable();
  renderAdminActivityTable();
  setupUserModal();
});

function renderUsersTable() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  ADMIN_USERS.forEach(u => {
    const tr = document.createElement('tr');
    const isActive = u.status === 'Active';

    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="avatar-initials" style="width: 32px; height: 32px; font-size: 0.75rem;">
            ${u.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
          </div>
          <div>
            <div class="fw-bold text-dark small">${u.name}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${u.role}</div>
          </div>
        </div>
      </td>
      <td class="small font-monospace">${u.mobile}</td>
      <td><span class="badge bg-light text-secondary small">${u.role}</span></td>
      <td class="small fw-semibold text-center">${u.docs}</td>
      <td>
        <span class="badge ${isActive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} small">
          ${u.status}
        </span>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button class="btn btn-sm btn-outline-primary" onclick="viewUserModal('${u.id}')" title="View User Details">
            <i class="fa-regular fa-eye"></i>
          </button>
          <button class="btn btn-sm ${isActive ? 'btn-secondary-soft' : 'btn-primary'}" onclick="toggleUserStatus('${u.id}')" title="${isActive ? 'Disable Account' : 'Enable Account'}">
            <i class="fa-solid ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminActivityTable() {
  const tbody = document.getElementById('adminActivityTableBody');
  if (!tbody) return;

  const activities = DVM.getActivities();
  tbody.innerHTML = '';

  activities.forEach(act => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="small fw-semibold text-dark">${act.user}</td>
      <td><span class="badge bg-primary-subtle text-primary small">${act.action}</span></td>
      <td class="small">${act.document}</td>
      <td class="small font-monospace">${act.version}</td>
      <td class="small text-muted">${act.date}</td>
      <td><span class="badge bg-success-subtle text-success small">${act.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.toggleUserStatus = function(userId) {
  const user = ADMIN_USERS.find(u => u.id === userId);
  if (!user) return;

  user.status = (user.status === 'Active') ? 'Disabled' : 'Active';
  DVM.showToast('User Status Updated', `${user.name} is now ${user.status}.`, user.status === 'Active' ? 'success' : 'warning');
  renderUsersTable();
};

window.viewUserModal = function(userId) {
  const user = ADMIN_USERS.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('adminUserDetailModal');
  const nameEl = document.getElementById('adminModalUserName');
  const roleEl = document.getElementById('adminModalUserRole');
  const mobileEl = document.getElementById('adminModalUserMobile');
  const statusEl = document.getElementById('adminModalUserStatus');

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (mobileEl) mobileEl.textContent = user.mobile;
  if (statusEl) statusEl.textContent = user.status;

  if (modal) modal.classList.add('is-active');
};

function setupUserModal() {
  const modal = document.getElementById('adminUserDetailModal');
  const closeBtn = document.getElementById('closeAdminUserModalBtn');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('is-active');
    });
  }
}
