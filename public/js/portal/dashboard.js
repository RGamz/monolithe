/**
 * Dashboard Page Logic (js/dashboard.js)
 * ----------------------------------------
 * Fetches data and renders:
 * 1. Welcome section
 * 2. KPI stat cards (Total, In Progress, Completed, Alerts)
 * 3. Recent projects list
 * 4. Pie chart (Chart.js) showing project status distribution
 * 5. Admin alerts panel (only for ADMIN role)
 */

// ---------------------------------------------------------------
// SVG ICONS used on this page
// ---------------------------------------------------------------
const DASH_ICONS = {
  briefcase: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
  
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  
  checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
  
  alertTriangle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
};

// ---------------------------------------------------------------
// INIT
// ---------------------------------------------------------------

const user = initLayout('dashboard');
if (user) {
  loadDashboard(user);
}

async function loadDashboard(user) {
  const container = document.getElementById('page-content');

  try {
    // Fetch projects
    const projRes = await fetch(`/api/projects?userId=${user.id}&role=${user.role}`);
    const projects = await projRes.json();

    // Fetch alerts (admin only)
    let alerts = [];
    if (user.role === 'ADMIN') {
      const alertRes = await fetch('/api/alerts');
      alerts = await alertRes.json();
    }

    // Calculate stats
    const activeProjects = projects.filter(p => p.status === 'En cours').length;
    const completedProjects = projects.filter(p => p.status === 'Terminé').length;
    const pendingProjects = projects.filter(p => p.status === 'En attente').length;

    // Build HTML
    container.innerHTML = buildDashboardHTML(user, projects, alerts, {
      total: projects.length,
      active: activeProjects,
      completed: completedProjects,
      pending: pendingProjects,
    });

    // Render pie chart
    renderPieChart(activeProjects, completedProjects, pendingProjects);

  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Erreur lors du chargement du tableau de bord.</div>';
    console.error('Dashboard error:', err);
  }
}

// ---------------------------------------------------------------
// BUILD HTML
// ---------------------------------------------------------------

function buildDashboardHTML(user, projects, alerts, stats) {
  // Stats cards - 4th card only for admin
  let statsHTML = `
    <div class="stats-grid">
      ${statCard('Total Projets', stats.total, DASH_ICONS.briefcase, 'blue')}
      ${statCard('En cours', stats.active, DASH_ICONS.clock, 'amber')}
      ${statCard('Terminé', stats.completed, DASH_ICONS.checkCircle, 'green')}
      ${user.role === 'ADMIN' ? statCard('Alertes système', alerts.length, DASH_ICONS.alertTriangle, 'purple', '+2 aujourd\'hui') : ''}
    </div>
  `;

  // Project list
  let projectListHTML = '';
  if (projects.length === 0) {
    projectListHTML = '<div class="empty-state">Aucun projet trouvé.</div>';
  } else {
    projectListHTML = projects.map(p => projectItem(p, user)).join('');
  }

  // Alerts panel (admin only)
  let alertsPanelHTML = '';
  if (user.role === 'ADMIN') {
    alertsPanelHTML = `
      <div class="card">
        <div class="card-body">
          <h3 class="font-bold mb-4 flex items-center" style="gap: 8px; display: flex;">
            <span style="color: var(--amber-500);">${DASH_ICONS.alertTriangle}</span>
            Alertes récentes
          </h3>
          ${alerts.map(a => `
            <div class="alert-panel-item">
              <p>${a.message}</p>
              <p class="date">${a.created_at}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <!-- Welcome -->
    <div class="mb-8">
      <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--slate-900);">Bonjour, ${user.name}</h1>
      <p style="color: var(--slate-500);">Voici ce qui se passe avec vos projets aujourd'hui.</p>
    </div>

    <!-- Stats -->
    ${statsHTML}

    <!-- Main Grid: Projects + Side Panel -->
    <div class="grid-3-1">
      <!-- Projects List -->
      <div class="card">
        <div class="card-header">
          <h3>Projets récents</h3>
        </div>
        <div class="project-list">
          ${projectListHTML}
        </div>
      </div>

      <!-- Side: Chart + Alerts -->
      <div class="space-y-6">
        <!-- Pie Chart -->
        <div class="card">
          <div class="card-body">
            <h3 class="font-bold mb-4">Statut des projets</h3>
            <div class="chart-container">
              <canvas id="status-chart"></canvas>
            </div>
          </div>
        </div>
        
        ${alertsPanelHTML}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------
// COMPONENT BUILDERS
// ---------------------------------------------------------------

function statCard(title, value, icon, color, trend) {
  return `
    <div class="stat-card">
      <div>
        <p class="stat-title">${title}</p>
        <h3 class="stat-value">${value}</h3>
        ${trend ? `<p class="stat-trend">${trend}</p>` : ''}
      </div>
      <div class="stat-icon ${color}">
        ${icon}
      </div>
    </div>
  `;
}

function projectItem(project, user) {
  // Choose badge class based on status
  let badgeClass = 'badge-pending';
  if (project.status === 'En cours') badgeClass = 'badge-progress';
  else if (project.status === 'Terminé') badgeClass = 'badge-complete';
  else if (project.status === 'Annulé') badgeClass = 'badge-cancelled';

  // Client signed badge
  let signedBadge = '';
  if (user.role === 'CLIENT' && project.end_of_work_signed) {
    signedBadge = `<span class="badge-signed">${DASH_ICONS.fileText} Signé</span>`;
  }

  return `
    <div class="project-item">
      <div class="project-info">
        <h4 class="project-title">${project.title}</h4>
        <p class="project-desc">${project.description || ''}</p>
        <div class="project-meta">
          <span>Commencé le: ${project.start_date || 'N/A'}</span>
          <span style="color: var(--slate-300);">•</span>
          <span>${project.client_company || project.client_name}</span>
        </div>
      </div>
      <div class="project-actions">
        <span class="badge ${badgeClass}">${project.status}</span>
        ${signedBadge}
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------
// PIE CHART (Chart.js)
// ---------------------------------------------------------------

function renderPieChart(active, completed, pending) {
  const canvas = document.getElementById('status-chart');
  if (!canvas) return;

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['En cours', 'Terminé', 'En attente'],
      datasets: [{
        data: [active, completed, pending],
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
        borderWidth: 0,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
            pointStyleWidth: 10,
            font: { size: 12 }
          }
        }
      }
    }
  });
}
