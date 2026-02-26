/**
 * Auth Logic (js/auth.js)
 * -----------------------
 * Handles the 4-step authentication flow:
 * 1. Login → validates credentials → stores user → redirects to dashboard
 * 2. Forgot Password → checks email exists → shows confirmation
 * 3. Email Sent → simulates email link click
 * 4. Reset Password → updates password → returns to login with success message
 * 
 * User session is stored in sessionStorage as JSON.
 * All other pages check for this session on load.
 */

// ---------------------------------------------------------------
// If user is already logged in, redirect to dashboard
// ---------------------------------------------------------------
(function checkExistingSession() {
  const user = sessionStorage.getItem('artisan_user');
  if (user) {
    const userData = JSON.parse(user);
    // If not onboarded, go to onboarding
    if (!userData.is_onboarded) {
      window.location.href = '/pro/portail/onboarding';
    } else {
      window.location.href = '/pro/portail/dashboard';
    }
  }
})();

// ---------------------------------------------------------------
// VIEW SWITCHING
// ---------------------------------------------------------------
// Tracks which email was entered for forgot/reset flow
let resetEmail = '';

/**
 * Shows one auth view and hides all others.
 * viewName: 'login' | 'forgot' | 'reset-sent' | 'reset-new'
 */
function showView(viewName) {
  // Hide all views
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('forgot-view').classList.add('hidden');
  document.getElementById('reset-sent-view').classList.add('hidden');

  // Clear all error messages
  document.querySelectorAll('.alert-error').forEach(el => el.classList.add('hidden'));

  // Show the requested view
  switch (viewName) {
    case 'login':
      document.getElementById('login-view').classList.remove('hidden');
      break;
    case 'forgot':
      document.getElementById('forgot-view').classList.remove('hidden');
      // Pre-fill forgot email from login field
      const loginEmail = document.getElementById('login-email').value;
      if (loginEmail) {
        document.getElementById('forgot-email').value = loginEmail;
      }
      break;
    case 'reset-sent':
      document.getElementById('reset-sent-view').classList.remove('hidden');
      document.getElementById('sent-email-display').textContent = resetEmail;
      break;
  }
}

// ---------------------------------------------------------------
// 1. LOGIN
// ---------------------------------------------------------------
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errorEl.classList.add('hidden');
  btn.textContent = 'Connexion en cours...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'E-mail ou mot de passe incorrect.');
    }

    const user = await response.json();

    // Store user session
    sessionStorage.setItem('artisan_user', JSON.stringify(user));

    // Redirect based on onboarding status
    if (!user.is_onboarded) {
      window.location.href = '/pro/portail/onboarding';
    } else {
      window.location.href = '/pro/portail/dashboard';
    }

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Se connecter';
    btn.disabled = false;
  }
});

// ---------------------------------------------------------------
// 2. FORGOT PASSWORD
// ---------------------------------------------------------------
document.getElementById('forgot-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('forgot-email').value.trim();
  const errorEl = document.getElementById('forgot-error');
  const btn = document.getElementById('forgot-btn');

  errorEl.classList.add('hidden');
  btn.textContent = 'Envoi...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.sent) {
      resetEmail = email;
      showView('reset-sent');
    } else {
      errorEl.textContent = data.error || 'Une erreur est survenue.';
      errorEl.classList.remove('hidden');
    }

  } catch (err) {
    errorEl.textContent = 'Une erreur est survenue.';
    errorEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Envoyer le lien';
    btn.disabled = false;
  }
});