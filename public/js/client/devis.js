/**
 * Devis Questionnaire (devis.js)
 * ===============================
 * Vanilla JS conversion of the React app.jsx questionnaire.
 * Handles: multi-step questions, conditional logic, price calculation,
 * form submission to /api/forms/devis, and estimate display.
 */

// ------------------------------------------------------------------
// STATE
// ------------------------------------------------------------------
let currentStep = -1; // -1 = landing
let formData = {
  projectCategory: '',
  propertyType: '',
  propertyAge: '',
  renovationType: '',
  exteriorSubtype: '',
  area: '',
  currentCondition: '',
  timeline: '',
  zipCode: ''
};

// ------------------------------------------------------------------
// QUESTIONS (same logic as React version)
// ------------------------------------------------------------------
const allQuestions = [
  {
    id: 'projectCategory',
    title: 'Quel type de projet ?',
    options: [
      { value: 'renovation', label: 'Rénovation' },
      { value: 'extension', label: 'Extension' },
      { value: 'exterior', label: 'Travaux extérieurs' }
    ]
  },
  {
    id: 'propertyType',
    title: 'Type de bien ?',
    condition: (data) => data.projectCategory === 'renovation',
    options: [
      { value: 'house', label: 'Maison' },
      { value: 'flat', label: 'Appartement' },
      { value: 'office', label: 'Bureau' }
    ]
  },
  {
    id: 'propertyType',
    title: 'Type de bien ?',
    condition: (data) => data.projectCategory === 'extension',
    options: [
      { value: 'house', label: 'Maison' }
    ]
  },
  {
    id: 'propertyType',
    title: 'Type de bien ?',
    condition: (data) => data.projectCategory === 'exterior',
    options: [
      { value: 'house', label: 'Maison' }
    ]
  },
  {
    id: 'propertyAge',
    title: 'Âge de la propriété ?',
    condition: (data) => data.projectCategory !== 'extension',
    options: [
      { value: '0-10', label: 'Moins de 10 ans' },
      { value: '10-30', label: '10-30 ans' },
      { value: '30+', label: 'Plus de 30 ans' }
    ]
  },
  {
    id: 'renovationType',
    title: 'Type de rénovation ?',
    condition: (data) => data.projectCategory === 'renovation' && data.propertyType !== 'office',
    options: [
      { value: 'complete', label: 'Complète', info: '<strong>Prestations en rénovation complète</strong><ul><li>Doublage technique en placo 70mm et faux plafond technique, cloisons non porteuses en placo</li><li>Rénovation de réseaux d\'électricité</li><li>Rénovation complète de cuisine et salle de bain</li><li>Nouveaux réseaux de plomberie</li><li>Nouveau système de chauffage : radiateurs électriques</li><li>Réfection complète des surfaces au sol : carrelage, parquet stratifié, nouvelles plinthes</li><li>Réfection complète des murs en peinture</li></ul>' },
      { value: 'partial', label: 'Partielle', info: '<strong>Prestations en rénovation partielle</strong><ul><li>Ponçage et vitrification du sol ou pose de sol souple</li><li>Rafraîchissement de la peinture des murs et plafonds</li><li>Reprise électrique partielle</li><li>Rénovation de la salle de bain</li><li>Rénovation de la cuisine</li></ul>' },
      { value: 'bathroom', label: 'Salle de bain' }
    ]
  },
  {
    id: 'renovationType',
    title: 'Type de rénovation ?',
    condition: (data) => data.projectCategory === 'renovation' && data.propertyType === 'office',
    options: [
      { value: 'complete', label: 'Complète' }
    ]
  },
  {
    id: 'renovationType',
    title: 'Travaux extérieurs ?',
    condition: (data) => data.projectCategory === 'exterior',
    options: [
      { value: 'facade', label: 'Façade' },
      { value: 'roofing', label: 'Toiture' }
    ]
  },
  {
    id: 'exteriorSubtype',
    title: 'Type de travaux de façade ?',
    condition: (data) => data.renovationType === 'facade',
    options: [
      { value: 'painting', label: 'Travaux de peinture' },
      { value: 'coating', label: "Travaux d'enduit" },
      { value: 'exterior-insulation', label: 'Isolation extérieure' }
    ]
  },
  {
    id: 'exteriorSubtype',
    title: 'Type de toiture ?',
    condition: (data) => data.renovationType === 'roofing',
    options: [
      { value: 'traditional-tile', label: 'Traditionnelle tuile' },
      { value: 'flat-roof', label: 'Toiture terrasse' }
    ]
  },
  {
    id: 'area',
    title: 'Superficie concernée ?',
    condition: (data) => data.renovationType !== 'facade' && data.renovationType !== 'roofing' && data.renovationType !== 'extension',
    type: 'input',
    inputType: 'number',
    min: 5,
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'area',
    title: "Superficie de l'extension ?",
    condition: (data) => data.renovationType === 'extension',
    type: 'input',
    inputType: 'number',
    min: 5,
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'area',
    title: 'Surface de la façade ?',
    condition: (data) => data.renovationType === 'facade',
    type: 'input',
    inputType: 'number',
    min: 5,
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'area',
    title: 'Surface de la toiture ?',
    condition: (data) => data.renovationType === 'roofing',
    type: 'input',
    inputType: 'number',
    min: 5,
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'currentCondition',
    title: 'État actuel ?',
    condition: (data) => data.projectCategory !== 'extension',
    options: [
      { value: 'good', label: 'Bon' },
      { value: 'average', label: 'Moyen' },
      { value: 'poor', label: 'Mauvais' }
    ]
  },
  {
    id: 'timeline',
    title: 'Quand commencer ?',
    options: [
      { value: 'urgent', label: 'Urgent' },
      { value: '1-3 mois', label: '1-3 mois' },
      { value: '3-6 mois', label: '3-6 mois' },
      { value: 'flexible', label: 'Flexible' }
    ]
  },
  {
    id: 'zipCode',
    title: 'Code postal ?',
    type: 'input',
    inputType: 'text',
    placeholder: 'Ex: 31000',
    maxLength: 10
  }
];

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function getFilteredQuestions() {
  return allQuestions.filter(q => !q.condition || q.condition(formData));
}

