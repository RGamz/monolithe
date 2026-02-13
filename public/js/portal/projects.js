/**
 * Projects Page Logic (js/projects.js)
 * --------------------------------------
 * All roles: collapsible accordion list of projects
 * Admin only: create, edit, delete projects
 * Sorted: Pending → In Progress → Completed → Cancelled
 */

const PROJ_ICONS = {
  folder: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevronUp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
};

let allProjects = [];
let allClients = [];
let allArtisans = [];
let editingProjectId = null;

const user = initLayout('projects');
if (user) loadProjects(user);

async function loadProjects(user) {
  const container = document.getElementById('page-content');

  try {
    const res = await fetch(`/api/projects?userId=${user.id}&role=${user.role}`);
    allProjects = await res.json();

    // If admin, also load clients and artisans for the form dropdowns
    if (user.role === 'ADMIN') {
      const [clientsRes, artisansRes] = await Promise.all([
        fetch('/api/users/clients'),
        fetch('/api/users/artisans'),
      ]);
      allClients = await clientsRes.json();
      allArtisans = await artisansRes.json();
      populateFormDropdowns();
    }

    renderProjects();
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement des projets.</div>';
  }
}

function populateFormDropdowns() {
  // Populate clients select
  const clientSelect = document.getElementById('pform-client');
  if (clientSelect) {
    clientSelect.innerHTML = '<option value="">Sélectionner un client</option>' +
      allClients.map(c => `<option value="${c.id}">${c.company_name || c.name}</option>`).join('');
  }

  // Populate artisans checkboxes
  const artisansContainer = document.getElementById('pform-artisans');
  if (artisansContainer) {
    artisansContainer.innerHTML = allArtisans.length === 0
      ? '<span style="color: var(--slate-400); font-style: italic; font-size: 0.875rem;">Aucun artisan disponible</span>'
      : allArtisans.map(a => `
        <label class="checkbox-label">
          <input type="checkbox" value="${a.id}" class="artisan-checkbox">
          ${a.company_name || a.name}${a.specialty ? ' (' + a.specialty + ')' : ''}
        </label>
      `).join('');
  }
}

function renderProjects() {
  const container = document.getElementById('page-content');
  const isAdmin = user.role === 'ADMIN';

  // Sort: Pending(1) → In Progress(2) → Completed(3) → Cancelled(4)
  const statusOrder = { 'En attente': 1, 'En cours': 2, 'Terminé': 3, 'Annulé': 4 };
  const sorted = [...allProjects].sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

  container.innerHTML = buildProjectsHTML(sorted, isAdmin);
}

function buildProjectsHTML(projects, isAdmin) {
  const addButton = isAdmin
    ? `<button class="btn btn-primary" style="width: auto;" onclick="openCreateProjectModal()">
        ${PROJ_ICONS.plus} Nouveau projet
      </button>`
    : '';

  const items = projects.length === 0
    ? '<div class="empty-state empty-state-bordered">Aucun projet trouvé.</div>'
    : projects.map((p, i) => accordionItem(p, i, isAdmin)).join('');

  return `
    <div class="space-y-6">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800); display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--blue-600);">${PROJ_ICONS.folder}</span>
          Suivi des projets
        </h2>
        ${addButton}
      </div>
      <div>
        ${items}
      </div>
    </div>
  `;
}

