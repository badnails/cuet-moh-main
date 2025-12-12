# Branch Protection Configuration Guide

This document outlines the recommended branch protection rules for the `main` branch to ensure code quality and prevent accidental changes.

## Setting Up Branch Protection Rules

### Via GitHub UI

1. Navigate to: **Settings** → **Branches** → **Add rule**
2. Branch name pattern: `main`

### Recommended Rules

#### ✅ Required Status Checks

Enable **Require status checks to pass before merging**:

- ☑️ Require branches to be up to date before merging
- Select required checks:
  - `lint` (Lint job from CI)
  - `test` (E2E Tests job from CI)
  - `build` (Build Docker Image job from CI, includes Trivy container scan)
  - `codeql` (CodeQL Analysis from Security)
  - `sonarqube` (SonarQube Analysis from Security)
  - `trivy` (Trivy Filesystem Scan from Security)

#### ✅ Pull Request Reviews

Enable **Require pull request reviews before merging**:

- Required approving reviews: **1**
- ☑️ Dismiss stale pull request approvals when new commits are pushed
- ☑️ Require review from Code Owners (if CODEOWNERS file exists)

#### ✅ Commit History

Enable **Require linear history**:
- Prevents merge commits, enforces rebase or squash

#### ✅ Additional Protections

- ☑️ **Require conversation resolution before merging**
  - All PR comments must be resolved
  
- ☑️ **Do not allow bypassing the above settings**
  - Applies to administrators too
  
- ☑️ **Restrict who can push to matching branches**
  - Optional: Limit direct pushes (force all changes through PRs)

### Configuration as Code (Optional)

You can also configure branch protection using GitHub CLI or Terraform:

#### Using GitHub CLI

```bash
# Install GitHub CLI: https://cli.github.com/

gh api repos/badnails/cuet-moh-main/branches/main/protection \
  --method PUT \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test", "build", "codeql", "sonarqube", "trivy"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
```

#### Using Terraform

```hcl
resource "github_branch_protection" "main" {
  repository_id = "cuet-moh-main"
  pattern       = "main"

  required_status_checks {
    strict   = true
    contexts = ["lint", "test", "build", "codeql", "sonarqube", "trivy"]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    required_approving_review_count = 1
  }

  enforce_admins                  = true
  require_linear_history          = true
  require_conversation_resolution = true
  allow_force_pushes              = false
  allow_deletions                 = false
}
```

## Workflow After Protection

### For Contributors

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Add my feature"
   ```

3. **Push to remote**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request**
   - Go to GitHub and create a PR from your branch to `main`
   - Wait for CI/CD checks to pass
   - Request review from a team member

5. **Address Review Comments**
   - Make requested changes
   - Push new commits (or force push after rebase)
   - Resolve all conversations

6. **Merge PR**
   - Once approved and all checks pass
   - Use "Squash and merge" or "Rebase and merge"

### Emergency Hotfixes

For critical issues requiring immediate deployment:

1. Create hotfix branch from `main`
2. Make minimal necessary changes
3. Fast-track PR review
4. Merge as soon as checks pass

**Note:** Even admins should follow the PR process to maintain code quality and audit trail.

## Testing Branch Protection

After setup, verify protection is working:

```bash
# This should fail:
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "Direct commit to main"
git push origin main
# Expected: ! [remote rejected] main -> main (protected branch hook declined)
```

## Maintenance

Review and update branch protection rules:
- When adding new CI checks
- When team size or structure changes
- When security requirements evolve

## References

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CLI Branch Protection](https://docs.github.com/en/rest/branches/branch-protection)
- [Terraform GitHub Provider](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection)