function calculateEstimate() {
  // Price per m² for exterior work subtypes
  const exteriorPricePerM2 = {
    'painting': 30,
    'coating': 40,
    'exterior-insulation': 140,
    'traditional-tile': 200,
    'flat-roof': 300
  };

  // Base prices for renovation types (bathroom only)
  const renovationBase = {
    'bathroom': 15000
  };

  const conditionMultiplier = { 'good': 0.95, 'average': 1.0, 'poor': 1.05 };
  const ageMultiplier = { '0-10': 0.95, '10-30': 1.0, '30+': 1.05 };

  let basePrice;

  // Check if this is exterior work with subtype (façade or toiture)
  if (formData.exteriorSubtype && exteriorPricePerM2[formData.exteriorSubtype]) {
    const areaNum = parseInt(formData.area) || 1;
    basePrice = exteriorPricePerM2[formData.exteriorSubtype] * areaNum;
  }
  // Check if this is house complete/partial renovation
  else if (formData.propertyType === 'house' && (formData.renovationType === 'complete' || formData.renovationType === 'partial')) {
    // Base case: 59-180 m² for house
    // Complete: 1000 €/m² = 100,000 € for 100m² average
    // Partial: 500 €/m² = 50,000 € for 100m² average
    const pricePerM2 = formData.renovationType === 'complete' ? 1000 : 500;
    const areaNum = parseInt(formData.area) || 100;

    // Calculate base price for the actual area
    basePrice = pricePerM2 * areaNum;

    // Apply area multiplier based on size relative to base case (91-120 m²)
    if (areaNum > 180) basePrice *= 0.95;
    else basePrice *= 1.0;
  }
  // Check if this is appartement complete/partial renovation
  else if (formData.propertyType === 'flat' && (formData.renovationType === 'complete' || formData.renovationType === 'partial')) {
    // Base case: 50-70 m² for appartement
    // Complete: 1000 €/m² = 60,000 € for 60m² average
    // Partial: 550 €/m² = 33,000 € for 60m² average
    const pricePerM2 = formData.renovationType === 'complete' ? 1000 : 550;
    const areaNum = parseInt(formData.area) || 60;

    // Calculate base price for the actual area
    basePrice = pricePerM2 * areaNum;

    // Apply area multiplier based on size relative to base case (50-70 m²)
    if (areaNum > 140) basePrice *= 0.95;
    else if (areaNum >= 50) basePrice *= 1.0;
    else basePrice *= 1.05;
  }
  // Check if this is office complete renovation
  else if (formData.propertyType === 'office' && formData.renovationType === 'complete') {
    const areaNum = parseInt(formData.area) || 1;
    if (areaNum >= 300) {
      basePrice = 304 * areaNum; // 5% discount for large offices
    } else {
      basePrice = 320 * areaNum;
    }
  }
  // Extension renovation
  else if (formData.renovationType === 'extension') {
    // Extension: 1800 €/m² - no multipliers applied
    const pricePerM2 = 1800;
    const areaNum = parseInt(formData.area) || 1;
    basePrice = pricePerM2 * areaNum;
  }
  // Other renovation types (bathroom)
  else {
    if (formData.renovationType === 'bathroom' && formData.area) {
      const areaNum = parseInt(formData.area);
      if (areaNum < 5) basePrice = 8000;
      else if (areaNum <= 15) basePrice = 900 * areaNum;
      else return { visitRequired: true };
    } else {
      basePrice = renovationBase[formData.renovationType] || 30000;
    }
  }

  // Apply condition and age multipliers (not for extensions)
  if (formData.renovationType !== 'extension') {
    basePrice *= conditionMultiplier[formData.currentCondition] || 1;
    basePrice *= ageMultiplier[formData.propertyAge] || 1;
  }

  // Timeline has no impact on price - all options have 1.0 multiplier

  return {
    low: Math.round(basePrice * 0.85),
    average: Math.round(basePrice),
    high: Math.round(basePrice * 1.25)
  };
}

