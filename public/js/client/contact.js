/**
 * Client Contact Form Handler
 * Submits to /api/forms/contact instead of Netlify
 */
document.getElementById('client-contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi...';

  try {
    const response = await fetch('/api/forms/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        name: form.querySelector('[name="name"]').value,
        email: form.querySelector('[name="email"]').value,
        phone: form.querySelector('[name="phone"]').value || '',
        subject: form.querySelector('[name="subject"]').value || '',
        message: form.querySelector('[name="message"]').value || ''
      })
    });

    if (response.ok) {
      form.innerHTML = `
        <div class="text-center" style="padding: 2rem 0;">
          <div class="success-icon" style="margin-bottom: 1rem;">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:32px;height:32px;color:#16a34a">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="heading-card mb-4">Message envoyé</h3>
          <p class="text-body">Merci pour votre message. Nous vous répondrons dans les meilleurs délais.</p>
        </div>`;
    } else {
      alert("Une erreur s'est produite. Veuillez réessayer.");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  } catch (error) {
    alert('Impossible de soumettre le formulaire. Vérifiez votre connexion internet.');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});
