# Environment Configuration & Security Guide

## 📋 Overview

This document explains how to properly configure environment variables for local development and production deployment, following security best practices.

## 🔐 Security First Principles

- **Never commit secrets to version control** - Use `.dev.vars` for local development
- **NEVER hardcode API keys** in source code or package.json scripts
- **Use Cloudflare/GitHub mechanisms** for production secrets
- **Rotate keys regularly** if accidentally exposed
- **Different secrets for different environments** - dev, staging, production

## 📁 Configuration Files

### 1. `.dev.vars` (Local Development)
**Purpose:** Store environment variables for local Cloudflare Pages Functions development
**Status:** ✅ Ignored by git (.gitignore)
**Content:** Backend API keys and Supabase configuration

**Setup:**
```bash
# Copy the template
cp .dev.vars.example .dev.vars

# Edit with your actual API keys
nano .dev.vars
```

**File Location:** `/home/user/No33_English_Speaking_Narrative/.dev.vars`

### 2. `.env` (Local Frontend)
**Purpose:** Store Vite frontend environment variables
**Status:** ✅ Ignored by git (.gitignore)
**Content:** Supabase URL and public anonymous key for frontend

**Setup for Local Development:**
```bash
# Create .env in project root
cat > .env << 'EOF'
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
EOF
```

**Setup for Production:**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
```

**Note:** Frontend keys are publicly visible in browser - use row-level security on Supabase instead

### 3. `wrangler.toml`
**Purpose:** Centralized Cloudflare Wrangler configuration
**Status:** ✅ Safe to commit (no secrets)
**Content:** Project metadata, build settings, environment configuration

**Usage:**
```bash
# Development (auto-loads .dev.vars)
npm run dev:full

# With environment specification
npx wrangler pages dev src --env development
```

## 🔑 Required API Keys

### Backend Services (Required for API Generation)

1. **Google Gemini API Key**
   - Source: https://aistudio.google.com/apikey
   - Usage: Generate narrative with Gemini model
   - How to set:
     - Local: Add to `.dev.vars`
     - Production: Use Cloudflare Dashboard or `wrangler secret put`

2. **DeepSeek API Key**
   - Source: https://platform.deepseek.com/
   - Usage: Generate narrative with DeepSeek model
   - How to set:
     - Local: Add to `.dev.vars`
     - Production: Use Cloudflare Dashboard or `wrangler secret put`

3. **xAI Grok API Key**
   - Source: https://console.x.ai/
   - Usage: Generate narrative with Grok model
   - How to set:
     - Local: Add to `.dev.vars`
     - Production: Use Cloudflare Dashboard or `wrangler secret put`

### Frontend Services

4. **Supabase Configuration**
   - Project URL: From Supabase Dashboard
   - Anonymous Key: From Supabase Dashboard > Settings > API > anon[public] key
   - Usage: Database access for narratives storage

## ⚙️ Environment Setup Instructions

### Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Frontend (.env)**
   ```bash
   cp .env.example .env  # or create manually
   # Edit with your local/staging Supabase credentials
   ```

3. **Configure Backend (.dev.vars)**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit with your actual API keys
   ```

4. **Start Supabase Local Instance**
   ```bash
   npx supabase start
   ```

5. **Run Development Server**
   ```bash
   # Frontend only (Vite)
   npm run dev

   # OR Full stack with backend
   npm run dev:full
   ```

### Production Deployment Setup

1. **Set Secrets in Cloudflare**
   ```bash
   # Requires wrangler authentication
   wrangler login

   # Set backend API keys as secrets
   wrangler secret put GEMINI_API_KEY
   wrangler secret put DEEPSEEK_API_KEY
   wrangler secret put GROK_API_KEY
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_API_KEY
   ```

2. **Verify Secrets are Set**
   ```bash
   # List all secrets (values are hidden)
   wrangler secret list
   ```

3. **Deploy to Production**
   ```bash
   npm run build
   wrangler pages deploy dist
   ```

## 🔄 Alternative: GitHub Secrets (CI/CD)

For automated deployments with GitHub Actions:

1. **Set GitHub Secrets**
   - Go to: Repository > Settings > Secrets and Variables > Actions
   - Add these secrets:
     - `GEMINI_API_KEY`
     - `DEEPSEEK_API_KEY`
     - `GROK_API_KEY`
     - `SUPABASE_URL`
     - `SUPABASE_API_KEY`
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`

2. **Use in GitHub Actions Workflow**
   ```yaml
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Deploy to Cloudflare
           env:
             GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
             DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
             GROK_API_KEY: ${{ secrets.GROK_API_KEY }}
           run: |
             npm install
             npm run build
             wrangler pages deploy dist
   ```

## ⚠️ Git Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.dev.vars` is in `.gitignore`
- [ ] `.dev.vars.example` is committed (template only, no real values)
- [ ] No API keys in `package.json`
- [ ] No API keys in any source files
- [ ] No credentials in commit messages
- [ ] Regular review of git history for accidental commits

## 🗂️ File Structure

```
project-root/
├── .env                    # Frontend env variables (LOCAL - not in git)
├── .env.example           # Frontend env template (in git)
├── .dev.vars              # Backend env variables (LOCAL - not in git)
├── .dev.vars.example      # Backend env template (in git) ✅
├── .gitignore             # Ensures secrets aren't committed
├── wrangler.toml          # Wrangler configuration (in git)
├── src/
│   └── supabase.js        # Frontend: Uses VITE_SUPABASE_* from .env
├── functions/api/
│   └── generate.js        # Backend: Uses API keys from .dev.vars
└── docs/
    └── ENVIRONMENT_SETUP.md  # This file
```

## 🆘 Troubleshooting

### Issue: "GEMINI_API_KEY is undefined"
**Solution:**
- Check `.dev.vars` file exists: `ls -la .dev.vars`
- Check it's not in `.gitignore`: `grep .dev.vars .gitignore`
- Restart dev server: `npm run dev:full`

### Issue: "Cannot find module '@supabase/supabase-js'"
**Solution:**
```bash
npm install
```

### Issue: Accidentally committed secrets?
**Solutions:**
1. **Immediately rotate the exposed key** - Get a new API key
2. **Remove from git history:**
   ```bash
   # Option A: Using git filter-repo (recommended)
   git filter-repo --invert-paths --path .env

   # Option B: Create new clean commit
   git rm --cached .env
   git commit -m "Remove exposed credentials"
   ```
3. **Force push to clean remote:**
   ```bash
   git push --force-with-lease origin branch-name
   ```

## 📚 Additional Resources

- [Cloudflare Pages Functions - Environment Variables](https://developers.cloudflare.com/pages/functions/runtime-apis/env/)
- [Wrangler CLI - Environment Variables](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Supabase - Environment Variables](https://supabase.com/docs/guides/api/managing-api-keys)

## ✅ Validation Checklist

Before deploying to production:

- [ ] All required API keys configured
- [ ] `.dev.vars` file NOT committed to git
- [ ] `.dev.vars.example` committed as template
- [ ] `wrangler.toml` configured with correct project details
- [ ] Tested locally with `npm run dev:full`
- [ ] Secrets set in Cloudflare dashboard or via `wrangler secret put`
- [ ] Built successfully: `npm run build`
- [ ] No hardcoded keys in any source files
- [ ] Git history cleaned of any exposed credentials
