/**
 * Invoices Page Logic (js/invoices.js)
 * --------------------------------------
 * 1. Invoice history table with status badges
 * 2. Upload form (linked to projects)
 * 3. Compliance documents section
 */

const INVOICE_ICONS = {
  upload: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
};

/**
 * Truncate a filename keeping the extension visible.
 * e.g. "long_filename_2024.pdf" -> "long_filen....pdf"
 */
function truncateFilename(name, maxChars) {
  if (maxChars === undefined) maxChars = 10;
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) {
    return name.length > maxChars ? name.slice(0, maxChars) + '...' : name;
  }
  const base = name.slice(0, dotIndex);
  const ext = name.slice(dotIndex);
  if (base.length <= maxChars) return name;
  return base.slice(0, maxChars) + '...' + ext;
}

function buildInvoiceRow(inv, projTitle) {
  let badgeClass = 'badge-pending';
  let badgeLabel = inv.status;

  if (inv.moderation_status === 'en_attente') {
    badgeClass = 'badge-pending';
    badgeLabel = 'En attente de modération';
  } else if (inv.moderation_status === 'rejeté') {
    badgeClass = 'badge-rejected';
    badgeLabel = 'Rejeté';
  } else if (inv.status === 'Payé') {
    badgeClass = 'badge-paid';
    badgeLabel = 'Payé';
  } else if (inv.status === 'Rejeté') {
    badgeClass = 'badge-rejected';
    badgeLabel = 'Rejeté';
  }

  const canDelete = inv.moderation_status === 'en_attente' || inv.status === 'En attente';
  const shortName = truncateFilename(inv.file_name || 'facture.pdf');

  const deleteBtn = canDelete
    ? '<button class="invoice-delete-btn" title="Supprimer" onclick="deleteInvoice(\'' + inv.id + '\')">' + INVOICE_ICONS.trash + '</button>'
    : '';

  const rejectionNote = inv.moderation_note && inv.moderation_status === 'rejeté'
    ? '<br><span style="font-size:0.75rem;color:#dc2626;">Motif : ' + inv.moderation_note + '</span>'
    : '';

  return '<tr data-invoice-id="' + inv.id + '">'
    + '<td style="color: var(--slate-800);">' + (projTitle || inv.project_title || 'Projet inconnu') + '</td>'
    + '<td>' + (inv.date || 'N/A') + '</td>'
    + '<td style="font-weight: 500;">' + Number(inv.amount).toLocaleString('fr-FR') + ' €</td>'
    + '<td><span class="badge ' + badgeClass + '">' + badgeLabel + '</span>' + rejectionNote + '</td>'
    + '<td class="invoice-file-cell">'
    + '<span class="invoice-filename" title="' + inv.file_name + '" onclick="viewInvoice(\'' + (inv.file_url || '') + '\')">'
    + INVOICE_ICONS.eye + '<span>' + shortName + '</span>'
    + '</span></td>'
    + '<td class="invoice-actions-cell">' + deleteBtn + '</td>'
    + '</tr>';
}

const user = initLayout('invoices');
if (user) loadInvoices(user);

async function loadInvoices(user) {
  const container = document.getElementById('page-content');

  try {
    const [invRes, projRes] = await Promise.all([
      fetch('/api/invoices?artisanId=' + user.id),
      fetch('/api/projects?userId=' + user.id + '&role=' + user.role)
    ]);

    const invoices = await invRes.json();
    const projects = await projRes.json();

    container.innerHTML = buildInvoicesHTML(invoices, projects);

    document.getElementById('upload-form').addEventListener('submit', function(e) {
      handleUpload(e, user, projects);
    });

  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement des factures.</div>';
    console.error(err);
  }
}

