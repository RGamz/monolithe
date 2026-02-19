/**
 * Projects Page Logic (js/projects.js)
 * --------------------------------------
 * All roles: collapsible accordion list of projects
 * Admin only: create, edit, delete projects
 * Sorted: Pending → In Progress → Completed → Cancelled
 */

const PROJ_ICONS = {
  image: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  upload: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
  xCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
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

// Photos state
let photosCache = {}; // projectId -> { before: [], after: [] }
let lightboxPhotos = [];
let lightboxIndex = 0;

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
  const canUpload = isAdmin || (user.role === 'ARTISAN' && (project.artisan_ids || []).includes(user.id));
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

        <!-- Photo Gallery Section -->
        <div class="photo-gallery-section" id="gallery-${project.id}">
          <p class="detail-label" style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
            ${PROJ_ICONS.image} Photos du projet
          </p>

          <!-- Tabs -->
          <div class="photo-tabs" id="tabs-${project.id}">
            <button class="photo-tab active" onclick="switchPhotoTab('${project.id}', 'before')">Avant</button>
            <button class="photo-tab" onclick="switchPhotoTab('${project.id}', 'after')">Après</button>
          </div>

          <!-- Before section -->
          <div id="photo-section-before-${project.id}">
            <div id="photo-grid-before-${project.id}" class="photo-grid"></div>
            ${canUpload ? `
              <div style="margin-top: 8px;">
                <button class="btn btn-secondary" style="width: auto; font-size: 0.8rem; padding: 6px 12px;"
                        onclick="triggerPhotoUpload('${project.id}', 'before')">
                  ${PROJ_ICONS.upload} Ajouter des photos (avant)
                </button>
                <div id="upload-error-before-${project.id}" class="alert alert-error hidden" style="margin-top: 8px;"></div>
              </div>` : ''}
          </div>

          <!-- After section -->
          <div id="photo-section-after-${project.id}" class="hidden">
            <div id="photo-grid-after-${project.id}" class="photo-grid"></div>
            ${canUpload ? `
              <div style="margin-top: 8px;">
                <button class="btn btn-secondary" style="width: auto; font-size: 0.8rem; padding: 6px 12px;"
                        onclick="triggerPhotoUpload('${project.id}', 'after')">
                  ${PROJ_ICONS.upload} Ajouter des photos (après)
                </button>
                <div id="upload-error-after-${project.id}" class="alert alert-error hidden" style="margin-top: 8px;"></div>
              </div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleAccordion(index) {
  const body = document.getElementById(`body-${index}`);
  const chevron = document.getElementById(`chevron-${index}`);
  const project = [...allProjects].sort((a, b) => {
    const statusOrder = { 'En attente': 1, 'En cours': 2, 'Terminé': 3, 'Annulé': 4 };
    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
  })[index];

  if (body.classList.contains('hidden')) {
    body.classList.remove('hidden');
    chevron.innerHTML = PROJ_ICONS.chevronUp;
    // Load photos the first time
    if (project && !photosCache[project.id]) {
      loadProjectPhotos(project.id);
    }
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

// ---------------------------------------------------------------
// PHOTOS
// ---------------------------------------------------------------

async function loadProjectPhotos(projectId) {
  try {
    const res = await fetch(`/api/photos/${projectId}`);
    const photos = await res.json();

    photosCache[projectId] = {
      before: photos.filter(p => p.photo_type === 'before'),
      after: photos.filter(p => p.photo_type === 'after'),
    };

    renderPhotoGrid(projectId, 'before');
    renderPhotoGrid(projectId, 'after');
  } catch (err) {
    console.error('Failed to load photos:', err);
  }
}

function renderPhotoGrid(projectId, type) {
  const grid = document.getElementById(`photo-grid-${type}-${projectId}`);
  if (!grid) return;

  const photos = (photosCache[projectId] || {})[type] || [];

  if (photos.length === 0) {
    grid.innerHTML = `<p style="color: var(--slate-400); font-style: italic; font-size: 0.8rem; padding: 8px 0;">
      Aucune photo "${type === 'before' ? 'avant' : 'après'}" pour ce projet.
    </p>`;
    return;
  }

  grid.innerHTML = photos.map((photo, i) => {
    const canDelete = canDeletePhoto(photo);
    const allOfType = (photosCache[projectId] || {})[type] || [];
    return `
      <div class="photo-thumb" onclick="openLightbox('${projectId}', '${type}', ${i})">
        <img src="/uploads/photos/${photo.file_name}" alt="Photo ${type}" loading="lazy">
        ${canDelete ? `
          <button class="photo-delete-btn" title="Supprimer" 
                  onclick="event.stopPropagation(); deletePhoto('${photo.id}', '${projectId}', '${type}')">
            ${PROJ_ICONS.xCircle}
          </button>` : ''}
      </div>
    `;
  }).join('');
}

function canDeletePhoto(photo) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'ARTISAN' && photo.uploaded_by === user.id) {
    const uploadedAt = new Date(photo.uploaded_at);
    const diffHours = (Date.now() - uploadedAt) / (1000 * 60 * 60);
    return diffHours <= 24;
  }
  return false;
}

async function deletePhoto(photoId, projectId, type) {
  if (!confirm('Supprimer cette photo ?')) return;

  try {
    const res = await fetch(`/api/photos/${photoId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, role: user.role }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert('Erreur : ' + err.error);
      return;
    }

    // Update cache
    photosCache[projectId][type] = photosCache[projectId][type].filter(p => p.id !== photoId);
    renderPhotoGrid(projectId, type);
  } catch (err) {
    alert('Erreur réseau.');
  }
}

