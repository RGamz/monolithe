/**
 * Admin Page Logic (js/admin.js)
 * --------------------------------
 * Full user management for administrators:
 * - User table with all roles
 * - Create new users (any role)
 * - Edit existing users
 * - Delete users with confirmation
 * - Filter/search
 */

const ADMIN_ICONS = {
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

let allUsers = [];
let editingUserId = null;

const user = initLayout('admin');
if (user) {
  if (user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML = '<div class="alert alert-error">Accès réservé aux administrateurs.</div>';
  } else {
    loadAdmin();
  }
}

async function loadAdmin() {
  const container = document.getElementById('page-content');

  try {
    const res = await fetch('/api/users');
    allUsers = await res.json();
    renderAdmin();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement.</div>';
  }
}

function renderAdmin() {
  const container = document.getElementById('page-content');

  // Count by role
  const admins = allUsers.filter(u => u.role === 'ADMIN').length;
  const artisans = allUsers.filter(u => u.role === 'ARTISAN').length;
  const clients = allUsers.filter(u => u.role === 'CLIENT').length;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800); display: flex; align-items: center; gap: 8px;">
            ${ADMIN_ICONS.users}
            Gestion des utilisateurs
          </h2>
          <p class="text-sm" style="color: var(--slate-500); margin-top: 4px;">
            ${allUsers.length} utilisateurs — ${admins} admin${admins > 1 ? 's' : ''}, ${artisans} artisan${artisans > 1 ? 's' : ''}, ${clients} client${clients > 1 ? 's' : ''}
          </p>
        </div>
        <button class="btn btn-primary" style="width: auto;" onclick="openCreateModal()">
          ${ADMIN_ICONS.plus}
          Nouvel utilisateur
        </button>
      </div>

      <!-- Search + Role filter -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <div class="search-wrapper" style="flex: 1; min-width: 200px; margin-bottom: 0;">
          ${ADMIN_ICONS.search}
          <input type="text" class="search-input" id="admin-search" placeholder="Rechercher par nom, email, entreprise..." oninput="filterUsers()">
        </div>
        <select id="role-filter" class="form-select" style="width: auto; min-width: 160px;" onchange="filterUsers()">
          <option value="">Tous les rôles</option>
          <option value="ADMIN">Administrateurs</option>
          <option value="ARTISAN">Artisans</option>
          <option value="CLIENT">Clients</option>
        </select>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table" id="users-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Entreprise</th>
                <th>Statut</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="users-table-body">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderTableRows(allUsers);
}

