# CircleCI + Codegen: Quick Reference

**Шпаргалка для быстрого доступа**

---

## 🚀 Quick Setup (5 minutes)

```bash
# 1. Install Codegen GitHub App
https://github.com/apps/codegen-sh → Install

# 2. Enable CircleCI project
https://app.circleci.com/projects → Set Up Project

# 3. Connect to Codegen
https://codegen.com/settings/integrations → CircleCI → Connect

# 4. Configure webhook
https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks
URL: https://api.codegen.com/webhooks/circleci
Events: workflow-completed, job-completed

# 5. Test
git push origin main
```

---

## 📊 Key Capabilities

| Feature | Description | Success Rate |
|---------|-------------|--------------|
| Test Failures | Fix failing unit/integration tests | 75% |
| Lint Errors | Auto-format ESLint/Prettier | 95% |
| Type Errors | Fix TypeScript types | 90% |
| Build Errors | Fix compilation issues | 70% |
| Security | Update vulnerable packages | 85% |

---

## ⚙️ Configuration Essentials

### Minimal .codegen/config.yml

```yaml
integrations:
  circleci:
    enabled: true
    auto_fix: true
    max_retries: 3
    fix_types:
      - test_failures
      - lint_errors
      - type_errors
```

### Recommended .codegen/config.yml

```yaml
integrations:
  circleci:
    enabled: true
    auto_fix: true
    max_retries: 3
    notify_on_fix: true
    separate_commits: true
    commit_message_prefix: "fix(ci): "

    fix_types:
      - test_failures
      - lint_errors
      - type_errors
      - build_errors
      - security_warnings

    exclude_checks:
      - manual-approval
      - deployment

    budget_controls:
      max_cost_per_run: 100
      max_daily_cost: 1000
```

---

## 🔧 Common Commands

```bash
# Test CircleCI connection
make circleci-test

# Setup CircleCI project
make circleci-setup

# Full integration setup
make circleci-codegen

# Manual API test
curl -H "Circle-Token: $CIRCLECI_TOKEN" \
  https://circleci.com/api/v2/me
```

---

## 📈 Monitoring

```bash
# Codegen runs
https://codegen.com/runs

# CircleCI pipelines
https://app.circleci.com/pipelines/github/{org}/{repo}

# CircleCI webhooks
https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks

# Integration status
https://codegen.com/settings/integrations/circleci
```

---

## 🐛 Troubleshooting Quick Fixes

### No auto-fix triggered

```bash
# Check webhook
Visit: https://app.circleci.com/settings/project/github/{org}/{repo}/webhooks
Verify: URL = https://api.codegen.com/webhooks/circleci
Test: Click "Test Webhook" → Expect 200 OK

# Check integration
Visit: https://codegen.com/settings/integrations/circleci
Verify: Status = Connected ✅
```

### Fix failed

```bash
# Check agent run
Visit: https://codegen.com/runs
Find: Recent run for your repo
Review: Error logs and attempted fixes

# Common issues:
- Low confidence (< 0.7) → Lower threshold
- Complex error → Manual fix needed
- Permissions → Check GitHub App permissions
```

### High costs

```yaml
# Reduce costs:
1. Increase confidence threshold: 0.8
2. Reduce max_attempts: 2
3. Limit fix_types: [lint_errors, type_errors]
4. Set lower budget: max_cost_per_run: 50
```

---

## 📚 Key URLs

```yaml
Setup:
  - GitHub App: https://github.com/apps/codegen-sh
  - CircleCI Projects: https://app.circleci.com/projects
  - Codegen Integrations: https://codegen.com/settings/integrations

Monitoring:
  - Codegen Runs: https://codegen.com/runs
  - CircleCI Pipelines: https://app.circleci.com/pipelines
  - CircleCI Insights: https://app.circleci.com/insights

Tokens:
  - CircleCI Token: https://app.circleci.com/settings/user/tokens
  - Codegen Token: https://codegen.com/settings

Documentation:
  - Full Study: docs/CIRCLECI-INTEGRATION-STUDY.md
  - Setup Guide: docs/CIRCLECI-SETUP.md
  - API Guide: docs/CIRCLECI-API-SETUP.md
```

---

## ⚡ Performance Metrics

```yaml
Before Codegen:
  Success rate: 65-70%
  MTTR:         2-4 hours
  Failed PRs:   15-20%

After Codegen:
  Success rate: 90-95%     (+30%)
  MTTR:         5-15 min   (-85%)
  Failed PRs:   2-5%       (-75%)
```

---

## 🎯 Best Practices Summary

```yaml
1. Start simple:
   - Enable basic auto-fix
   - Test with easy failures
   - Gradually add more fix types

2. Monitor closely:
   - Check success rate weekly
   - Review failed runs
   - Adjust thresholds as needed

3. Control costs:
   - Set budget limits
   - Monitor daily spend
   - Optimize fix types

4. Maintain quality:
   - Keep separate_commits: true
   - Review auto-fixes
   - Document patterns in CLAUDE.md
```

---

## 🔐 Security & Permissions

```yaml
CircleCI (Read-Only):
  ✅ Read project info
  ✅ View build logs
  ✅ Read test results
  ✅ Access artifacts
  ❌ Cannot trigger builds
  ❌ Cannot modify CI config

GitHub (via App):
  ✅ Read code
  ✅ Write pull requests
  ✅ Write issues
  ✅ Write checks
  ❌ Cannot merge PRs
  ❌ Cannot delete branches
```

---

## 📞 Support

```yaml
Issues:
  - GitHub Issues: https://github.com/evgenygurin/claude-code-connect/issues
  - Codegen Support: support@codegen.com
  - CircleCI Support: https://support.circleci.com

Documentation:
  - Codegen Docs: https://docs.codegen.com
  - CircleCI Docs: https://circleci.com/docs
  - Full Study: docs/CIRCLECI-INTEGRATION-STUDY.md
```

---

**Last Updated**: 2025-01-04 | **Version**: 1.0 | **Status**: Production Ready