function accordionItem(project, index, isAdmin) {
  let dotClass = 'pending';
  if (project.status === 'En cours') dotClass = 'progress';
  else if (project.status === 'Terminé') dotClass = 'complete';
  else if (project.status === 'Annulé') dotClass = 'cancelled';

  let badgeClass = 'badge-pending';
  if (project.status === 'En cours') badgeClass = 'badge-progress';
  else if (project.status === 'Terminé') badgeClass = 'badge-complete';
  else if (project.status === 'Annulé') badgeClass = 'badge-cancelled';

  const artisanTags = (project.artisan_names || []).map(name =>
    `<span class="artisan-tag">${name}</span>`
  ).join('');
  const artisanDisplay = artisanTags || '<span style="color: var(--slate-400); font-style: italic;">Non assigné</span>';

  const adminActions = isAdmin ? `
    <div style="display: flex; gap: 8px; margin-left: 8px;" onclick="event.stopPropagation()">
      <button class="action-btn edit" onclick="openEditProjectModal('${project.id}')" title="Modifier">
        ${PROJ_ICONS.edit}
      </button>
      <button class="action-btn delete" onclick="confirmDeleteProject('${project.id}', '${project.title.replace(/'/g, "\\'")}')" title="Supprimer">
        ${PROJ_ICONS.trash}
      </button>
    </div>
  ` : '';

  return `
    <div class="accordion-item" id="accordion-${index}">
      <div class="accordion-header" onclick="toggleAccordion(${index})">
        <div class="accordion-left">
          <div class="status-dot ${dotClass}"></div>
          <div style="min-width: 0;">
            <h4 class="accordion-title">${project.title}</h4>
            <div class="accordion-subtitle">
              <span class="truncate">${project.client_company || project.client_name}</span>
              <span style="color: var(--slate-300);">•</span>
              <span>${artisanDisplay}</span>
            </div>
          </div>
        </div>
        <div class="accordion-right">
          <span class="badge ${badgeClass}">${project.status}</span>
          ${adminActions}
          <span class="accordion-chevron" id="chevron-${index}">${PROJ_ICONS.chevronDown}</span>
        </div>
      </div>
      <div class="accordion-body hidden" id="body-${index}">
        <div class="accordion-body-grid">
          <div>
            <p class="detail-label">Description</p>
            <p class="text-sm" style="color: var(--slate-700); line-height: 1.6;">${project.description || 'Aucune description.'}</p>
          </div>
          <div>
            <p class="detail-label">Détails</p>
            <div style="display: flex; align-items: center; gap: 8px; color: var(--slate-700); font-size: 0.875rem;">
              ${PROJ_ICONS.calendar}
              <span>Début des travaux : <strong>${project.start_date || 'N/A'}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; color: var(--slate-700); font-size: 0.875rem; margin-top: 8px;">
              <span>Fin de travaux signée : <strong>${project.end_of_work_signed ? '✓ Oui' : '✗ Non'}</strong></span>
            </div>
            <div class="mt-4">
              <p class="text-xs" style="color: var(--slate-500); margin-bottom: 4px;">Artisans assignés :</p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${(project.artisan_names || []).map(name =>
                  `<span class="artisan-tag" style="border: 1px solid var(--slate-200); padding: 4px 8px;">${name}</span>`
                ).join('') || '<span style="color: var(--slate-400); font-style: italic; font-size: 0.75rem;">Non assigné</span>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleAccordion(index) {
  const body = document.getElementById(`body-${index}`);
  const chevron = document.getElementById(`chevron-${index}`);

  if (body.classList.contains('hidden')) {
    body.classList.remove('hidden');
    chevron.innerHTML = PROJ_ICONS.chevronUp;
  } else {
    body.classList.add('hidden');
    chevron.innerHTML = PROJ_ICONS.chevronDown;
  }
}

// ---------------------------------------------------------------
// MODAL — Create / Edit
// ---------------------------------------------------------------

function openCreateProjectModal() {
  editingProjectId = null;
  document.getElementById('project-modal-title').textContent = 'Nouveau projet';
  document.getElementById('pform-submit-btn').textContent = 'Créer';

  document.getElementById('pform-id').value = '';
  document.getElementById('pform-title').value = '';
  document.getElementById('pform-client').value = '';
  document.getElementById('pform-status').value = 'En attente';
  document.getElementById('pform-start-date').value = '';
  document.getElementById('pform-description').value = '';
  document.getElementById('pform-signed').checked = false;
  document.getElementById('pform-error').classList.add('hidden');

  // Uncheck all artisan checkboxes
  document.querySelectorAll('.artisan-checkbox').forEach(cb => cb.checked = false);

  document.getElementById('project-modal-backdrop').classList.remove('hidden');
}

function openEditProjectModal(projectId) {
  const p = allProjects.find(x => x.id === projectId);
  if (!p) return;

  editingProjectId = projectId;
  document.getElementById('project-modal-title').textContent = 'Modifier le projet';
  document.getElementById('pform-submit-btn').textContent = 'Enregistrer';

  document.getElementById('pform-id').value = p.id;
  document.getElementById('pform-title').value = p.title;
  document.getElementById('pform-client').value = p.client_id;
  document.getElementById('pform-status').value = p.status;
  document.getElementById('pform-start-date').value = p.start_date || '';
  document.getElementById('pform-description').value = p.description || '';
  document.getElementById('pform-signed').checked = !!p.end_of_work_signed;
  document.getElementById('pform-error').classList.add('hidden');

  // Check assigned artisans
  const assignedIds = p.artisan_ids || [];
  document.querySelectorAll('.artisan-checkbox').forEach(cb => {
    cb.checked = assignedIds.includes(cb.value);
  });

  document.getElementById('project-modal-backdrop').classList.remove('hidden');
}

function closeProjectModal(event) {
  if (event && event.target !== document.getElementById('project-modal-backdrop')) return;
  document.getElementById('project-modal-backdrop').classList.add('hidden');
  editingProjectId = null;
}

// ---------------------------------------------------------------
// FORM SUBMIT
// ---------------------------------------------------------------

document.getElementById('project-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const errorEl = document.getElementById('pform-error');
  const btn = document.getElementById('pform-submit-btn');
  errorEl.classList.add('hidden');

  const selectedArtisans = Array.from(document.querySelectorAll('.artisan-checkbox:checked')).map(cb => cb.value);

  const data = {
    title: document.getElementById('pform-title').value.trim(),
    client_id: document.getElementById('pform-client').value,
    status: document.getElementById('pform-status').value,
    start_date: document.getElementById('pform-start-date').value || null,
    description: document.getElementById('pform-description').value.trim(),
    end_of_work_signed: document.getElementById('pform-signed').checked ? 1 : 0,
    artisan_ids: selectedArtisans,
  };

  if (editingProjectId) {
    // EDIT mode
    btn.textContent = 'Enregistrement...';
    btn.disabled = true;

    try {
      const res = await fetch(`/api/projects/${editingProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const updated = await res.json();
      const idx = allProjects.findIndex(p => p.id === editingProjectId);
      if (idx !== -1) allProjects[idx] = updated;

      closeProjectModal();
      renderProjects();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.textContent = 'Enregistrer';
      btn.disabled = false;
    }
  } else {
    // CREATE mode
    btn.textContent = 'Création...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      // Reload projects to get enriched data (client_name, artisan_names)
      const reloadRes = await fetch(`/api/projects?userId=${user.id}&role=${user.role}`);
      allProjects = await reloadRes.json();

      closeProjectModal();
      renderProjects();
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

async function confirmDeleteProject(projectId, projectTitle) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer "${projectTitle}" ?\n\nCette action est irréversible.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    allProjects = allProjects.filter(p => p.id !== projectId);
    renderProjects();
  } catch (err) {
    alert('Erreur réseau lors de la suppression.');
  }
}