function getLabelForValue(questionId, value) {
  if (!value) return '';
  const q = allQuestions.find(q => q.id === questionId && q.options);
  const opt = q?.options?.find(o => o.value === value);
  return opt?.label || value;
}

// ------------------------------------------------------------------
// RENDERING
// ------------------------------------------------------------------
function updateProgress() {
  const filtered = getFilteredQuestions();
  const total = filtered.length;
  const progress = ((currentStep + 1) / (total + 1)) * 100;
  document.getElementById('progress-bar').style.width = progress + '%';
  document.getElementById('step-counter').textContent =
    currentStep < total ? `${currentStep + 1} / ${total}` : '';
}

function renderQuestion() {
  const filtered = getFilteredQuestions();
  const total = filtered.length;
  const area = document.getElementById('question-area');
  const formArea = document.getElementById('contact-form-area');
  const estimateArea = document.getElementById('estimate-area');

  // Hide other areas
  formArea.classList.add('hidden');
  estimateArea.classList.add('hidden');
  area.classList.remove('hidden');

  if (currentStep >= total) {
    // Show contact form
    area.classList.add('hidden');
    formArea.classList.remove('hidden');
    updateProgress();
    return;
  }

  const question = filtered[currentStep];
  updateProgress();

  let html = `<div><h2 class="heading-hero">${question.title}</h2></div>`;

  if (question.type === 'input') {
    html += `
      <form id="input-form" class="space-y-6" onsubmit="handleInputSubmit(event)">
        <div class="form-input-wrapper">
          <input type="${question.inputType}" placeholder="${question.placeholder}" 
                 ${question.maxLength ? `maxlength="${question.maxLength}"` : ''} ${question.min ? `min="${question.min}"` : ''}
                 class="form-input form-input-lg" required autofocus id="question-input" />
          ${question.suffix ? `<span class="form-input-suffix">${question.suffix}</span>` : ''}
        </div>
        <button type="submit" class="btn btn-primary">
          Continuer
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
      </form>`;
  } else {
    html += '<div class="option-grid">';
    question.options.forEach(opt => {
      const selected = formData[question.id] === opt.value ? ' option-btn-selected' : '';
      if (opt.info) {
        html += `
          <div class="option-btn-wrapper">
            <button class="option-btn${selected}" onclick="handleOptionClick('${opt.value}')">${opt.label}</button>
            <button class="info-btn" onclick="toggleInfo('${opt.value}')" aria-label="En savoir plus sur ${opt.label}">?</button>
            <div class="info-mobile-panel hidden" id="info-mobile-${opt.value}">${opt.info}</div>
          </div>`;
      } else {
        html += `<button class="option-btn${selected}" onclick="handleOptionClick('${opt.value}')">${opt.label}</button>`;
      }
    });
    html += '</div>';

    // Aside panel for desktop (shared, injected once)
    if (question.options.some(o => o.info)) {
      const infoPanels = question.options
        .filter(o => o.info)
        .map(o => `<div class="info-aside-content hidden" id="info-aside-${o.value}">${o.info}</div>`)
        .join('');
      html += `<aside class="info-aside hidden" id="info-aside-panel">${infoPanels}</aside>`;
    }
  }

  // Back button
  if (currentStep > 0) {
    html += `
      <button onclick="goBack()" class="btn btn-text">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
        Retour
      </button>`;
  }

  area.innerHTML = html;

  // Force re-trigger animation
  area.classList.remove('animate-fade-in');
  void area.offsetWidth;
  area.classList.add('animate-fade-in');
}

