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

  if (authState.loading) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-loading">読み込み中...</div>
      </div>
    `;
    return;
  }

  if (authState.user) {
    // User is logged in - show user info and logout button
    container.innerHTML = `
      <div class="auth-container auth-logged-in">
        <div class="user-info">
          <span class="user-email">${authState.user.email}</span>
          <button id="logout-btn" class="btn btn-secondary">ログアウト</button>
        </div>
      </div>
    `;

    // Add logout handler
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      const result = await signOut();
      if (!result.success) {
        alert('ログアウトに失敗しました: ' + result.error);
      }
    });
  } else {
    // User is not logged in - show login/signup form
    container.innerHTML = `
      <div class="auth-container auth-logged-out">
        <div class="auth-form">
          <h2 class="auth-title">ログイン / 新規登録</h2>
          <p class="auth-description">
            学習履歴と設定を保存するには、アカウントが必要です。
          </p>

          <div class="form-tabs">
            <button id="tab-login" class="tab-btn active">ログイン</button>
            <button id="tab-signup" class="tab-btn">新規登録</button>
          </div>

          <form id="auth-form" class="auth-form-fields">
            <div class="form-group">
              <label for="auth-email">メールアドレス</label>
              <input
                type="email"
                id="auth-email"
                placeholder="example@email.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label for="auth-password">パスワード</label>
              <input
                type="password"
                id="auth-password"
                placeholder="6文字以上"
                required
                minlength="6"
                autocomplete="current-password"
              />
            </div>

            <div id="auth-error" class="auth-error" style="display: none;"></div>

            <button type="submit" id="auth-submit-btn" class="btn btn-primary">
              ログイン
            </button>
          </form>
        </div>
      </div>
    `;

    // Set up form handlers
    setupAuthFormHandlers();
  }
}

/**
 * Set up authentication form handlers
 */
function setupAuthFormHandlers() {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit-btn');
  const errorDiv = document.getElementById('auth-error');

  let isLoginMode = true;

  // Tab switching
  loginTab?.addEventListener('click', () => {
    isLoginMode = true;
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    submitBtn.textContent = 'ログイン';
    errorDiv.style.display = 'none';
  });

  signupTab?.addEventListener('click', () => {
    isLoginMode = false;
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    submitBtn.textContent = '新規登録';
    errorDiv.style.display = 'none';
  });

  // Form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    // Disable form during submission
    submitBtn.disabled = true;
    submitBtn.textContent = '処理中...';
    errorDiv.style.display = 'none';

    try {
      let result;
      if (isLoginMode) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password);
      }

      if (result.success) {
        if (!isLoginMode) {
          // Show success message for signup
          alert('登録が完了しました！確認メールをご確認ください。');
        }
        // Form will be replaced by logged-in UI via auth state change
      } else {
        // Show error
        errorDiv.textContent = getJapaneseErrorMessage(result.error);
        errorDiv.style.display = 'block';
      }
    } catch (error) {
      errorDiv.textContent = 'エラーが発生しました。もう一度お試しください。';
      errorDiv.style.display = 'block';
    } finally {
      // Re-enable form
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'ログイン' : '新規登録';
    }
  });
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
  signOut,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  getUserId,
  renderAuthUI,
};