function buildInvoicesHTML(invoices, projects) {
  let rows = '';
  if (invoices.length === 0) {
    rows = '<tr><td colspan="6" class="empty-state" style="padding: 32px;">Aucune facture trouvée.</td></tr>';
  } else {
    rows = invoices.map(function(inv) { return buildInvoiceRow(inv, null); }).join('');
  }

  const projectOptions = projects.map(function(p) {
    return '<option value="' + p.id + '">' + p.title + '</option>';
  }).join('');

  return '<div class="grid-2-1">'
    + '<div class="space-y-6">'
    + '<h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800);">Historique des factures</h2>'
    + '<div class="card"><div class="table-wrapper"><table class="data-table">'
    + '<thead><tr>'
    + '<th>Projet</th><th>Date</th><th>Montant</th><th>Statut</th>'
    + '<th style="width: 130px;">Fichier</th>'
    + '<th style="width: 48px;"></th>'
    + '</tr></thead>'
    + '<tbody id="invoice-table-body">' + rows + '</tbody>'
    + '</table></div></div>'
    + '<div><div class="upload-card">'
    + '<h2 class="upload-title">' + INVOICE_ICONS.upload + ' Soumettre une nouvelle facture</h2>'
    + '<form id="upload-form">'
    + '<div class="form-group"><label class="form-label">Sélectionner un projet</label>'
    + '<select id="upload-project" class="form-select" required>'
    + '<option value="">-- Choisir un projet --</option>' + projectOptions
    + '</select></div>'
    + '<div class="form-group"><label class="form-label">Montant de la facture (€)</label>'
    + '<input type="number" id="upload-amount" class="form-input" min="0" step="0.01" placeholder="0.00" required></div>'
    + '<div class="form-group"><label class="form-label">Fichier de la facture (PDF/Image)</label>'
    + '<input type="file" id="upload-file" class="file-input" accept=".pdf,.png,.jpg" required></div>'
    + '<button type="submit" id="upload-btn" class="btn btn-primary mt-2">Soumettre la facture</button>'
    + '</form></div></div></div>';
}

async function handleUpload(e, user, projects) {
  e.preventDefault();

  const projectId = document.getElementById('upload-project').value;
  const amount = parseFloat(document.getElementById('upload-amount').value);
  const fileInput = document.getElementById('upload-file');
  const btn = document.getElementById('upload-btn');

  if (!projectId || !amount || !fileInput.files[0]) return;

  btn.textContent = 'Téléchargement...';
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('artisan_id', user.id);
    formData.append('amount', amount);
    formData.append('file', fileInput.files[0]);

    const res = await fetch('/api/invoices', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur lors de l\'upload.');
    }

    const newInvoice = await res.json();

    const proj = projects.find(function(p) { return p.id === projectId; });
    const projTitle = proj ? proj.title : 'Projet inconnu';

    const tbody = document.getElementById('invoice-table-body');
    const emptyRow = tbody.querySelector('.empty-state');
    if (emptyRow) emptyRow.closest('tr').remove();

    tbody.insertAdjacentHTML('afterbegin', buildInvoiceRow(newInvoice, projTitle));

    document.getElementById('upload-project').value = '';
    document.getElementById('upload-amount').value = '';
    fileInput.value = '';

  } catch (err) {
    console.error('Upload error:', err);
    alert(err.message);
  } finally {
    btn.textContent = 'Soumettre la facture';
    btn.disabled = false;
  }
}

function viewInvoice(fileUrl) {
  if (fileUrl) {
    window.open(fileUrl, '_blank');
  } else {
    alert('Fichier non disponible.');
  }
}

async function deleteInvoice(invoiceId) {
  if (!confirm('Supprimer cette facture ? Cette action est irréversible.')) return;

  try {
    const res = await fetch('/api/invoices/' + invoiceId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artisanId: user.id }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    const row = document.querySelector('tr[data-invoice-id="' + invoiceId + '"]');
    if (row) row.remove();

    const tbody = document.getElementById('invoice-table-body');
    if (tbody && tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding: 32px;">Aucune facture trouvée.</td></tr>';
    }
  } catch (err) {
    alert('Erreur réseau.');
  }
}