function renderTableRows(users) {
  const tbody = document.getElementById('users-table-body');

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding: 32px;">Aucun utilisateur trouvé.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const roleBadge = u.role === 'ADMIN'
      ? '<span class="badge" style="background: var(--purple-100); color: var(--purple-600);">Admin</span>'
      : u.role === 'ARTISAN'
      ? '<span class="badge" style="background: var(--blue-100); color: var(--blue-700);">Artisan</span>'
      : '<span class="badge" style="background: var(--green-100); color: var(--green-700);">Client</span>';

    // For artisans, show documents_status if available
    let statusBadge;
    if (u.role === 'ARTISAN' && u.documents_status) {
      if (u.documents_status === 'compliant') {
        statusBadge = '<span class="badge badge-complete">Conforme</span>';
      } else if (u.documents_status === 'missing') {
        statusBadge = '<span class="badge badge-pending">Manquant</span>';
      } else if (u.documents_status === 'expired') {
        statusBadge = '<span class="badge" style="background: var(--red-100); color: var(--red-700);">Expiré</span>';
      }
    } else {
      // For non-artisans or when documents_status is not set, show is_onboarded
      statusBadge = u.is_onboarded
        ? '<span class="badge badge-complete">Actif</span>'
        : '<span class="badge badge-pending">En attente</span>';
    }

    return `
      <tr>
        <td style="color: var(--slate-800); font-weight: 500;">${u.name}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${u.company_name || '—'}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="action-btn edit" onclick="openEditModal('${u.id}')" title="Modifier">
              ${ADMIN_ICONS.edit}
            </button>
            <button class="action-btn delete" onclick="confirmDelete('${u.id}', '${u.name.replace(/'/g, "\\'")}')" title="Supprimer">
              ${ADMIN_ICONS.trash}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterUsers() {
  const query = (document.getElementById('admin-search')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('role-filter')?.value || '';

  const filtered = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.company_name && u.company_name.toLowerCase().includes(query));
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  renderTableRows(filtered);
}

// ---------------------------------------------------------------
// MODAL — Create / Edit
// ---------------------------------------------------------------

function openCreateModal() {
  editingUserId = null;
  document.getElementById('modal-title').textContent = 'Nouvel utilisateur';
  document.getElementById('form-submit-btn').textContent = 'Créer';

  // Clear form
  document.getElementById('form-id').value = '';
  document.getElementById('form-name').value = '';
  document.getElementById('form-email').value = '';
  document.getElementById('form-password').value = '';
  document.getElementById('form-password').required = true;
  document.getElementById('form-role').value = '';
  document.getElementById('form-company').value = '';
  document.getElementById('form-specialty').value = '';
  document.getElementById('form-address').value = '';
  document.getElementById('form-lat').value = '';
  document.getElementById('form-lng').value = '';
  document.getElementById('form-docs-status').value = '';
  document.getElementById('form-error').classList.add('hidden');

  toggleArtisanFields();
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function openEditModal(userId) {
  const u = allUsers.find(x => x.id === userId);
  if (!u) return;

  editingUserId = userId;
  document.getElementById('modal-title').textContent = 'Modifier l\'utilisateur';
  document.getElementById('form-submit-btn').textContent = 'Enregistrer';

  document.getElementById('form-id').value = u.id;
  document.getElementById('form-name').value = u.name;
  document.getElementById('form-email').value = u.email;
  document.getElementById('form-password').value = '';
  document.getElementById('form-password').required = false; // Not required for edit
  document.getElementById('form-password').placeholder = 'Laisser vide pour ne pas changer';
  document.getElementById('form-role').value = u.role;
  document.getElementById('form-company').value = u.company_name || '';
  document.getElementById('form-specialty').value = u.specialty || '';
  document.getElementById('form-address').value = u.address || '';
  document.getElementById('form-lat').value = u.lat || '';
  document.getElementById('form-lng').value = u.lng || '';
  document.getElementById('form-docs-status').value = u.documents_status || '';
  document.getElementById('form-error').classList.add('hidden');

  toggleArtisanFields();
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal(event) {
  // If called from backdrop click, only close if clicking backdrop itself
  if (event && event.target !== document.getElementById('modal-backdrop')) return;
  document.getElementById('modal-backdrop').classList.add('hidden');
  editingUserId = null;
}

function toggleArtisanFields() {
  const role = document.getElementById('form-role').value;
  const specialtyGroup = document.getElementById('specialty-group');
  const artisanExtra = document.getElementById('form-artisan-extra');
  const coordsGroup = document.getElementById('coords-group');

  if (role === 'ARTISAN') {
    specialtyGroup.style.display = '';
    artisanExtra.style.display = '';
    coordsGroup.style.display = '';
  } else {
    specialtyGroup.style.display = 'none';
    artisanExtra.style.display = 'none';
    coordsGroup.style.display = role === 'CLIENT' ? 'none' : 'none';
  }
}

// ---------------------------------------------------------------
// FORM SUBMIT
// ---------------------------------------------------------------

document.getElementById('user-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const errorEl = document.getElementById('form-error');
  const btn = document.getElementById('form-submit-btn');
  errorEl.classList.add('hidden');

  const data = {
    name: document.getElementById('form-name').value.trim(),
    email: document.getElementById('form-email').value.trim(),
    role: document.getElementById('form-role').value,
    company_name: document.getElementById('form-company').value.trim() || null,
    specialty: document.getElementById('form-specialty').value || null,
    address: document.getElementById('form-address').value.trim() || null,
    lat: document.getElementById('form-lat').value ? parseFloat(document.getElementById('form-lat').value) : null,
    lng: document.getElementById('form-lng').value ? parseFloat(document.getElementById('form-lng').value) : null,
    documents_status: document.getElementById('form-docs-status').value || null,
  };

  const password = document.getElementById('form-password').value;

  if (editingUserId) {
    // EDIT mode
    if (password) data.password = password;

    btn.textContent = 'Enregistrement...';
    btn.disabled = true;

    try {
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const updated = await res.json();

      // Update local array
      const idx = allUsers.findIndex(u => u.id === editingUserId);
      if (idx !== -1) allUsers[idx] = updated;

      closeModal();
      renderAdmin();

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.textContent = 'Enregistrer';
      btn.disabled = false;
    }

  } else {
    // CREATE mode
    data.password = password;

    if (!data.password || data.password.length < 6) {
      errorEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
      errorEl.classList.remove('hidden');
      return;
    }

    btn.textContent = 'Création...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const created = await res.json();
      allUsers.push(created);

      closeModal();
      renderAdmin();

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.textContent = 'Créer';
      btn.disabled = false;
    }
  }
});

// ---------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------

async function confirmDelete(userId, userName) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer "${userName}" ?\n\nCette action est irréversible.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    allUsers = allUsers.filter(u => u.id !== userId);
    renderAdmin();

  } catch (err) {
    alert('Erreur réseau lors de la suppression.');
  }
}
