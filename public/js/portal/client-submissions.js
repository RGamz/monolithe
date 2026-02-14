/**
 * Client Submissions Admin Page (client-submissions.js)
 * =====================================================
 * Shows all contact and devis form submissions to admin.
 * Two tabs: "Contacts" and "Demandes de devis"
 * Each row expandable to see full detail in a modal.
 */

const SUB_ICONS = {
  mail: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

let contacts = [];
let devis = [];
let activeTab = 'contacts';
let currentDetailItem = null;

// ------------------------------------------------------------------
// INIT
// ------------------------------------------------------------------
const user = initLayout('client-submissions');
if (user) {
  if (user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML =
      '<div class="alert alert-error">Accès réservé aux administrateurs.</div>';
  } else {
    loadSubmissions();
  }
}

async function loadSubmissions() {
  try {
    const res = await fetch('/api/forms/submissions');
    const data = await res.json();
    contacts = data.contacts || [];
    devis = data.devis || [];
    render();
  } catch (err) {
    document.getElementById('page-content').innerHTML =
      '<div class="alert alert-error">Erreur lors du chargement des demandes.</div>';
  }
}

// ------------------------------------------------------------------
// RENDER
// ------------------------------------------------------------------
function render() {
  const container = document.getElementById('page-content');

  const contactCount = contacts.length;
  const devisCount = devis.length;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div>
          <h2 style="font-size:1.25rem;font-weight:700;color:var(--slate-800);display:flex;align-items:center;gap:8px;">
            ${SUB_ICONS.inbox}
            Demandes clients
          </h2>
          <p class="text-sm" style="color:var(--slate-500);margin-top:4px;">
            ${contactCount + devisCount} demande${(contactCount + devisCount) > 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--slate-200);">
        <button id="tab-contacts" class="tab-btn ${activeTab === 'contacts' ? 'tab-active' : ''}" onclick="switchTab('contacts')">
          ${SUB_ICONS.mail}
          Contacts
          <span class="tab-count">${contactCount}</span>
        </button>
        <button id="tab-devis" class="tab-btn ${activeTab === 'devis' ? 'tab-active' : ''}" onclick="switchTab('devis')">
          ${SUB_ICONS.file}
          Demandes de devis
          <span class="tab-count">${devisCount}</span>
        </button>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead id="table-head"></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderTable();
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-contacts').className = 'tab-btn ' + (tab === 'contacts' ? 'tab-active' : '');
  document.getElementById('tab-devis').className = 'tab-btn ' + (tab === 'devis' ? 'tab-active' : '');
  renderTable();
}

function renderTable() {
  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');

  if (activeTab === 'contacts') {
    thead.innerHTML = `<tr>
      <th>Date</th><th>Source</th><th>Nom</th><th>Email</th><th>Sujet / Type</th><th style="text-align:right;">Actions</th>
    </tr>`;

    if (contacts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px;">Aucune demande de contact.</td></tr>';
      return;
    }

    tbody.innerHTML = contacts.map(c => {
      const date = formatDate(c.created_at);
      const sourceBadge = c.source === 'pro'
        ? '<span class="badge" style="background:var(--slate-800);color:white;">PRO</span>'
        : '<span class="badge" style="background:var(--blue-100);color:var(--blue-700);">Client</span>';
      const topic = c.request_type || c.subject || '—';

      return `<tr>
        <td style="white-space:nowrap;">${date}</td>
        <td>${sourceBadge}</td>
        <td style="font-weight:500;color:var(--slate-800);">${esc(c.name)}</td>
        <td>${esc(c.email)}</td>
        <td>${esc(topic)}</td>
        <td style="text-align:right;">
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="action-btn edit" onclick="viewContact('${c.id}')" title="Voir">${SUB_ICONS.eye}</button>
            <button class="action-btn delete" onclick="deleteSubmission('contact','${c.id}')" title="Supprimer">${SUB_ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join('');

  } else {
    thead.innerHTML = `<tr>
      <th>Date</th><th>Nom</th><th>Email</th><th>Projet</th><th>Estimation</th><th style="text-align:right;">Actions</th>
    </tr>`;

    if (devis.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:32px;">Aucune demande de devis.</td></tr>';
      return;
    }

    tbody.innerHTML = devis.map(d => {
      const date = formatDate(d.created_at);
      const project = d.project_category || '—';
      const estimate = d.estimate_low && d.estimate_high
        ? `${Number(d.estimate_low).toLocaleString()} - ${Number(d.estimate_high).toLocaleString()} €`
        : '—';

      return `<tr>
        <td style="white-space:nowrap;">${date}</td>
        <td style="font-weight:500;color:var(--slate-800);">${esc(d.name)}</td>
        <td>${esc(d.email)}</td>
        <td>${esc(project)}</td>
        <td style="font-weight:500;">${estimate}</td>
        <td style="text-align:right;">
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="action-btn edit" onclick="viewDevis('${d.id}')" title="Voir">${SUB_ICONS.eye}</button>
            <button class="action-btn delete" onclick="deleteSubmission('devis','${d.id}')" title="Supprimer">${SUB_ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
}

// ------------------------------------------------------------------
// DETAIL MODAL
// ------------------------------------------------------------------
function viewContact(id) {
  const c = contacts.find(x => x.id === id);
  if (!c) return;

  currentDetailItem = { type: 'contact', id };
  document.getElementById('detail-title').textContent = 'Contact — ' + c.name;

  const rows = [
    ['Date', formatDate(c.created_at)],
    ['Source', c.source === 'pro' ? 'Espace Pro' : 'Site client'],
    ['Nom', c.name],
    ['Email', `<a href="mailto:${esc(c.email)}" style="color:var(--blue-600);">${esc(c.email)}</a>`],
    ['Téléphone', c.phone || '—'],
    ['Entreprise', c.company || '—'],
    ['Sujet', c.subject || '—'],
    ['Type demande', c.request_type || '—'],
    ['Message', c.message ? `<div style="white-space:pre-wrap;background:var(--slate-50);padding:12px;border-radius:8px;margin-top:4px;">${esc(c.message)}</div>` : '—'],
  ];

  document.getElementById('detail-body').innerHTML = renderDetailRows(rows);
  document.getElementById('detail-backdrop').classList.remove('hidden');
}

function viewDevis(id) {
  const d = devis.find(x => x.id === id);
  if (!d) return;

  currentDetailItem = { type: 'devis', id };
  document.getElementById('detail-title').textContent = 'Devis — ' + d.name;

  const estimate = d.estimate_low && d.estimate_high
    ? `${Number(d.estimate_low).toLocaleString()} - ${Number(d.estimate_high).toLocaleString()} € (moy. ${Number(d.estimate_average).toLocaleString()} €)`
    : '—';

  const rows = [
    ['Date', formatDate(d.created_at)],
    ['Nom', d.name],
    ['Email', `<a href="mailto:${esc(d.email)}" style="color:var(--blue-600);">${esc(d.email)}</a>`],
    ['Téléphone', d.phone || '—'],
    ['Catégorie', d.project_category || '—'],
    ['Type de bien', d.property_type || '—'],
    ['Âge du bien', d.property_age || '—'],
    ['Type travaux', d.renovation_type || '—'],
    ['Surface', d.area ? d.area + ' m²' : '—'],
    ['État actuel', d.current_condition || '—'],
    ['Délai', d.timeline || '—'],
    ['Code postal', d.zip_code || '—'],
    ['Estimation', `<strong style="color:var(--blue-600);">${estimate}</strong>`],
    ['Message', d.project_description ? `<div style="white-space:pre-wrap;background:var(--slate-50);padding:12px;border-radius:8px;margin-top:4px;">${esc(d.project_description)}</div>` : '—'],
  ];

  document.getElementById('detail-body').innerHTML = renderDetailRows(rows);
  document.getElementById('detail-backdrop').classList.remove('hidden');
}

function renderDetailRows(rows) {
  return rows.map(([label, value]) =>
    `<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--slate-100);">
      <span style="min-width:120px;font-weight:500;color:var(--slate-500);font-size:0.875rem;">${label}</span>
      <span style="color:var(--slate-800);font-size:0.875rem;flex:1;">${value}</span>
    </div>`
  ).join('');
}

function closeDetail(event) {
  if (event && event.target !== document.getElementById('detail-backdrop')) return;
  document.getElementById('detail-backdrop').classList.add('hidden');
  currentDetailItem = null;
}

function deleteFromDetail() {
  if (!currentDetailItem) return;
  deleteSubmission(currentDetailItem.type, currentDetailItem.id);
}

// ------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------
async function deleteSubmission(type, id) {
  if (!confirm('Supprimer cette demande ?')) return;

  try {
    const res = await fetch(`/api/forms/submissions/${type}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Erreur lors de la suppression.');
      return;
    }

    if (type === 'contact') {
      contacts = contacts.filter(c => c.id !== id);
    } else {
      devis = devis.filter(d => d.id !== id);
    }

    closeDetail();
    render();
  } catch (err) {
    alert('Erreur réseau.');
  }
}

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