function switchPhotoTab(projectId, type) {
  const tabs = document.querySelectorAll(`#tabs-${projectId} .photo-tab`);
  tabs.forEach((tab, i) => {
    tab.classList.toggle('active', (i === 0 && type === 'before') || (i === 1 && type === 'after'));
  });

  document.getElementById(`photo-section-before-${projectId}`).classList.toggle('hidden', type !== 'before');
  document.getElementById(`photo-section-after-${projectId}`).classList.toggle('hidden', type !== 'after');
}

// ---------------------------------------------------------------
// INLINE PHOTO UPLOAD
// ---------------------------------------------------------------

function triggerPhotoUpload(projectId, photoType) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png';
  input.multiple = true;
  input.addEventListener('change', () => handlePhotoUpload(projectId, photoType, input.files));
  input.click();
}

async function handlePhotoUpload(projectId, photoType, files) {
  if (!files || files.length === 0) return;

  const errorEl = document.getElementById(`upload-error-${photoType}-${projectId}`);
  if (errorEl) errorEl.classList.add('hidden');

  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }
  formData.append('userId', user.id);
  formData.append('role', user.role);
  formData.append('photoType', photoType);

  try {
    const res = await fetch(`/api/photos/${projectId}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    const newPhotos = await res.json();

    if (!photosCache[projectId]) photosCache[projectId] = { before: [], after: [] };
    photosCache[projectId][photoType].push(...newPhotos);

    renderPhotoGrid(projectId, photoType);
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } else {
      alert('Erreur : ' + err.message);
    }
  }
}

// ---------------------------------------------------------------
// LIGHTBOX
// ---------------------------------------------------------------

function openLightbox(projectId, type, index) {
  lightboxPhotos = (photosCache[projectId] || {})[type] || [];
  lightboxIndex = index;
  renderLightbox();
  document.getElementById('lightbox-backdrop').classList.remove('hidden');
}

function closeLightbox(event) {
  if (event && event.target !== document.getElementById('lightbox-backdrop') &&
      !event.target.closest('#lightbox-close')) return;
  document.getElementById('lightbox-backdrop').classList.add('hidden');
}

function renderLightbox() {
  const photo = lightboxPhotos[lightboxIndex];
  if (!photo) return;
  document.getElementById('lightbox-img').src = `/uploads/photos/${photo.file_name}`;
  document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  document.getElementById('lightbox-prev').style.visibility = lightboxIndex > 0 ? 'visible' : 'hidden';
  document.getElementById('lightbox-next').style.visibility = lightboxIndex < lightboxPhotos.length - 1 ? 'visible' : 'hidden';
}

function lightboxNav(direction) {
  lightboxIndex += direction;
  if (lightboxIndex < 0) lightboxIndex = 0;
  if (lightboxIndex >= lightboxPhotos.length) lightboxIndex = lightboxPhotos.length - 1;
  renderLightbox();
}

document.addEventListener('keydown', function(e) {
  const lb = document.getElementById('lightbox-backdrop');
  if (lb && !lb.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
    if (e.key === 'Escape') lb.classList.add('hidden');
  }
});
