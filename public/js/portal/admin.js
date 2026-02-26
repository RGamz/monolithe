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

let currentAdminTab = 'users';

async function loadAdmin() {
  const container = document.getElementById('page-content');

  try {
    const res = await fetch('/api/users');
    allUsers = await res.json();
    renderAdminTabs();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement.</div>';
  }
}

function renderAdminTabs() {
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div style="display: flex; gap: 4px; border-bottom: 2px solid var(--slate-200); margin-bottom: 24px;">
      <button id="tab-users" onclick="switchAdminTab('users')"
        style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: ${currentAdminTab === 'users' ? 'var(--primary)' : 'var(--slate-500)'}; border-bottom: 2px solid ${currentAdminTab === 'users' ? 'var(--primary)' : 'transparent'}; margin-bottom: -2px;">
        Utilisateurs
      </button>
      <button id="tab-moderation" onclick="switchAdminTab('moderation')"
        style="padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: ${currentAdminTab === 'moderation' ? 'var(--primary)' : 'var(--slate-500)'}; border-bottom: 2px solid ${currentAdminTab === 'moderation' ? 'var(--primary)' : 'transparent'}; margin-bottom: -2px;">
        Modération
      </button>
    </div>
    <div id="tab-content"></div>
  `;

  if (currentAdminTab === 'users') {
    renderAdmin();
  } else {
    loadModeration();
  }
}

function switchAdminTab(tab) {
  currentAdminTab = tab;
  renderAdminTabs();
}

function renderAdmin() {
  const container = document.getElementById('tab-content') || document.getElementById('page-content');

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

// ---------------------------------------------------------------
// MODERATION TAB
// ---------------------------------------------------------------

const MOD_ICONS = {
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  eye:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  send:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

let pendingByArtisan = [];
// decisions: { [itemId]: { decision: 'approuvé'|'rejeté'|null, note: '' } }
let decisions = {};

async function loadModeration() {
  const container = document.getElementById('tab-content') || document.getElementById('page-content');
  try {
    const res = await fetch('/api/moderation/pending');
    pendingByArtisan = await res.json();
    decisions = {};
    renderModeration();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement.</div>';
  }
}

function renderModeration() {
  const container = document.getElementById('tab-content') || document.getElementById('page-content');
  const totalItems = pendingByArtisan.reduce((n, a) => n + a.items.length, 0);

  container.innerHTML = `
    <div class="space-y-6">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800); display: flex; align-items: center; gap: 8px;">
            ${MOD_ICONS.inbox}
            Modération des documents
          </h2>
          <p class="text-sm" style="color: var(--slate-500); margin-top: 4px;">
            ${totalItems} document${totalItems !== 1 ? 's' : ''} en attente de modération
          </p>
        </div>
        <button class="btn btn-primary" style="width: auto;" id="submit-mod-btn" onclick="submitModeration()" ${totalItems === 0 ? 'disabled' : ''}>
          ${MOD_ICONS.send}
          Envoyer les décisions
        </button>
      </div>

      ${totalItems === 0 ? `
        <div class="card" style="text-align: center; padding: 48px; color: var(--slate-400);">
          <div style="font-size: 3rem; margin-bottom: 12px;">✅</div>
          <p style="font-weight: 500;">Aucun document en attente de modération.</p>
        </div>
      ` : pendingByArtisan.map(artisan => buildArtisanSection(artisan)).join('')}
    </div>
  `;
}

function buildArtisanSection(artisan) {
  const rows = artisan.items.map(item => buildItemRow(item)).join('');
  return `
    <div class="card" style="overflow: visible;">
      <div style="padding: 16px 20px; border-bottom: 1px solid var(--slate-100); background: var(--slate-50); border-radius: 8px 8px 0 0;">
        <p style="font-weight: 600; color: var(--slate-800); margin: 0;">${artisan.artisan_name}</p>
        <p style="font-size: 0.8rem; color: var(--slate-500); margin: 2px 0 0;">${artisan.artisan_email} — ${artisan.items.length} document${artisan.items.length !== 1 ? 's' : ''}</p>
      </div>
      <div style="padding: 12px;">
        ${rows}
      </div>
    </div>
  `;
}

function buildItemRow(item) {
  const d = decisions[item.id] || { decision: null, note: '' };
  const typeLabel = getTypeLabel(item);
  const contextLabel = getContextLabel(item);
  const editableFields = buildEditableFields(item);

  const approvedClass = d.decision === 'approuvé' ? 'style="background:#f0fdf4;border:1.5px solid #22c55e;"' : '';
  const rejectedClass = d.decision === 'rejeté' ? 'style="background:#fef2f2;border:1.5px solid #ef4444;"' : '';

  return `
    <div id="row-${item.id}" style="border: 1px solid var(--slate-200); border-radius: 8px; margin-bottom: 10px; padding: 14px; transition: all 0.15s;" ${d.decision === 'approuvé' ? approvedClass : d.decision === 'rejeté' ? rejectedClass : ''}>
      <div style="display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;">

        <!-- File info -->
        <div style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 12px; background: var(--slate-100); color: var(--slate-600);">${typeLabel}</span>
            <span style="font-size: 0.875rem; font-weight: 500; color: var(--slate-700);">${contextLabel}</span>
          </div>
          ${item.file_url ? `
            <a href="${item.file_url}" target="_blank" style="font-size: 0.8rem; color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              ${MOD_ICONS.eye} ${item.file_name}
            </a>` : `<span style="font-size: 0.8rem; color: var(--slate-400);">Pas de fichier</span>`}
          ${editableFields}
        </div>

        <!-- Decision buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
          <div style="display: flex; gap: 8px;">
            <button onclick="setDecision('${item.id}', 'approuvé')"
              style="padding: 6px 14px; border-radius: 6px; border: 1.5px solid ${d.decision === 'approuvé' ? '#22c55e' : '#e2e8f0'}; background: ${d.decision === 'approuvé' ? '#22c55e' : 'white'}; color: ${d.decision === 'approuvé' ? 'white' : 'var(--slate-600)'}; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; transition: all 0.1s;">
              ${MOD_ICONS.check} Approuver
            </button>
            <button onclick="setDecision('${item.id}', 'rejeté')"
              style="padding: 6px 14px; border-radius: 6px; border: 1.5px solid ${d.decision === 'rejeté' ? '#ef4444' : '#e2e8f0'}; background: ${d.decision === 'rejeté' ? '#ef4444' : 'white'}; color: ${d.decision === 'rejeté' ? 'white' : 'var(--slate-600)'}; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 4px; transition: all 0.1s;">
              ${MOD_ICONS.x} Rejeter
            </button>
          </div>
          ${d.decision === 'rejeté' ? `
            <input type="text" placeholder="Motif du refus (optionnel)"
              value="${d.note || ''}"
              oninput="setNote('${item.id}', this.value)"
              style="width: 220px; padding: 6px 10px; border: 1px solid #fca5a5; border-radius: 6px; font-size: 0.8rem; color: var(--slate-700);">
          ` : ''}
        </div>

      </div>
    </div>
  `;
}

function buildEditableFields(item) {
  if (item.item_type === 'invoice') {
    return `
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.7rem; color: var(--slate-500); display: block; margin-bottom: 2px;">Montant (€)</label>
          <input type="number" step="0.01" value="${item.amount || ''}" placeholder="0.00"
            onchange="updateField('${item.id}', 'invoice', { amount: this.value })"
            style="width: 110px; padding: 5px 8px; border: 1px solid var(--slate-200); border-radius: 6px; font-size: 0.8rem;">
        </div>
        <div>
          <label style="font-size: 0.7rem; color: var(--slate-500); display: block; margin-bottom: 2px;">Date</label>
          <input type="date" value="${item.date || ''}"
            onchange="updateField('${item.id}', 'invoice', { date: this.value })"
            style="padding: 5px 8px; border: 1px solid var(--slate-200); border-radius: 6px; font-size: 0.8rem;">
        </div>
      </div>`;
  }
  if (item.item_type === 'document') {
    return `
      <div style="margin-top: 8px;">
        <label style="font-size: 0.7rem; color: var(--slate-500); display: block; margin-bottom: 2px;">Date d'expiration</label>
        <input type="date" value="${item.expiry_date || ''}"
          onchange="updateField('${item.id}', 'document', { expiry_date: this.value })"
          style="padding: 5px 8px; border: 1px solid var(--slate-200); border-radius: 6px; font-size: 0.8rem;">
      </div>`;
  }
  if (item.item_type === 'photo') {
    const typeLabel = item.photo_type === 'before' ? 'Avant' : 'Après';
    return `<span style="font-size: 0.75rem; color: var(--slate-400); margin-top: 4px; display: block;">Type : ${typeLabel} — ${item.uploaded_at ? item.uploaded_at.slice(0, 10) : ''}</span>`;
  }
  return '';
}

function getTypeLabel(item) {
  if (item.item_type === 'invoice') return 'Facture';
  if (item.item_type === 'document') return 'Document légal';
  if (item.item_type === 'photo') return 'Photo';
  return '';
}

function getContextLabel(item) {
  if (item.item_type === 'invoice') return item.project_title || 'Projet inconnu';
  if (item.item_type === 'document') {
    const labels = {
      kbis: 'KBIS', assurance_decennale: 'Assurance décennale',
      attestation_vigilance_urssaf: 'URSSAF', liste_salaries_etrangers: 'Liste salariés étrangers',
      declaration_honneur: "Déclaration sur l'honneur"
    };
    return labels[item.document_type] || item.document_type;
  }
  if (item.item_type === 'photo') return item.project_title || 'Projet inconnu';
  return '';
}

function setDecision(itemId, decision) {
  if (!decisions[itemId]) decisions[itemId] = { decision: null, note: '' };
  // Toggle off if same decision clicked again
  decisions[itemId].decision = decisions[itemId].decision === decision ? null : decision;
  renderModeration();
}

function setNote(itemId, note) {
  if (!decisions[itemId]) decisions[itemId] = { decision: 'rejeté', note: '' };
  decisions[itemId].note = note;
}

async function updateField(itemId, itemType, fields) {
  try {
    await fetch('/api/moderation/item', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, item_type: itemType, ...fields }),
    });
  } catch (err) {
    console.error('Field update error:', err);
  }
}

async function submitModeration() {
  const toSubmit = Object.entries(decisions)
    .filter(([, d]) => d.decision !== null)
    .map(([id, d]) => {
      // Find item_type
      let item_type = null;
      for (const artisan of pendingByArtisan) {
        const found = artisan.items.find(i => i.id === id);
        if (found) { item_type = found.item_type; break; }
      }
      return { id, item_type, decision: d.decision, note: d.note };
    })
    .filter(d => d.item_type);

  if (!toSubmit.length) {
    alert('Veuillez approuver ou rejeter au moins un document.');
    return;
  }

  const undecided = pendingByArtisan.reduce((n, a) => n + a.items.length, 0) - toSubmit.length;
  if (undecided > 0) {
    if (!confirm(`${undecided} document(s) n'ont pas de décision. Continuer quand même ?`)) return;
  }

  const btn = document.getElementById('submit-mod-btn');
  btn.textContent = 'Envoi en cours...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/moderation/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisions: toSubmit }),
    });
    const data = await res.json();

    if (data.success) {
      const msg = data.emailErrors
        ? `Décisions enregistrées. Erreur d'envoi pour : ${data.emailErrors.join(', ')}`
        : `Décisions enregistrées et emails envoyés aux artisans.`;
      alert(msg);
      await loadModeration();
    }
  } catch (err) {
    alert('Erreur lors de l\'envoi des décisions.');
  } finally {
    btn.textContent = 'Envoyer les décisions';
    btn.disabled = false;
  }
}
