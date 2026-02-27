/**
 * Moderation Page Logic (js/portal/moderation.js)
 * -------------------------------------------------
 * Admin-only page to moderate uploaded invoices,
 * legal documents and project photos.
 */

const MOD_ICONS = {
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x:     '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  eye:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  send:  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  inbox: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
};

let pendingByArtisan = [];
let decisions = {};

const user = initLayout('moderation');
if (user) {
  if (user.role !== 'ADMIN') {
    document.getElementById('page-content').innerHTML = '<div class="alert alert-error">Accès réservé aux administrateurs.</div>';
  } else {
    loadModeration();
  }
}

async function loadModeration() {
  const container = document.getElementById('page-content');
  container.innerHTML = '<div class="loading">Chargement...</div>';
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
  const container = document.getElementById('page-content');
  const totalItems = pendingByArtisan.reduce((n, a) => n + a.items.length, 0);

  container.innerHTML = `
    <div class="space-y-6">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800);">
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

  const borderColor = d.decision === 'approuvé' ? '#22c55e' : d.decision === 'rejeté' ? '#ef4444' : 'var(--slate-200)';
  const bgColor = d.decision === 'approuvé' ? '#f0fdf4' : d.decision === 'rejeté' ? '#fef2f2' : 'white';

  return `
    <div id="row-${item.id}" style="border: 1.5px solid ${borderColor}; background: ${bgColor}; border-radius: 8px; margin-bottom: 10px; padding: 14px; transition: all 0.15s;">
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

  const totalItems = pendingByArtisan.reduce((n, a) => n + a.items.length, 0);
  const undecided = totalItems - toSubmit.length;
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
        : 'Décisions enregistrées et emails envoyés aux artisans.';
      alert(msg);
      loadModeration();
    }
  } catch (err) {
    alert("Erreur lors de l'envoi des décisions.");
  } finally {
    btn.textContent = 'Envoyer les décisions';
    btn.disabled = false;
  }
}
