/**
 * Nos Projets — Carousel + Accordion + Lightbox
 * ------------------------------------------------
 * Fetches favourite projects from /api/public/projects and renders
 * a responsive carousel. Clicking "Voir le projet" on any card expands
 * a details panel below the carousel showing description + before/after photos.
 */

let projects = [];
let currentIndex = 0;
let visibleCount = 3;
let expandedProjectId = null;
let photosCache = {};

// Lightbox state
let lbPhotos = [];
let lbIndex = 0;

// -----------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------

async function init() {
  try {
    const res = await fetch('/api/public/projects');
    if (!res.ok) throw new Error('fetch failed');
    projects = await res.json();
  } catch (_) {
    projects = [];
  }

  document.getElementById('projects-loading').classList.add('hidden');

  if (projects.length === 0) {
    document.getElementById('projects-empty').classList.remove('hidden');
    return;
  }

  updateVisibleCount();
  const container = document.getElementById('carousel-container');
  container.classList.remove('hidden');

  renderCarousel();
  renderDots();
  updateNavBtns();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
}

function onResize() {
  const prev = visibleCount;
  updateVisibleCount();
  if (prev !== visibleCount) {
    currentIndex = 0;
    renderCarousel();
    renderDots();
    updateNavBtns();
  }
}

function onKeyDown(e) {
  const lb = document.getElementById('pub-lightbox');
  if (!lb.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft')  pubLightboxNav(-1);
    if (e.key === 'ArrowRight') pubLightboxNav(1);
    if (e.key === 'Escape')     closePubLightboxBtn();
  }
}

function updateVisibleCount() {
  const w = window.innerWidth;
  if (w >= 1024) visibleCount = 3;
  else if (w >= 640) visibleCount = 2;
  else visibleCount = 1;
}

// -----------------------------------------------------------------------
// Carousel rendering
// -----------------------------------------------------------------------

function getCardWidth() {
  const vp = document.querySelector('.carousel-viewport');
  return vp ? vp.offsetWidth / visibleCount : 0;
}

