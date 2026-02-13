/**
 * Artisan Profile Page (js/artisan-profile.js)
 * ----------------------------------------------
 * Admin-only page showing detailed artisan information:
 * - Profile info
 * - Projects (with filtering)
 * - Invoices
 * - Documents with status
 */

const PROFILE_ICONS = {
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  folder: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  mapPin: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  mail: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  phone: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  download: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

let artisan = null;
let projects = [];
let invoices = [];
let documents = [];
let activeTab = 'overview';

const user = initLayout('directory'); // Use 'directory' to keep that menu item active
if (user) {
  if (user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML = '<div class="alert alert-error">Accès réservé aux administrateurs.</div>';
  } else {
    loadArtisanProfile();
  }
}

async function loadArtisanProfile() {
  const container = document.getElementById('page-content');

  // Get artisan ID from URL
  const params = new URLSearchParams(window.location.search);
  const artisanId = params.get('id');

  if (!artisanId) {
    container.innerHTML = '<div class="alert alert-error">ID artisan manquant.</div>';
    return;
  }

  try {
    // Fetch artisan data
    const [artisanRes, projectsRes, invoicesRes, documentsRes] = await Promise.all([
      fetch(`/api/users`),
      fetch(`/api/projects?userId=${artisanId}&role=ARTISAN`),
      fetch(`/api/invoices?artisanId=${artisanId}`),
      fetch(`/api/documents/${artisanId}`)
    ]);

    const allUsers = await artisanRes.json();
    artisan = allUsers.find(u => u.id === artisanId);

    if (!artisan) {
      container.innerHTML = '<div class="alert alert-error">Artisan non trouvé.</div>';
      return;
    }

    projects = await projectsRes.json();
    invoices = await invoicesRes.json();
    documents = await documentsRes.json();

    renderProfile();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement du profil.</div>';
    console.error('Profile error:', err);
  }
}

function renderProfile() {
  const container = document.getElementById('page-content');

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Back button -->
      <div>
        <a href="/pro/portail/directory" class="btn btn-secondary" style="width: auto; display: inline-flex; align-items: center; gap: 8px;">
          ${PROFILE_ICONS.arrowLeft}
          Retour à l'annuaire
        </a>
      </div>

      <!-- Profile Header -->
      ${renderProfileHeader()}

      <!-- Tabs -->
      <div class="card">
        <div class="tabs">
          <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="switchTab('overview')">
            ${PROFILE_ICONS.user}
            Vue d'ensemble
          </button>
          <button class="tab-btn ${activeTab === 'projects' ? 'active' : ''}" onclick="switchTab('projects')">
            ${PROFILE_ICONS.briefcase}
            Projets (${projects.length})
          </button>
          <button class="tab-btn ${activeTab === 'invoices' ? 'active' : ''}" onclick="switchTab('invoices')">
            ${PROFILE_ICONS.fileText}
            Factures (${invoices.length})
          </button>
          <button class="tab-btn ${activeTab === 'documents' ? 'active' : ''}" onclick="switchTab('documents')">
            ${PROFILE_ICONS.folder}
            Documents (${documents.filter(d => d.file_name || d.is_not_concerned).length}/${documents.length})
          </button>
        </div>

        <div class="tab-content">
          ${renderTabContent()}
        </div>
      </div>
    </div>
  `;
}

function renderProfileHeader() {
  const statusBadge = artisan.documents_status === 'compliant'
    ? '<span class="badge badge-complete">Documents conformes</span>'
    : artisan.documents_status === 'expired'
    ? '<span class="badge" style="background: var(--red-100); color: var(--red-700);">Documents expirés</span>'
    : '<span class="badge badge-pending">Documents manquants</span>';

  return `
    <div class="card">
      <div class="card-body">
        <div style="display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;">
          <!-- Avatar -->
          <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--blue-100); color: var(--blue-700); display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; flex-shrink: 0;">
            ${artisan.name.charAt(0)}
          </div>

          <!-- Info -->
          <div style="flex: 1; min-width: 300px;">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
              <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--slate-900); margin: 0;">
                ${artisan.name}
              </h2>
              ${statusBadge}
            </div>

            <div style="display: grid; gap: 8px; color: var(--slate-600);">
              ${artisan.company_name ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${PROFILE_ICONS.briefcase}
                  <span>${artisan.company_name}</span>
                </div>
              ` : ''}
              ${artisan.specialty ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600;">Spécialité:</span>
                  <span>${artisan.specialty}</span>
                </div>
              ` : ''}
              <div style="display: flex; align-items: center; gap: 8px;">
                ${PROFILE_ICONS.mail}
                <a href="mailto:${artisan.email}" style="color: var(--blue-600);">${artisan.email}</a>
              </div>
              ${artisan.address ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${PROFILE_ICONS.mapPin}
                  <span>${artisan.address}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Stats -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; min-width: 300px;">
            <div style="text-align: center; padding: 12px; background: var(--slate-50); border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--blue-600);">${projects.length}</div>
              <div style="font-size: 0.875rem; color: var(--slate-600);">Projets</div>
            </div>
            <div style="text-align: center; padding: 12px; background: var(--slate-50); border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--green-600);">${invoices.filter(i => i.status === 'Payé').length}</div>
              <div style="font-size: 0.875rem; color: var(--slate-600);">Factures payées</div>
            </div>
            <div style="text-align: center; padding: 12px; background: var(--slate-50); border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: 700; color: var(--amber-600);">${invoices.filter(i => i.status === 'En attente').length}</div>
              <div style="font-size: 0.875rem; color: var(--slate-600);">En attente</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTabContent() {
  switch (activeTab) {
    case 'overview':
      return renderOverviewTab();
    case 'projects':
      return renderProjectsTab();
    case 'invoices':
      return renderInvoicesTab();
    case 'documents':
      return renderDocumentsTab();
    default:
      return '';
  }
}

function renderOverviewTab() {
  const completedProjects = projects.filter(p => p.status === 'Terminé');
  const activeProjects = projects.filter(p => p.status === 'En cours');
  const totalRevenue = invoices.filter(i => i.status === 'Payé').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'En attente').reduce((sum, inv) => sum + inv.amount, 0);

  const compliantDocs = documents.filter(d => (d.status === 'valid' && d.file_name) || d.is_not_concerned).length;
  const expiredDocs = documents.filter(d => d.status === 'expired' && !d.is_not_concerned).length;
  const missingDocs = documents.filter(d => d.status === 'missing' && !d.is_not_concerned && !d.file_name).length;

  return `
    <div class="card-body">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        <!-- Projects Summary -->
        <div style="padding: 20px; background: var(--blue-50); border-radius: 8px; border-left: 4px solid var(--blue-500);">
          <h4 style="font-weight: 600; color: var(--blue-900); margin-bottom: 12px;">Projets</h4>
          <div style="display: flex; flex-direction: column; gap: 8px; color: var(--blue-700);">
            <div>✓ ${completedProjects.length} terminés</div>
            <div>⏱ ${activeProjects.length} en cours</div>
            <div>📋 ${projects.length} total</div>
          </div>
        </div>

        <!-- Revenue Summary -->
        <div style="padding: 20px; background: var(--green-50); border-radius: 8px; border-left: 4px solid var(--green-500);">
          <h4 style="font-weight: 600; color: var(--green-900); margin-bottom: 12px;">Revenus</h4>
          <div style="display: flex; flex-direction: column; gap: 8px; color: var(--green-700);">
            <div>💰 ${totalRevenue.toFixed(2)} € payés</div>
            <div>⏳ ${pendingRevenue.toFixed(2)} € en attente</div>
            <div>📊 ${invoices.length} factures</div>
          </div>
        </div>

        <!-- Documents Summary -->
        <div style="padding: 20px; background: ${expiredDocs > 0 || missingDocs > 0 ? 'var(--red-50)' : 'var(--green-50)'}; border-radius: 8px; border-left: 4px solid ${expiredDocs > 0 || missingDocs > 0 ? 'var(--red-500)' : 'var(--green-500)'};">
          <h4 style="font-weight: 600; color: ${expiredDocs > 0 || missingDocs > 0 ? 'var(--red-900)' : 'var(--green-900)'}; margin-bottom: 12px;">Documents</h4>
          <div style="display: flex; flex-direction: column; gap: 8px; color: ${expiredDocs > 0 || missingDocs > 0 ? 'var(--red-700)' : 'var(--green-700)'};">
            <div>✓ ${compliantDocs} conformes</div>
            ${expiredDocs > 0 ? `<div>⚠ ${expiredDocs} expirés</div>` : ''}
            ${missingDocs > 0 ? `<div>❌ ${missingDocs} manquants</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div style="margin-top: 24px;">
        <h4 style="font-weight: 600; color: var(--slate-900); margin-bottom: 16px;">Projets récents</h4>
        ${projects.length === 0
          ? '<p style="color: var(--slate-500); text-align: center; padding: 20px;">Aucun projet</p>'
          : projects.slice(0, 5).map(p => `
            <div style="padding: 12px; border-bottom: 1px solid var(--slate-200);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; color: var(--slate-900);">${p.title}</div>
                  <div style="font-size: 0.875rem; color: var(--slate-500); margin-top: 4px;">
                    ${p.client_company || p.client_name} • ${p.start_date || 'Date non définie'}
                  </div>
                </div>
                <span class="badge ${p.status === 'Terminé' ? 'badge-complete' : p.status === 'En cours' ? 'badge-progress' : 'badge-pending'}">
                  ${p.status}
                </span>
              </div>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

function renderProjectsTab() {
  if (projects.length === 0) {
    return '<div class="card-body"><p style="text-align: center; color: var(--slate-500); padding: 40px;">Aucun projet trouvé.</p></div>';
  }

  return `
    <div class="card-body" style="padding: 0;">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Projet</th>
              <th>Client</th>
              <th>Date de début</th>
              <th>Statut</th>
              <th>Fin de travaux</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map(p => `
              <tr>
                <td>
                  <div style="font-weight: 600; color: var(--slate-900);">${p.title}</div>
                  ${p.description ? `<div style="font-size: 0.875rem; color: var(--slate-500); margin-top: 4px;">${p.description}</div>` : ''}
                </td>
                <td>${p.client_company || p.client_name}</td>
                <td>${p.start_date || 'N/A'}</td>
                <td>
                  <span class="badge ${p.status === 'Terminé' ? 'badge-complete' : p.status === 'En cours' ? 'badge-progress' : 'badge-pending'}">
                    ${p.status}
                  </span>
                </td>
                <td>
                  ${p.end_of_work_signed
                    ? `<span style="color: var(--green-600); display: flex; align-items: center; gap: 4px;">${PROFILE_ICONS.checkCircle} Signé</span>`
                    : '<span style="color: var(--slate-400);">Non signé</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderInvoicesTab() {
  if (invoices.length === 0) {
    return '<div class="card-body"><p style="text-align: center; color: var(--slate-500); padding: 40px;">Aucune facture trouvée.</p></div>';
  }

  const totalPaid = invoices.filter(i => i.status === 'Payé').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'En attente').reduce((sum, inv) => sum + inv.amount, 0);

  return `
    <div class="card-body">
      <!-- Summary -->
      <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px; padding: 16px; background: var(--green-50); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--green-700); margin-bottom: 4px;">Total payé</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--green-700);">${totalPaid.toFixed(2)} €</div>
        </div>
        <div style="flex: 1; min-width: 200px; padding: 16px; background: var(--amber-50); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--amber-700); margin-bottom: 4px;">En attente</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--amber-700);">${totalPending.toFixed(2)} €</div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Facture</th>
              <th>Projet</th>
              <th>Date</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => {
              const project = projects.find(p => p.id === inv.project_id);
              return `
                <tr>
                  <td style="font-weight: 600; color: var(--slate-900);">${inv.file_name}</td>
                  <td>${project ? project.title : 'Projet inconnu'}</td>
                  <td>${inv.date || 'N/A'}</td>
                  <td style="font-weight: 600; color: var(--slate-900);">${inv.amount.toFixed(2)} €</td>
                  <td>
                    <span class="badge ${inv.status === 'Payé' ? 'badge-complete' : inv.status === 'Rejeté' ? 'badge-cancelled' : 'badge-pending'}">
                      ${inv.status}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDocumentsTab() {
  const compliantDocs = documents.filter(d => (d.status === 'valid' && d.file_name) || d.is_not_concerned).length;
  const expiredDocs = documents.filter(d => d.status === 'expired' && !d.is_not_concerned).length;
  const missingDocs = documents.filter(d => !d.file_name && !d.is_not_concerned).length;

  return `
    <div class="card-body">
      <!-- Summary -->
      <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 150px; padding: 16px; background: var(--green-50); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--green-700); margin-bottom: 4px;">Conformes</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--green-700);">${compliantDocs}</div>
        </div>
        <div style="flex: 1; min-width: 150px; padding: 16px; background: var(--red-50); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--red-700); margin-bottom: 4px;">Expirés</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--red-700);">${expiredDocs}</div>
        </div>
        <div style="flex: 1; min-width: 150px; padding: 16px; background: var(--amber-50); border-radius: 8px;">
          <div style="font-size: 0.875rem; color: var(--amber-700); margin-bottom: 4px;">Manquants</div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--amber-700);">${missingDocs}</div>
        </div>
      </div>

      <!-- Documents List -->
      ${documents.map(doc => renderDocumentRow(doc)).join('')}
    </div>
  `;
}

function renderDocumentRow(doc) {
  let statusBadge = '';
  if (doc.is_not_concerned) {
    statusBadge = '<span class="badge" style="background: var(--slate-200); color: var(--slate-600);">Non concerné</span>';
  } else if (doc.status === 'valid' && doc.file_name) {
    statusBadge = '<span class="badge badge-complete">Conforme</span>';
  } else if (doc.status === 'expired') {
    statusBadge = '<span class="badge" style="background: var(--red-100); color: var(--red-700);">Expiré</span>';
  } else {
    statusBadge = '<span class="badge badge-pending">Manquant</span>';
  }

  let expiryInfo = '';
  if (doc.expiry_date && !doc.is_not_concerned) {
    const expiry = new Date(doc.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      expiryInfo = `<span style="color: var(--red-600); font-size: 0.875rem;">Expiré le ${formatDate(doc.expiry_date)}</span>`;
    } else if (daysUntilExpiry < 30) {
      expiryInfo = `<span style="color: var(--amber-600); font-size: 0.875rem;">Expire le ${formatDate(doc.expiry_date)} (${daysUntilExpiry}j)</span>`;
    } else {
      expiryInfo = `<span style="color: var(--slate-500); font-size: 0.875rem;">Expire le ${formatDate(doc.expiry_date)}</span>`;
    }
  }

  return `
    <div style="padding: 16px; border-bottom: 1px solid var(--slate-200);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="flex: 1; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <h4 style="font-weight: 600; color: var(--slate-800); margin: 0;">${doc.label}</h4>
            ${statusBadge}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${doc.upload_date ? `<span style="color: var(--slate-400); font-size: 0.875rem;">Téléchargé le ${formatDate(doc.upload_date)}</span>` : ''}
            ${expiryInfo}
            ${doc.file_name ? `<span style="color: var(--slate-500); font-size: 0.875rem;">📎 ${doc.file_name}</span>` : ''}
          </div>
        </div>

        ${doc.file_name && !doc.is_not_concerned ? `
          <button class="btn btn-secondary" style="width: auto;" onclick="downloadDocument('${doc.file_name}')">
            ${PROFILE_ICONS.download}
            Télécharger
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function switchTab(tab) {
  activeTab = tab;
  renderProfile();
}

function downloadDocument(filename) {
  window.open(`/api/documents/download/${filename}`, '_blank');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}
