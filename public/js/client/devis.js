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
      { value: 'specific-room', label: 'Pièce spécifique' },
      { value: 'exterior', label: 'Travaux extérieurs' }
    ]
  },
  {
    id: 'propertyType',
    title: 'Type de bien ?',
    condition: (data) => data.projectCategory !== 'exterior',
    options: [
      { value: 'house', label: 'Maison' },
      { value: 'flat', label: 'Appartement' },
      { value: 'office', label: 'Bureau' }
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
    options: [
      { value: '0-10', label: 'Moins de 10 ans' },
      { value: '10-30', label: '10-30 ans' },
      { value: '30+', label: 'Plus de 30 ans' }
    ]
  },
  {
    id: 'renovationType',
    title: 'Type de rénovation ?',
    condition: (data) => data.projectCategory === 'renovation',
    options: [
      { value: 'complete', label: 'Complète' },
      { value: 'partial', label: 'Partielle' },
      { value: 'insulation', label: 'Isolation & Énergie' },
      { value: 'electrical', label: 'Électrique' },
      { value: 'plumbing', label: 'Plomberie' },
      { value: 'painting', label: 'Peinture' }
    ]
  },
  {
    id: 'renovationType',
    title: 'Quelle pièce ?',
    condition: (data) => data.projectCategory === 'specific-room',
    options: [
      { value: 'kitchen', label: 'Cuisine' },
      { value: 'bathroom', label: 'Salle de bain' },
      { value: 'bedroom', label: 'Chambre' },
      { value: 'livingroom', label: 'Salon' }
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
    id: 'renovationType',
    title: "Type d'extension ?",
    condition: (data) => data.projectCategory === 'extension',
    options: [
      { value: 'extension', label: 'Extension maison' }
    ]
  },
  {
    id: 'area',
    title: 'Superficie concernée ?',
    condition: (data) => data.renovationType !== 'facade' && data.renovationType !== 'roofing',
    type: 'input',
    inputType: 'number',
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'area',
    title: 'Surface de la façade ?',
    condition: (data) => data.renovationType === 'facade',
    type: 'input',
    inputType: 'number',
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'area',
    title: 'Surface de la toiture ?',
    condition: (data) => data.renovationType === 'roofing',
    type: 'input',
    inputType: 'number',
    placeholder: 'en m²',
    suffix: 'm²'
  },
  {
    id: 'currentCondition',
    title: 'État actuel ?',
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
  const renovationBase = {
    'complete': 60000, 'partial': 30000, 'kitchen': 18000, 'bathroom': 14000,
    'bedroom': 8000, 'livingroom': 12000,
    'insulation': 15000, 'electrical': 10000, 'plumbing': 12000, 'flooring': 8000,
    'extension': 45000
  };

  // Price per m² for exterior work subtypes
  const exteriorPricePerM2 = {
    'painting': 30,
    'coating': 40,
    'exterior-insulation': 140,
    'traditional-tile': 200,
    'flat-roof': 300
  };

  const propertyMultiplier = { 'house': 1.5, 'flat': 1.0, 'office': 1.3, 'commercial': 1.8 };
  const conditionMultiplier = { 'good': 0.9, 'average': 1.0, 'poor': 1.1 };
  const ageMultiplier = { '0-10': 0.9, '10-30': 1.0, '30+': 1.1 };

  let basePrice;

  // Check if this is exterior work with subtype (façade or toiture)
  if (formData.exteriorSubtype && exteriorPricePerM2[formData.exteriorSubtype]) {
    const areaNum = parseInt(formData.area) || 0;
    basePrice = exteriorPricePerM2[formData.exteriorSubtype] * areaNum;
  } else {
    // Standard calculation for other renovation types
    basePrice = renovationBase[formData.renovationType] || 30000;

    if (formData.area) {
      const areaNum = parseInt(formData.area);
      if (areaNum > 150) basePrice *= 1.5;
      else if (areaNum > 100) basePrice *= 1.3;
      else if (areaNum > 50) basePrice *= 1.1;
      if (areaNum > 200) basePrice += (areaNum - 200) * 400;
    }
  }

  // Apply multipliers (only if not exterior work, since exterior work uses per-m² pricing)
  if (!formData.exteriorSubtype) {
    basePrice *= propertyMultiplier[formData.propertyType] || 1;
  }

  basePrice *= conditionMultiplier[formData.currentCondition] || 1;
  basePrice *= ageMultiplier[formData.propertyAge] || 1;

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
                 ${question.maxLength ? `maxlength="${question.maxLength}"` : ''}
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
      html += `<button class="option-btn${selected}" onclick="handleOptionClick('${opt.value}')">${opt.label}</button>`;
    });
    html += '</div>';
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
        <div class="estimate-value">${estimate.low.toLocaleString()} - ${estimate.high.toLocaleString()} €</div>
        <div class="estimate-average">Moyenne : ${estimate.average.toLocaleString()} €</div>
      </div>
    </div>

    <div class="card card-padded text-center">
      <h3 class="heading-card mb-4">Envie d'en discuter ?</h3>
      <p class="text-body mb-6">Planifiez un appel gratuit avec un expert pour affiner votre projet</p>
      <a href="https://calendly.com/YOUR_CALENDLY_LINK" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">
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

function handleOptionClick(value) {
  const filtered = getFilteredQuestions();
  const question = filtered[currentStep];
  formData[question.id] = value;

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
        estimateLow: estimate.low,
        estimateHigh: estimate.high,
        estimateAverage: estimate.average
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
