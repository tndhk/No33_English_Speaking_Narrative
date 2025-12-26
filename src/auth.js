/**
 * Authentication Module
 * Handles user authentication using Supabase Auth
 */

import { supabase } from './supabase.js';

// Authentication state
const authState = {
  user: null,
  session: null,
  loading: true,
};

/**
 * Initialize authentication
 * Check for existing session and set up auth state listener
 */
export async function initAuth() {
  try {
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      authState.loading = false;
      return null;
    }

    authState.session = session;
    authState.user = session?.user || null;
    authState.loading = false;

    // Set up auth state change listener
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      authState.session = session;
      authState.user = session?.user || null;

      // Trigger UI update
      updateAuthUI();

      // Dispatch custom event for other modules to listen to
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { user: authState.user, session: authState.session, event }
      }));
    });

    return authState.user;
  } catch (error) {
    console.error('Error initializing auth:', error);
    authState.loading = false;
    return null;
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return authState.user;
}

/**
 * Get current session
 */
export function getCurrentSession() {
  return authState.session;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return authState.user !== null;
}

/**
 * Get user ID (for database queries)
 */
export function getUserId() {
  return authState.user?.id || null;
}

/**
 * Render authentication UI
 */
export function renderAuthUI(container) {
  if (!container) return;

  // Clear container
  container.innerHTML = '';

  if (authState.loading) {
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-container';

    const loading = document.createElement('div');
    loading.className = 'auth-loading';
    loading.textContent = '読み込み中...';

    wrapper.appendChild(loading);
    container.appendChild(wrapper);
    return;
  }

  if (authState.user) {
    // User is logged in
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-container auth-logged-in';

    // Profile Menu Container
    const profileContainer = document.createElement('div');
    profileContainer.className = 'profile-container';
    profileContainer.style.position = 'absolute';
    profileContainer.style.top = '1rem';
    profileContainer.style.right = '1rem';
    profileContainer.style.zIndex = '100';

    // 1. Profile Icon Button
    const profileBtn = document.createElement('button');
    profileBtn.className = 'profile-btn';
    profileBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.1)"/>
        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#94a3b8"/>
      </svg>
    `;
    profileBtn.style.background = 'none';
    profileBtn.style.border = 'none';
    profileBtn.style.padding = '0';
    profileBtn.style.cursor = 'pointer';
    profileBtn.style.display = 'flex';
    profileBtn.style.alignItems = 'center';
    profileBtn.title = 'User Profile';

    // 2. Dropdown Menu (Hidden by default)
    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.style.display = 'none'; // hidden
    menu.style.position = 'absolute';
    menu.style.top = '100%';
    menu.style.right = '0';
    menu.style.marginTop = '0.5rem';
    menu.style.background = '#1e293b';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '0.75rem';
    menu.style.padding = '1rem';
    menu.style.minWidth = '200px';
    menu.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
    menu.style.flexDirection = 'column';
    menu.style.gap = '0.75rem';

    // Menu Content
    const emailSpan = document.createElement('div');
    emailSpan.className = 'user-email';
    emailSpan.textContent = authState.user.email;
    emailSpan.style.fontSize = '0.85rem';
    emailSpan.style.color = '#94a3b8';
    emailSpan.style.marginBottom = '0.5rem';
    emailSpan.style.borderBottom = '1px solid var(--border-color)';
    emailSpan.style.paddingBottom = '0.5rem';
    emailSpan.style.wordBreak = 'break-all';

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.className = 'btn btn-secondary';
    logoutBtn.textContent = 'ログアウト';
    logoutBtn.style.fontSize = '0.85rem';
    logoutBtn.style.padding = '0.5rem';
    logoutBtn.addEventListener('click', async () => {
      const result = await signOut();
      if (!result.success) {
        alert('ログアウトに失敗しました: ' + result.error);
      }
    });

    menu.appendChild(emailSpan);
    menu.appendChild(logoutBtn);

    // Toggle menu visibility
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'flex';
      menu.style.display = isVisible ? 'none' : 'flex';
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    // Prevent closing when clicking inside menu
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    profileContainer.appendChild(profileBtn);
    profileContainer.appendChild(menu);
    wrapper.appendChild(profileContainer);
    container.appendChild(wrapper);
  } else {
    // User is not logged in
    const wrapper = document.createElement('div');
    wrapper.className = 'auth-container auth-logged-out';

    const authFormDiv = document.createElement('div');
    authFormDiv.className = 'auth-form';

    const title = document.createElement('h2');
    title.className = 'auth-title';
    title.textContent = 'ログイン';

    const desc = document.createElement('p');
    desc.className = 'auth-description';
    desc.textContent = '学習履歴と設定を保存するには、アカウントが必要です。';

    // Google Login Button
    const googleBtn = document.createElement('button');
    googleBtn.type = 'button';
    googleBtn.className = 'btn btn-google';
    googleBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
        <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
      </svg>
      Googleでログイン
    `;
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.textContent = '処理中...';
      const result = await signInWithGoogle();
      if (!result.success) {
        alert('ログインに失敗しました: ' + result.error);
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/><path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/></svg>Googleでログイン`;
      }
    });

    authFormDiv.appendChild(title);
    authFormDiv.appendChild(desc);
    authFormDiv.appendChild(googleBtn);
    wrapper.appendChild(authFormDiv);
    container.appendChild(wrapper);
  }
}

/**
 * Set up authentication form handlers
 */
function setupAuthFormHandlers() {
  // This function is no longer needed for Google-only login
  // Keeping it for backward compatibility but it does nothing
}

/**
 * Update auth UI (called when auth state changes)
 */
function updateAuthUI() {
  const authContainer = document.getElementById('auth-ui-container');
  if (authContainer) {
    renderAuthUI(authContainer);
  }

  // Update app visibility based on auth state
  const appContent = document.getElementById('app-content');
  const authRequired = document.getElementById('auth-required');

  if (appContent && authRequired) {
    if (authState.user) {
      appContent.style.display = 'block';
      authRequired.style.display = 'none';
    } else {
      appContent.style.display = 'none';
      authRequired.style.display = 'block';
    }
  }
}

/**
 * Convert Supabase error messages to Japanese
 */
function getJapaneseErrorMessage(error) {
  const errorMessages = {
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスが確認されていません',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
    'Unable to validate email address': 'メールアドレスの形式が正しくありません',
    'Signup requires a valid password': 'パスワードを入力してください',
    'Invalid email': 'メールアドレスの形式が正しくありません',
  };

  // Check for exact matches
  if (errorMessages[error]) {
    return errorMessages[error];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMessages)) {
    if (error.includes(key)) {
      return value;
    }
  }

  // Default error message
  return `エラー: ${error}`;
}

// Export for global access
window.auth = {
  initAuth,
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  getUserId,
  renderAuthUI,
};
