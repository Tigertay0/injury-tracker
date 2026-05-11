// Auth Page — Login / Register with Firebase Auth
import { auth } from '../firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { createUserProfile, getUserProfile } from '../lib/firestore.js';
import { validateRegistrationInput, requireEmail, ValidationError } from '../lib/validation.js';
import { checkRateLimit, resetRateLimit, LIMITS, RateLimitError, authKey } from '../lib/rate-limiter.js';
import { navigate } from '../router.js';

export async function renderAuth() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-page">
      <div class="card auth-card">
        <div class="text-center mb-lg">
          <h1 class="type-page-title" style="color: var(--primary);">PITCHSAFE</h1>
          <p class="type-body-main" style="color: var(--on-surface-variant);">Soccer Injury Risk Management</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">LOGIN</button>
          <button class="auth-tab" data-tab="register">REGISTER</button>
        </div>

        <div class="auth-error" id="auth-error"></div>

        <!-- Login Form -->
        <form id="login-form" class="flex-col">
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input class="form-input" type="email" id="login-email" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" type="password" id="login-password" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary w-full mt-md">LOG IN</button>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="flex-col hidden">
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input class="form-input" type="email" id="reg-email" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Password (min 6 characters)</label>
            <input class="form-input" type="password" id="reg-password" placeholder="••••••••" minlength="6" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-position">Position</label>
            <select class="form-input" id="reg-position" required>
              <option value="">Select your position</option>
              <option value="GK">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward / Winger</option>
            </select>
          </div>
          <label style="display:flex;align-items:flex-start;gap:var(--space-sm);margin-top:var(--space-sm);cursor:pointer;">
            <input type="checkbox" id="reg-consent" required style="margin-top:3px;" />
            <span class="type-label-sm" style="font-weight:400;">I consent to PitchSafe storing my training and health data for risk analysis. I understand I can delete all my data at any time.</span>
          </label>
          <button type="submit" class="btn btn-primary w-full mt-md">CREATE ACCOUNT</button>
        </form>

        <div class="auth-divider">or</div>

        <button class="btn btn-google" id="google-btn">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.34 2.44 10.5l8.09-5.91z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  `;

  // Tab switching
  const tabs = app.querySelectorAll('.auth-tab');
  const loginForm = app.querySelector('#login-form');
  const registerForm = app.querySelector('#register-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      hideError();
      if (tab.dataset.tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      }
    });
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const rawEmail    = app.querySelector('#login-email').value;
    const rawPassword = app.querySelector('#login-password').value;
    try {
      // 1. Validate format
      const email = requireEmail(rawEmail, 'email');
      if (typeof rawPassword !== 'string' || rawPassword.length < 6 || rawPassword.length > 128) {
        throw new ValidationError('Password must be 6–128 characters');
      }
      // 2. Rate limit BEFORE Firebase call — 5 attempts / 15 min per email
      checkRateLimit('login', authKey('login', email), LIMITS.auth);
      // 3. Firebase Auth
      await signInWithEmailAndPassword(auth, email, rawPassword);
      // 4. Reset limit on success
      resetRateLimit(authKey('login', email));
      navigate('/dashboard');
    } catch (err) {
      if (err.name === 'RateLimitError') showError(err.message);
      else if (err.name === 'ValidationError') showError(err.message);
      else showError(friendlyError(err.code));
    }
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const consent = app.querySelector('#reg-consent').checked;
    if (!consent) { showError('You must consent to data storage.'); return; }
    try {
      // 1. Validate
      const validated = validateRegistrationInput({
        email:    app.querySelector('#reg-email').value,
        password: app.querySelector('#reg-password').value,
        position: app.querySelector('#reg-position').value,
      });
      // 2. Rate limit BEFORE Firebase call — 5 attempts / 15 min per email
      checkRateLimit('registration', authKey('register', validated.email), LIMITS.auth);
      // 3. Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, validated.email, validated.password);
      await createUserProfile(cred.user.uid, {
        email:       validated.email,
        position:    validated.position,
        cleatType:   '',
        surfaceType: '',
        dataConsent: true,
      });
      // 4. Reset on success
      resetRateLimit(authKey('register', validated.email));
      navigate('/dashboard');
    } catch (err) {
      if (err.name === 'RateLimitError') showError(err.message);
      else if (err.name === 'ValidationError') showError(err.message);
      else showError(friendlyError(err.code));
    }
  });

  // Google Sign-In
  app.querySelector('#google-btn').addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const existing = await getUserProfile(result.user.uid);
      if (!existing) {
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          position: '',
          cleatType: '',
          surfaceType: '',
          dataConsent: true,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      showError(friendlyError(err.code));
    }
  });

  function showError(msg) {
    const el = app.querySelector('#auth-error');
    el.textContent = msg;
    el.classList.add('visible');
  }

  function hideError() {
    const el = app.querySelector('#auth-error');
    el.classList.remove('visible');
  }

  function friendlyError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'An account with this email already exists.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/popup-closed-by-user': return 'Sign-in popup was closed.';
      default: return 'Something went wrong. Please try again.';
    }
  }
}
