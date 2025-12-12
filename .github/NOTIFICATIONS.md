# Telegram Notification Setup Guide

This guide explains how to set up Telegram notifications for your CI/CD pipeline.

## Overview

The CI pipeline sends notifications to Telegram after every run, including:
- ✅/❌ Build status (success/failure)
- Repository, branch, and commit information
- Author name
- Individual job results (Lint, Test, Build)
- Direct link to view details

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat and send `/newbot`
3. Follow the prompts to:
   - Choose a name for your bot (e.g., "CI Notifications")
   - Choose a username (must end in `bot`, e.g., `my_ci_notify_bot`)
4. BotFather will give you a **token** like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
5. Save this token - this is your `TG_TOKEN`

### 2. Get Your Chat ID

#### Option A: Personal Chat
1. Start a chat with your new bot (search for it and click "Start")
2. Send any message to the bot
3. Open this URL in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. Look for `"chat":{"id":123456789}` - that number is your `TG_CHAT_ID`

#### Option B: Group Chat
1. Add your bot to a group
2. Send a message in the group
3. Use the same `getUpdates` URL above
4. The chat ID for groups is negative (e.g., `-123456789`)

#### Option C: Channel
1. Add your bot as an admin to your channel
2. The chat ID is `@channelname` or the numeric ID

### 3. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - Name: `TG_TOKEN`
   - Value: Your bot token from BotFather
5. Click **Add secret**
6. Repeat for:
   - Name: `TG_CHAT_ID`
   - Value: Your chat ID

## Testing

After setup, push a commit or create a PR. You should receive a Telegram message like:

```
✅ CI Pipeline success

Repository: badnails/cuet-moh-main
Branch: main
Commit: abc123def
Author: username

Results:
Lint: success
Test: success
Build: success

View Details
```

## Troubleshooting

### No notification received?

1. **Check bot token**: Verify `TG_TOKEN` is correct in GitHub Secrets
2. **Check chat ID**: Verify `TG_CHAT_ID` is correct (including `-` for groups)
3. **Bot permissions**: Ensure the bot can send messages to the chat/group/channel
4. **View Actions logs**: Check the "Send Telegram notification" step for errors

### Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid bot token | Regenerate token with BotFather |
| `400 Bad Request: chat not found` | Wrong chat ID | Verify chat ID using `getUpdates` |
| `403 Forbidden` | Bot blocked or not in group | Add bot to group/unblock it |

### Bot not responding to getUpdates?

Make sure you've sent a message to the bot AFTER creating it. The `getUpdates` API only shows recent messages.

## Customization

To customize the notification message, edit the Telegram step in `.github/workflows/ci.yml`:

```yaml
- name: Send Telegram notification
  env:
    TG_TOKEN: ${{ secrets.TG_TOKEN }}
    TG_CHAT_ID: ${{ secrets.TG_CHAT_ID }}
  run: |
    MESSAGE="Your custom message here"
    
    curl -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -H 'Content-Type: application/json' \
      -d "{
        \"chat_id\": \"${TG_CHAT_ID}\",
        \"text\": \"${MESSAGE}\",
        \"parse_mode\": \"Markdown\",
        \"disable_web_page_preview\": true
      }"
```

### Supported formatting

Telegram supports Markdown:
- `*bold*` → **bold**
- `_italic_` → _italic_
- `` `code` `` → `code`
- `[link](url)` → [link](url)

## Security Notes

- Never commit your bot token directly to code
- Use GitHub Secrets for all sensitive values
- Consider creating a dedicated bot for CI notifications
- Regularly rotate bot tokens if compromised

## References

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
