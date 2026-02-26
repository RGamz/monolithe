/**
 * Onboarding Page Logic (js/onboarding.js)
 * ------------------------------------------
 * Handles profile completion for new users.
 * Submits company name, address, and specialty.
 * Updates the session and redirects to dashboard.
 */

// Check session - redirect to login if not logged in
const raw = sessionStorage.getItem('artisan_user');
if (!raw) {
  window.location.href = '/pro/portail';
}

const currentUser = JSON.parse(raw);

// If already onboarded OR not an artisan, go to dashboard
if (currentUser.is_onboarded || currentUser.role !== 'ARTISAN') {
  window.location.href = '/pro/portail/dashboard';
}

// Pre-fill fields if user has existing data
if (currentUser.company_name) document.getElementById('ob-company').value = currentUser.company_name;
if (currentUser.address) document.getElementById('ob-address').value = currentUser.address;
if (currentUser.specialty) document.getElementById('ob-specialty').value = currentUser.specialty;

// Handle form submit
document.getElementById('onboarding-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const company_name = document.getElementById('ob-company').value.trim();
  const address = document.getElementById('ob-address').value.trim();
  const specialty = document.getElementById('ob-specialty').value;
  const errorEl = document.getElementById('ob-error');
  const btn = document.getElementById('ob-btn');

  errorEl.classList.add('hidden');
  btn.textContent = 'Enregistrement...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/users/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        company_name,
        address,
        specialty
      })
    });

    if (!res.ok) {
      throw new Error('Échec de la mise à jour du profil.');
    }

    const updatedUser = await res.json();

    // Update session with new data
    sessionStorage.setItem('artisan_user', JSON.stringify(updatedUser));

    // Redirect to dashboard
    window.location.href = '/pro/portail/dashboard';

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Terminer le profil';
    btn.disabled = false;
  }
});