function renderEstimate() {
  const estimate = calculateEstimate();
  const area = document.getElementById('estimate-area');
  document.getElementById('question-area').classList.add('hidden');
  document.getElementById('contact-form-area').classList.add('hidden');
  area.classList.remove('hidden');

  // Build summary items
  const summaryItems = [
    { label: 'Projet', value: getLabelForValue('projectCategory', formData.projectCategory) },
    { label: 'Bien', value: getLabelForValue('propertyType', formData.propertyType) },
    { label: 'Âge', value: getLabelForValue('propertyAge', formData.propertyAge) },
    { label: 'Travaux', value: getLabelForValue('renovationType', formData.renovationType) }
  ];

  // Add exterior subtype if applicable
  if (formData.exteriorSubtype) {
    summaryItems.push({ label: 'Type', value: getLabelForValue('exteriorSubtype', formData.exteriorSubtype) });
  }

  summaryItems.push(
    { label: 'Surface', value: formData.area ? `${formData.area} m²` : '' },
    { label: 'État', value: getLabelForValue('currentCondition', formData.currentCondition) },
    { label: 'Délai', value: getLabelForValue('timeline', formData.timeline) }
  );

  const filteredSummaryItems = summaryItems.filter(item => item.value);

  let summaryHtml = '';
  filteredSummaryItems.forEach(item => {
    summaryHtml += `<div class="summary-row"><span class="summary-label">${item.label}</span><span class="summary-value">${item.value}</span></div>`;
  });

  area.innerHTML = `
    <div class="text-center">
      <div class="success-icon">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
      </div>
      <p class="text-body">Votre demande a été envoyée avec succès</p>
    </div>

    <div class="card card-padded-lg">
      <div class="estimate-display">
        <div class="estimate-label">Estimation de votre projet</div>
        ${estimate.visitRequired
          ? `<div class="estimate-value">Visite technique obligatoire</div>
             <div class="estimate-average">Votre projet nécessite une visite technique pour établir un devis précis.</div>`
          : `<div class="estimate-value" style="font-size:1.8rem;font-weight:700;">Moyenne : ${estimate.average.toLocaleString()} €</div>
             <div class="estimate-average" style="font-size:0.9rem;font-weight:400;">Fourchette : ${estimate.low.toLocaleString()} - ${estimate.high.toLocaleString()} €</div>`
        }
      </div>
    </div>

    <div class="card card-padded text-center">
      <h3 class="heading-card mb-4">Envie d'en discuter ?</h3>
      <p class="text-body mb-6">Planifiez un appel gratuit avec un expert pour affiner votre projet</p>
      <a href="https://calendly.com/monolithe" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Planifier un appel
      </a>
    </div>

    <div>
      <h3 class="heading-small mb-6">Résumé</h3>
      <div class="summary-table">${summaryHtml}</div>
    </div>

    <div class="text-center">
      <a href="/" class="btn btn-text">Retour à l'accueil</a>
    </div>
  `;

  area.classList.remove('animate-fade-in');
  void area.offsetWidth;
  area.classList.add('animate-fade-in');
}

