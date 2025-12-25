# GitHub Secrets Configuration Guide

## 🔐 Overview

GitHub Secrets are encrypted environment variables used for secure credential management in CI/CD pipelines. They prevent accidental exposure of sensitive information in logs and source code.

## 📋 Required GitHub Secrets

Set up the following secrets in your GitHub repository:

### 1. Cloudflare Configuration
These are required for deploying to Cloudflare Pages and Functions.

- **`CLOUDFLARE_API_TOKEN`**
  - Source: Cloudflare Dashboard > My Profile > API Tokens
  - Scope: Create a token with "Cloudflare Pages" and "Cloudflare Workers Scripts" permissions
  - How to find:
    1. Go to https://dash.cloudflare.com/profile/api-tokens
    2. Click "Create Token"
    3. Use "Edit Cloudflare Workers" template
    4. Copy the generated token

- **`CLOUDFLARE_ACCOUNT_ID`**
  - Source: Cloudflare Dashboard > Pages > Your Project > Settings
  - Value: Your account ID (visible in URL: `https://dash.cloudflare.com/<ACCOUNT_ID>/`)

- **`CLOUDFLARE_PROJECT_NAME`**
  - Source: Cloudflare Pages project name
  - Value: The name of your Pages project (e.g., "no33-english-speaking-narrative")

### 2. Backend API Keys
These are required for the API generation functions to work in production.

- **`GEMINI_API_KEY`**
  - Source: https://aistudio.google.com/apikey
  - Usage: Google Gemini API for narrative generation
  - Value: Your actual API key (keep secret!)

- **`DEEPSEEK_API_KEY`**
  - Source: https://platform.deepseek.com/
  - Usage: DeepSeek API for narrative generation
  - Value: Your actual API key (keep secret!)

- **`GROK_API_KEY`**
  - Source: https://console.x.ai/
  - Usage: xAI Grok API for narrative generation
  - Value: Your actual API key (keep secret!)

### 3. Supabase Configuration
These are required for database access in production.

- **`SUPABASE_URL`**
  - Source: https://supabase.com/dashboard > Your Project > Settings > API
  - Value: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
  - Public: ✅ Can be public (also in frontend)

- **`SUPABASE_API_KEY`**
  - Source: https://supabase.com/dashboard > Your Project > Settings > API
  - Value: Use the "Service Role" key for backend (NOT the anon key)
  - Security: 🔒 Keep this secret! It has full database access

## 🔧 How to Set GitHub Secrets

### Method 1: Web Dashboard (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** > **Actions** in the left sidebar
4. Click **New repository secret**
5. Enter the secret name and value
6. Click **Add secret**

### Method 2: GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Set a secret
gh secret set GEMINI_API_KEY --body "your_actual_api_key"
gh secret set DEEPSEEK_API_KEY --body "your_actual_api_key"
gh secret set GROK_API_KEY --body "your_actual_api_key"
gh secret set CLOUDFLARE_API_TOKEN --body "your_cloudflare_token"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "your_account_id"
gh secret set CLOUDFLARE_PROJECT_NAME --body "your_project_name"
gh secret set SUPABASE_URL --body "your_supabase_url"
gh secret set SUPABASE_API_KEY --body "your_service_role_key"
```

## ✅ Verification Checklist

```
[ ] CLOUDFLARE_API_TOKEN is set
[ ] CLOUDFLARE_ACCOUNT_ID is set
[ ] CLOUDFLARE_PROJECT_NAME is set
[ ] GEMINI_API_KEY is set
[ ] DEEPSEEK_API_KEY is set
[ ] GROK_API_KEY is set
[ ] SUPABASE_URL is set
[ ] SUPABASE_API_KEY is set
```

To verify without seeing the values:
```bash
gh secret list
```

## 🔄 Using Secrets in GitHub Actions

Secrets are automatically available in GitHub Actions workflows through environment variables or as job inputs:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy with secrets
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## 🚨 Security Best Practices

1. **Never log secrets**
   - GitHub automatically masks secret values in logs
   - Be careful not to echo or print them in scripts

2. **Limit secret scope**
   - Use branch protection rules to require approvals
   - Consider using environment-specific secrets

3. **Rotate regularly**
   - Change API keys every 3-6 months
   - Immediately rotate if accidentally exposed
   - Update in GitHub Secrets after rotation

4. **Use strong, unique keys**
   - Request API keys with minimal permissions needed
   - Use different keys for different environments

5. **Audit secret access**
   - Review workflow runs in Actions tab
   - Check who has access to repository settings
   - Enable branch protection if needed

## 🔒 Secret Management Workflow

```
Local Development:
  .env & .dev.vars → npm run dev/dev:full

Pull Requests:
  GitHub Secrets → Skip backend deployment

Production Deployment (main branch):
  GitHub Secrets → Cloudflare Pages & Functions
                 → Supabase Production DB
```

## ⚠️ Troubleshooting

### Secret not available in workflow
- [ ] Check secret name matches exactly (case-sensitive)
- [ ] Ensure secret is set in repository, not organization
- [ ] Verify workflow file uses correct syntax: `${{ secrets.SECRET_NAME }}`

### Workflow fails with "401 Unauthorized"
- [ ] Check CLOUDFLARE_API_TOKEN is valid and not expired
- [ ] Verify token has correct permissions
- [ ] Try regenerating a new token

### Secret value visible in logs (accidentally)
- [ ] GitHub auto-masks most secret values
- [ ] If exposed, immediately rotate the key
- [ ] Update in GitHub Secrets

## 📚 References

- [GitHub Documentation - Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI - Secret Commands](https://cli.github.com/manual/gh_secret)
- [Cloudflare - API Token Documentation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Supabase - Managing API Keys](https://supabase.com/docs/guides/api/managing-api-keys)
