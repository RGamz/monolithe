/**
 * Directory Page Logic (js/directory.js)
 * ----------------------------------------
 * Admin-only page showing:
 * 1. Search/filter bar
 * 2. List view: artisan cards in a grid
 * 3. Map view: Leaflet map with markers
 */

const DIR_ICONS = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  mapPin: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  alertTriangle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  externalLink: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
};

let allArtisans = [];
let currentView = 'list';
let mapInstance = null;

const user = initLayout('directory');
if (user) loadDirectory();

async function loadDirectory() {
  const container = document.getElementById('page-content');

  try {
    const res = await fetch('/api/users/artisans');
    allArtisans = await res.json();
    renderDirectory(allArtisans);
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement.</div>';
  }
}

function renderDirectory(artisans) {
  const container = document.getElementById('page-content');

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--slate-800);">Annuaire des artisans</h2>
          <p class="text-sm" style="color: var(--slate-500);">Gérer et surveiller les prestataires de services.</p>
        </div>
        <div class="view-toggle">
          <button class="view-toggle-btn ${currentView === 'list' ? 'active' : ''}" onclick="switchView('list')">Liste</button>
          <button class="view-toggle-btn ${currentView === 'map' ? 'active' : ''}" onclick="switchView('map')">Carte</button>
        </div>
      </div>

      <!-- Search -->
      <div class="search-wrapper">
        ${DIR_ICONS.search}
        <input type="text" class="search-input" id="dir-search" placeholder="Filtrer par nom, spécialité ou code postal..." oninput="filterArtisans()">
      </div>

      <!-- Content area -->
      <div id="dir-content"></div>
    </div>
  `;

  renderContent(artisans);
}

function renderContent(artisans) {
  const content = document.getElementById('dir-content');

  if (currentView === 'list') {
    renderListView(content, artisans);
  } else {
    renderMapView(content, artisans);
  }
}

function renderListView(container, artisans) {
  if (artisans.length === 0) {
    container.innerHTML = '<div class="empty-state empty-state-bordered">Aucun artisan trouvé.</div>';
    return;
  }

  container.innerHTML = `<div class="grid-cols-3">${artisans.map(artisanCard).join('')}</div>`;
}

function artisanCard(a) {
  const complianceIcon = a.documents_status === 'compliant'
    ? `<span class="compliance-icon compliant">${DIR_ICONS.checkCircle}</span>`
    : `<span class="compliance-icon missing">${DIR_ICONS.alertTriangle}</span>`;

  const statusDot = a.is_onboarded
    ? '<span class="active-dot active"></span> Compte actif'
    : '<span class="active-dot inactive"></span> Invitation envoyée';

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${a.lat || 0},${a.lng || 0}`;

  return `
    <div class="artisan-card" style="cursor: pointer;" onclick="viewArtisanProfile('${a.id}')">
      <div class="artisan-card-header">
        <div>
          <h3 class="artisan-name" style="color: var(--blue-600);">${a.company_name || a.name}</h3>
          <p class="artisan-specialty">${a.specialty || 'Service général'}</p>
        </div>
        ${complianceIcon}
      </div>
      <div class="artisan-detail">
        ${DIR_ICONS.mapPin}
        <span class="truncate">${a.address || 'Aucune adresse enregistrée'}</span>
      </div>
      <div class="artisan-detail">
        ${statusDot}
      </div>
      <div class="artisan-card-footer">
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
          Voir sur Google Maps ${DIR_ICONS.externalLink}
        </a>
      </div>
    </div>
  `;
}

function renderMapView(container, artisans) {
  container.innerHTML = '<div class="map-container"><div id="leaflet-map" style="width:100%;height:100%;"></div></div>';

  // Destroy previous map if exists
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  // Small delay to let DOM render
  setTimeout(() => {
    mapInstance = L.map('leaflet-map').setView([43.6047, 1.4442], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapInstance);

    addMarkers(artisans);
  }, 100);
}

function addMarkers(artisans) {
  if (!mapInstance) return;

  // Clear existing markers
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
  });

  artisans.forEach(a => {
    if (a.lat && a.lng) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`;
      L.marker([a.lat, a.lng])
        .addTo(mapInstance)
        .bindPopup(`
          <div style="padding:4px;">
            <h3 style="font-weight:700;font-size:14px;margin:0;">
              <a href="/pro/portail/artisan-profile?id=${a.id}" style="color:#2563eb;text-decoration:none;">
                ${a.company_name || a.name}
              </a>
            </h3>
            <p style="font-size:12px;color:#64748b;margin:4px 0;">${a.specialty || ''}</p>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
               style="font-size:12px;color:#2563eb;font-weight:500;">
              Ouvrir dans Google Maps
            </a>
          </div>
        `);
    }
  });
}

function switchView(view) {
  currentView = view;
  // Re-render with current filter
  filterArtisans();
  // Update toggle buttons
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === (view === 'list' ? 'liste' : 'carte'));
  });
}

function filterArtisans() {
  const query = (document.getElementById('dir-search')?.value || '').toLowerCase();
  const filtered = allArtisans.filter(a =>
    a.name.toLowerCase().includes(query) ||
    (a.company_name && a.company_name.toLowerCase().includes(query)) ||
    (a.specialty && a.specialty.toLowerCase().includes(query)) ||
    (a.address && a.address.toLowerCase().includes(query))
  );

  const content = document.getElementById('dir-content');
  if (currentView === 'list') {
    renderListView(content, filtered);
  } else {
    // Just update markers on existing map
    if (mapInstance) {
      addMarkers(filtered);
    } else {
      renderMapView(content, filtered);
    }
  }
}

function viewArtisanProfile(artisanId) {
  window.location.href = `/pro/portail/artisan-profile?id=${artisanId}`;
}
