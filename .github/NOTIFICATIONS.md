# Notification Setup Guide

This guide explains how to set up Slack and Discord notifications for your CI/CD pipeline.

## Slack Notifications

### 1. Create Slack Webhook

1. Go to your Slack workspace
2. Navigate to: **Apps** → **Incoming WebHooks**
3. Click **Add to Slack**
4. Select the channel where notifications should be posted
5. Click **Add Incoming WebHooks Integration**
6. Copy the **Webhook URL** (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### 2. Add to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste your Slack webhook URL
6. Click **Add secret**

### 3. Enable Notifications

1. In the same settings page, go to **Variables** tab
2. Click **New repository variable**
3. Name: `SLACK_WEBHOOK_ENABLED`
4. Value: `true`
5. Click **Add variable**

### Notification Format

Slack notifications will include:
- ✅/❌ Status emoji
- Branch and commit information
- Author name
- Individual job results in a table
- Timestamp

## Discord Notifications

### 1. Create Discord Webhook

1. Go to your Discord server
2. Select the channel where notifications should appear
3. Click the **gear icon** (Edit Channel)
4. Navigate to **Integrations** → **Webhooks**
5. Click **New Webhook**
6. Give it a name (e.g., "CI/CD Bot")
7. Optionally set an avatar
8. Click **Copy Webhook URL** (looks like: `https://discord.com/api/webhooks/...`)

### 2. Add to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste your Discord webhook URL
6. Click **Add secret**

### 3. Enable Notifications

1. In the same settings page, go to **Variables** tab
2. Click **New repository variable**
3. Name: `DISCORD_WEBHOOK_ENABLED`
4. Value: `true`
5. Click **Add variable**

### Notification Format

Discord notifications will include:
- ✅/❌ Status emoji in title
- Rich embed with colored border (green for success, red for failure)
- Branch and commit information
- Author name
- Individual job results as inline fields
- Timestamp

## Testing Notifications

After setting up, push a commit or create a pull request to trigger the CI pipeline. You should see notifications appear in your configured Slack channel or Discord server.

### Troubleshooting

**No notifications appearing?**

1. Verify webhook URLs are correct in GitHub Secrets
2. Check that enable variables are set to `true`
3. Ensure your webhook URLs have proper permissions
4. Check the Actions logs for any error messages in the "Send Slack/Discord notification" steps

**Notifications appear but are malformed?**

1. Ensure you're using the latest version of the workflow
2. Check that your webhook URL is valid and not expired
3. For Slack: Verify the app has permission to post in the channel
4. For Discord: Verify the webhook hasn't been deleted

## Disabling Notifications

To temporarily disable notifications without removing secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions** → **Variables**
2. Edit `SLACK_WEBHOOK_ENABLED` or `DISCORD_WEBHOOK_ENABLED`
3. Change value to `false`
4. Click **Update variable**

## Advanced Customization

To customize notification content, edit the notification steps in `.github/workflows/ci.yml`:

```yaml
- name: Send Slack notification
  if: vars.SLACK_WEBHOOK_ENABLED == 'true'
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  run: |
    # Modify the JSON payload here
    curl -X POST $SLACK_WEBHOOK_URL ...
```

You can customize:
- Message text and formatting
- Colors for different statuses
- Additional fields
- Emoji usage
- Attachment format

### Slack Message Builder
Use [Slack's Block Kit Builder](https://app.slack.com/block-kit-builder) to design custom messages.

### Discord Embed Builder
Use [Discord's Embed Visualizer](https://leovoel.github.io/embed-visualizer/) to design custom embeds.

## Security Notes

- Never commit webhook URLs directly to your code
- Always use GitHub Secrets for sensitive URLs
- Regularly rotate webhook URLs if they may have been exposed
- Use repository-specific webhooks, not personal ones
- Consider setting up webhook secret verification for additional security

## Multiple Channels

To send notifications to multiple channels:

1. Create additional webhook URLs
2. Add them as separate secrets (`SLACK_WEBHOOK_URL_2`, etc.)
3. Duplicate the notification step in the workflow with different webhook URLs

## Example Notifications

### Successful Build (Slack)
```
✅ CI Pipeline success
Branch: `main`
Commit: `abc123def`
Author: @username

┌──────┬─────────┐
│ Lint │ success │
│ Test │ success │
│ Build│ success │
└──────┴─────────┘
```

### Failed Build (Discord)
```
❌ CI Pipeline failure

Branch: `feature/new-api`
Commit: `xyz789abc`
Author: username

Lint: success
Test: failure
Build: skipped

[Click here to view details]
```

## References

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks](https://discord.com/developers/docs/resources/webhook)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