// ------------------------------------------------------------------
// EVENT HANDLERS
// ------------------------------------------------------------------
function startQuestionnaire() {
  currentStep = 0;
  document.getElementById('landing-view').classList.add('hidden');
  document.getElementById('questionnaire-view').classList.remove('hidden');
  renderQuestion();
}

function toggleInfo(value) {
  const isDesktop = window.innerWidth >= 768;

  if (isDesktop) {
    const panel = document.getElementById('info-aside-panel');
    const allContents = panel.querySelectorAll('.info-aside-content');
    const target = document.getElementById(`info-aside-${value}`);
    const isAlreadyOpen = !target.classList.contains('hidden');

    allContents.forEach(c => c.classList.add('hidden'));

    if (isAlreadyOpen) {
      panel.classList.add('hidden');
    } else {
      target.classList.remove('hidden');
      panel.classList.remove('hidden');
    }
  } else {
    const mobilePanel = document.getElementById(`info-mobile-${value}`);
    mobilePanel.classList.toggle('hidden');
  }
}

function handleOptionClick(value) {
  const filtered = getFilteredQuestions();
  const question = filtered[currentStep];
  formData[question.id] = value;

  // Auto-set renovationType to 'extension' when extension is selected as project category
  if (question.id === 'projectCategory' && value === 'extension') {
    formData.renovationType = 'extension';
  }

  setTimeout(() => {
    if (currentStep < filtered.length - 1) {
      currentStep++;
    } else {
      currentStep = filtered.length; // go to contact form
    }
    renderQuestion();
  }, 200);
}

function handleInputSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('question-input');
  if (!input || !input.value) return;

  const filtered = getFilteredQuestions();
  const question = filtered[currentStep];
  formData[question.id] = input.value;

  if (currentStep < filtered.length - 1) {
    currentStep++;
  } else {
    currentStep = filtered.length;
  }
  renderQuestion();
}

function goBack() {
  if (currentStep > 0) {
    currentStep--;
    renderQuestion();
  }
}

// Contact form submission
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate phone number
  const phoneInput = document.getElementById('form-phone');
  const phonePattern = /^(?:(?:\+|00)33[\s.-]?(?:\(0\)[\s.-]?)?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
  if (!phonePattern.test(phoneInput.value)) {
    alert('Veuillez entrer un numéro de téléphone français valide (ex: 06 12 34 56 78)');
    return;
  }

  // Validate email
  const emailInput = document.getElementById('form-email');
  const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(emailInput.value)) {
    alert('Veuillez entrer une adresse email valide (ex: exemple@domaine.fr)');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi...';

  const estimate = calculateEstimate();

  try {
    const response = await fetch('/api/forms/devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('form-name').value,
        email: document.getElementById('form-email').value,
        phone: document.getElementById('form-phone').value,
        projectDescription: document.getElementById('form-description').value,
        projectCategory: formData.projectCategory,
        propertyType: formData.propertyType,
        propertyAge: formData.propertyAge,
        renovationType: formData.renovationType,
        exteriorSubtype: formData.exteriorSubtype,
        area: formData.area,
        currentCondition: formData.currentCondition,
        timeline: formData.timeline,
        zipCode: formData.zipCode,
        estimateLow: estimate.visitRequired ? null : estimate.low,
        estimateHigh: estimate.visitRequired ? null : estimate.high,
        estimateAverage: estimate.visitRequired ? null : estimate.average,
        visitRequired: estimate.visitRequired || false
      })
    });

    if (response.ok) {
      renderEstimate();
    } else {
      alert("Une erreur s'est produite. Veuillez réessayer.");
    }
  } catch (error) {
    alert('Impossible de soumettre le formulaire. Vérifiez votre connexion internet.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Voir mon estimation';
  }
});