function renderCarousel() {
  const track = document.getElementById('carousel-track');
  const cardWidth = getCardWidth();

  track.innerHTML = projects.map((project, i) => {
    const isExpanded = expandedProjectId === project.id;
    const coverHTML = project.cover_photo_url
      ? `<img class="project-cover-img" src="${escHtml(project.cover_photo_url)}" alt="${escHtml(project.title)}" loading="lazy">`
      : `<div class="project-cover-placeholder">
           <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="40" height="40" opacity="0.3">
             <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
             <circle cx="9" cy="9" r="2"/>
             <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
           </svg>
         </div>`;

    return `
      <div class="project-card${isExpanded ? ' project-card-active' : ''}"
           style="flex: 0 0 ${cardWidth}px; width: ${cardWidth}px;"
           data-id="${project.id}">
        <div class="project-card-inner">
          <div class="project-cover-wrap">${coverHTML}</div>
          <div class="project-card-body">
            <h3 class="project-card-title" title="${escHtml(project.title)}">${escHtml(project.title)}</h3>
            <button class="show-more-btn" onclick="toggleProject('${project.id}')">
              <span>${isExpanded ? '−' : '+'}</span>
              ${isExpanded ? 'Réduire' : 'Voir le projet'}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  track.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
}

function renderDots() {
  const dots = document.getElementById('carousel-dots');
  const maxIndex = Math.max(0, projects.length - visibleCount);

  if (maxIndex === 0) {
    dots.innerHTML = '';
    return;
  }

  dots.innerHTML = Array.from({ length: maxIndex + 1 }, (_, i) =>
    `<button class="carousel-dot${i === currentIndex ? ' active' : ''}"
             onclick="goToIndex(${i})" aria-label="Projet ${i + 1}"></button>`
  ).join('');
}

function updateNavBtns() {
  const maxIndex = Math.max(0, projects.length - visibleCount);
  document.getElementById('carousel-prev').disabled = currentIndex === 0;
  document.getElementById('carousel-next').disabled = currentIndex >= maxIndex;
}

// -----------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------

function carouselPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCarousel();
    renderDots();
    updateNavBtns();
  }
}

function carouselNext() {
  const maxIndex = Math.max(0, projects.length - visibleCount);
  if (currentIndex < maxIndex) {
    currentIndex++;
    renderCarousel();
    renderDots();
    updateNavBtns();
  }
}

function goToIndex(i) {
  currentIndex = i;
  renderCarousel();
  renderDots();
  updateNavBtns();
}

// -----------------------------------------------------------------------
// Expand / collapse project details
// -----------------------------------------------------------------------

async function toggleProject(projectId) {
  if (expandedProjectId === projectId) {
    // Collapse
    expandedProjectId = null;
    renderCarousel();
    hideDetailsPanel();
    return;
  }

  expandedProjectId = projectId;
  renderCarousel();

  if (!photosCache[projectId]) {
    showDetailsPanelLoading(projectId);
    try {
      const res = await fetch(`/api/public/projects/${projectId}/photos`);
      const photos = await res.json();
      photosCache[projectId] = {
        before: photos.filter(p => p.photo_type === 'before'),
        after:  photos.filter(p => p.photo_type === 'after'),
      };
    } catch (_) {
      photosCache[projectId] = { before: [], after: [] };
    }
  }

  renderDetailsPanel();
  scrollToPanel();
}

function showDetailsPanelLoading(projectId) {
  const project = projects.find(p => p.id === projectId);
  const panel = document.getElementById('project-details-panel');
  const inner = document.getElementById('project-details-inner');
  panel.classList.remove('hidden');
  inner.innerHTML = `
    <div class="project-details-header">
      <h2 class="heading-section">${escHtml(project ? project.title : '')}</h2>
    </div>
    <p class="text-muted text-center" style="padding: 24px 0;">Chargement des photos...</p>`;
}

function renderDetailsPanel() {
  const project = projects.find(p => p.id === expandedProjectId);
  if (!project) return;

  const panel = document.getElementById('project-details-panel');
  const inner = document.getElementById('project-details-inner');
  panel.classList.remove('hidden');

  const photos = photosCache[expandedProjectId] || { before: [], after: [] };

  const buildGrid = (list, type) => {
    if (list.length === 0) {
      return `<p class="text-muted" style="font-style: italic; font-size: 0.875rem;">Aucune photo.</p>`;
    }
    return `<div class="projects-photo-grid">
      ${list.map((photo, i) => `
        <div class="projects-photo-thumb"
             onclick="openPubLightbox('${expandedProjectId}', '${type}', ${i})"
             title="Agrandir">
          <img src="${escHtml(photo.file_url)}" alt="" loading="lazy">
        </div>`).join('')}
    </div>`;
  };

  inner.innerHTML = `
    <div class="project-details-header">
      <h2 class="heading-section">${escHtml(project.title)}</h2>
      <button class="project-close-btn" onclick="toggleProject('${project.id}')" aria-label="Fermer">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
    ${project.description
      ? `<p class="text-body mb-8" style="color: var(--color-text-light);">${escHtml(project.description)}</p>`
      : ''}
    <div class="project-photos-sections">
      <div class="project-photo-section">
        <h3 class="heading-subsection mb-4">Avant</h3>
        ${buildGrid(photos.before, 'before')}
      </div>
      <div class="project-photo-section">
        <h3 class="heading-subsection mb-4">Après</h3>
        ${buildGrid(photos.after, 'after')}
      </div>
    </div>`;
}

function hideDetailsPanel() {
  document.getElementById('project-details-panel').classList.add('hidden');
  document.getElementById('project-details-inner').innerHTML = '';
}

function scrollToPanel() {
  setTimeout(() => {
    const panel = document.getElementById('project-details-panel');
    if (panel && !panel.classList.contains('hidden')) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 80);
}

// -----------------------------------------------------------------------
// Lightbox
// -----------------------------------------------------------------------

function openPubLightbox(projectId, type, index) {
  const photos = (photosCache[projectId] || {})[type] || [];
  if (photos.length === 0) return;
  lbPhotos = photos;
  lbIndex = index;
  renderLightbox();
  document.getElementById('pub-lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderLightbox() {
  const photo = lbPhotos[lbIndex];
  if (!photo) return;
  document.getElementById('pub-lightbox-img').src = photo.file_url;
  document.getElementById('pub-lightbox-counter').textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
}

function pubLightboxNav(dir) {
  lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
  renderLightbox();
}

function closePubLightbox(event) {
  if (event && event.target !== document.getElementById('pub-lightbox')) return;
  closePubLightboxBtn();
}

function closePubLightboxBtn() {
  document.getElementById('pub-lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

// -----------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// -----------------------------------------------------------------------
// Boot
// -----------------------------------------------------------------------

init();