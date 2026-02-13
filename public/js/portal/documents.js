/**
 * Documents Page Logic (js/documents.js)
 * ----------------------------------------
 * Artisan document management page with upload functionality.
 */

const DOC_ICONS = {
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  upload: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  download: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
};

let allDocuments = [];
let currentUser = null;

const user = initLayout('documents');
if (user) {
  currentUser = user;
  loadDocuments(user);
}

async function loadDocuments(user) {
  const container = document.getElementById('page-content');

  // Only artisans can upload documents
  if (user.role !== 'ARTISAN') {
    container.innerHTML = `
      <div class="alert alert-error">
        Cette page est réservée aux artisans.
      </div>
    `;
    return;
  }

  try {
    const res = await fetch(`/api/documents/${user.id}`);
    allDocuments = await res.json();
    renderDocuments();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement des documents.</div>';
    console.error('Documents error:', err);
  }
}

function renderDocuments() {
  const container = document.getElementById('page-content');

  // Count document statuses
  const validDocs = allDocuments.filter(d => d.status === 'valid' || d.is_not_concerned).length;
  const expiredDocs = allDocuments.filter(d => d.status === 'expired').length;
  const missingDocs = allDocuments.filter(d => d.status === 'missing' && !d.is_not_concerned).length;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--slate-900); display: flex; align-items: center; gap: 12px;">
          ${DOC_ICONS.fileText}
          Gestion des documents
        </h2>
        <p style="color: var(--slate-500); margin-top: 8px;">
          Téléchargez et gérez vos documents de conformité administratifs.
        </p>
      </div>

      <!-- Status Overview -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="stat-card" style="background: var(--green-50); border-left: 4px solid var(--green-500);">
          <div>
            <p class="stat-title" style="color: var(--green-700);">Conformes</p>
            <h3 class="stat-value" style="color: var(--green-700);">${validDocs}</h3>
          </div>
          <div class="stat-icon green">${DOC_ICONS.checkCircle}</div>
        </div>
        <div class="stat-card" style="background: var(--red-50); border-left: 4px solid var(--red-500);">
          <div>
            <p class="stat-title" style="color: var(--red-700);">Expirés</p>
            <h3 class="stat-value" style="color: var(--red-700);">${expiredDocs}</h3>
          </div>
          <div class="stat-icon" style="background: var(--red-100); color: var(--red-600);">${DOC_ICONS.alertCircle}</div>
        </div>
        <div class="stat-card" style="background: var(--amber-50); border-left: 4px solid var(--amber-500);">
          <div>
            <p class="stat-title" style="color: var(--amber-700);">Manquants</p>
            <h3 class="stat-value" style="color: var(--amber-700);">${missingDocs}</h3>
          </div>
          <div class="stat-icon amber">${DOC_ICONS.alertCircle}</div>
        </div>
      </div>

      <!-- Documents List -->
      <div class="card">
        <div class="card-header">
          <h3>Documents requis</h3>
        </div>
        <div class="card-body" style="padding: 0;">
          ${allDocuments.map(doc => renderDocumentRow(doc)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderDocumentRow(doc) {
  // Status badge
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

  // Expiry date display
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

  // Upload date
  let uploadInfo = '';
  if (doc.upload_date) {
    uploadInfo = `<span style="color: var(--slate-400); font-size: 0.875rem;">Téléchargé le ${formatDate(doc.upload_date)}</span>`;
  }

  // Download template button
  let templateButton = '';
  if (doc.downloadable && !doc.file_name && !doc.is_not_concerned) {
    templateButton = `
      <button class="btn btn-secondary" style="width: auto; font-size: 0.875rem;" onclick="downloadTemplate('${doc.document_type}')">
        ${DOC_ICONS.download}
        Télécharger le modèle
      </button>
    `;
  }

  return `
    <div style="padding: 20px; border-bottom: 1px solid var(--slate-200);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <h4 style="font-weight: 600; color: var(--slate-800); margin: 0;">${doc.label}</h4>
            ${statusBadge}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${uploadInfo}
            ${expiryInfo}
            ${doc.file_name ? `<span style="color: var(--slate-500); font-size: 0.875rem;">📎 ${doc.file_name}</span>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          ${templateButton}

          ${doc.file_name && !doc.is_not_concerned ? `
            <button class="btn btn-secondary" style="width: auto;" onclick="downloadDocument('${doc.file_name}')">
              ${DOC_ICONS.download}
              Télécharger
            </button>
          ` : ''}

          ${!doc.is_not_concerned ? `
            <label class="btn btn-primary" style="width: auto; cursor: pointer; margin: 0;">
              ${DOC_ICONS.upload}
              ${doc.file_name ? 'Remplacer' : 'Télécharger'}
              <input type="file" id="file-${doc.document_type}" accept=".pdf,.jpg,.jpeg,.png"
                     onchange="uploadDocument('${doc.document_type}', this)" style="display: none;">
            </label>
          ` : ''}

          ${doc.file_name && !doc.is_not_concerned ? `
            <button class="action-btn delete" onclick="deleteDocument('${doc.id}', '${doc.label}')" title="Supprimer">
              ${DOC_ICONS.trash}
            </button>
          ` : ''}

          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; user-select: none;">
            <input type="checkbox" ${doc.is_not_concerned ? 'checked' : ''}
                   onchange="toggleNotConcerned('${doc.document_type}', this.checked)"
                   style="width: 18px; height: 18px; cursor: pointer;">
            <span style="font-size: 0.875rem; color: var(--slate-600);">Non concerné</span>
          </label>
        </div>
      </div>
    </div>
  `;
}

async function uploadDocument(documentType, inputElement) {
  const file = inputElement.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('artisan_id', currentUser.id);
  formData.append('document_type', documentType);

  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    // Reload documents
    await loadDocuments(currentUser);
    alert('Document téléchargé avec succès!');

  } catch (err) {
    alert('Erreur lors du téléchargement du document.');
    console.error(err);
  } finally {
    inputElement.value = ''; // Reset input
  }
}

async function toggleNotConcerned(documentType, isNotConcerned) {
  try {
    const res = await fetch('/api/documents/not-concerned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artisan_id: currentUser.id,
        document_type: documentType,
        is_not_concerned: isNotConcerned
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    // Reload documents
    await loadDocuments(currentUser);

  } catch (err) {
    alert('Erreur lors de la mise à jour.');
    console.error(err);
  }
}

async function deleteDocument(docId, docLabel) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer "${docLabel}" ?\n\nCette action est irréversible.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/documents/${docId}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    // Reload documents
    await loadDocuments(currentUser);
    alert('Document supprimé avec succès!');

  } catch (err) {
    alert('Erreur lors de la suppression.');
    console.error(err);
  }
}

function downloadDocument(filename) {
  window.open(`/api/documents/download/${filename}`, '_blank');
}

function downloadTemplate(documentType) {
  window.open(`/api/documents/templates/${documentType}`, '_blank');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}
