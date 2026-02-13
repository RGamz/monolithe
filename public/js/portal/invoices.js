/**
 * Invoices Page Logic (js/invoices.js)
 * --------------------------------------
 * 1. Invoice history table with status badges
 * 2. Upload form (linked to projects)
 * 3. Compliance documents section
 */

const INVOICE_ICONS = {
  upload: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
};

const user = initLayout('invoices');
if (user) loadInvoices(user);

async function loadInvoices(user) {
  const container = document.getElementById('page-content');

  try {
    const [invRes, projRes] = await Promise.all([
      fetch(`/api/invoices?artisanId=${user.id}`),
      fetch(`/api/projects?userId=${user.id}&role=${user.role}`)
    ]);

    const invoices = await invRes.json();
    const projects = await projRes.json();

    container.innerHTML = buildInvoicesHTML(invoices, projects);

    // Bind upload form
    document.getElementById('upload-form').addEventListener('submit', function(e) {
      handleUpload(e, user, projects);
    });

  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement des factures.</div>';
    console.error(err);
  }
}

function buildInvoicesHTML(invoices, projects) {
  // Table rows
  let rows = '';
  if (invoices.length === 0) {
    rows = '<tr><td colspan="5" class="empty-state" style="padding: 32px;">Aucune facture trouvée.</td></tr>';
  } else {
    rows = invoices.map(inv => {
      let badgeClass = 'badge-pending';
      if (inv.status === 'Payé') badgeClass = 'badge-paid';
      else if (inv.status === 'Rejeté') badgeClass = 'badge-rejected';

      return `
        <tr>
          <td style="color: var(--slate-800);">${inv.project_title || 'Projet inconnu'}</td>
          <td>${inv.date || 'N/A'}</td>
          <td style="font-weight: 500;">${Number(inv.amount).toLocaleString('fr-FR')} €</td>
          <td><span class="badge ${badgeClass}">${inv.status}</span></td>
          <td style="color: var(--blue-600); text-decoration: underline; cursor: pointer;">${inv.file_name}</td>
        </tr>
      `;
    }).join('');
  }

  // Project options for select
  const projectOptions = projects.map(p =>
    `<option value="${p.id}">${p.title}</option>`
  ).join('');

  return `
    <div class="grid-2-1">
      <!-- Left: Table + Compliance -->
      <div class="space-y-6">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800);">Historique des factures</h2>

        <div class="card">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Projet</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Fichier</th>
                </tr>
              </thead>
              <tbody id="invoice-table-body">
                ${rows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Compliance Section -->
        <div class="compliance-section">
          <h3>Documents de conformité</h3>
          <p>Téléchargez vos documents d'assurance et de certification ici.</p>
          <div class="compliance-buttons">
            <button class="btn btn-secondary">Télécharger l'attestation d'assurance</button>
            <button class="btn btn-secondary">Télécharger la licence commerciale</button>
          </div>
        </div>
      </div>

      <!-- Right: Upload Form -->
      <div>
        <div class="upload-card">
          <h2 class="upload-title">
            ${INVOICE_ICONS.upload}
            Soumettre une nouvelle facture
          </h2>
          <form id="upload-form">
            <div class="form-group">
              <label class="form-label">Sélectionner un projet</label>
              <select id="upload-project" class="form-select" required>
                <option value="">-- Choisir un projet --</option>
                ${projectOptions}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Montant de la facture (€)</label>
              <input type="number" id="upload-amount" class="form-input" min="0" step="0.01" placeholder="0.00" required>
            </div>

            <div class="form-group">
              <label class="form-label">Fichier de la facture (PDF/Image)</label>
              <input type="file" id="upload-file" class="file-input" accept=".pdf,.png,.jpg" required>
            </div>

            <button type="submit" id="upload-btn" class="btn btn-primary mt-2">Soumettre la facture</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

async function handleUpload(e, user, projects) {
  e.preventDefault();

  const projectId = document.getElementById('upload-project').value;
  const amount = parseFloat(document.getElementById('upload-amount').value);
  const fileInput = document.getElementById('upload-file');
  const fileName = fileInput.files[0] ? fileInput.files[0].name : 'facture.pdf';
  const btn = document.getElementById('upload-btn');

  if (!projectId || !amount) return;

  btn.textContent = 'Téléchargement...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        artisan_id: user.id,
        amount: amount,
        file_name: fileName
      })
    });

    const newInvoice = await res.json();

    // Find project title
    const proj = projects.find(p => p.id === projectId);
    const projTitle = proj ? proj.title : 'Projet inconnu';

    // Add row to table
    const tbody = document.getElementById('invoice-table-body');
    // Remove "no invoices" row if present
    const emptyRow = tbody.querySelector('.empty-state');
    if (emptyRow) emptyRow.closest('tr').remove();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--slate-800);">${projTitle}</td>
      <td>${newInvoice.date || new Date().toISOString().split('T')[0]}</td>
      <td style="font-weight: 500;">${Number(newInvoice.amount).toLocaleString('fr-FR')} €</td>
      <td><span class="badge badge-pending">${newInvoice.status}</span></td>
      <td style="color: var(--blue-600); text-decoration: underline; cursor: pointer;">${newInvoice.file_name}</td>
    `;
    tbody.prepend(tr);

    // Reset form
    document.getElementById('upload-project').value = '';
    document.getElementById('upload-amount').value = '';
    fileInput.value = '';

  } catch (err) {
    console.error('Upload error:', err);
  } finally {
    btn.textContent = 'Soumettre la facture';
    btn.disabled = false;
  }
}