# Gemini API Setup Walkthrough

> **Not followed in this project.** The walkthrough below saves the key into an agent's settings file. Here a key goes into the project's `.env`, added by the person, and nowhere else. Kept as received for whoever runs the skill outside the app; the model names and prices in it are as received and are not kept current.

Use this when the user opts into video analysis during onboarding Phase 1 (SKILL.md) and you detected no `GEMINI_API_KEY` in their environment.

The goal: get the user a free Google AI Studio key, save it to `~/.claude/settings.json` so it persists across every future Claude Code session and skill, and confirm a test call works. From this point on, this skill (and any other Gemini-using skill) just works.

---

## Step 1: Explain What's Happening

Say to the user, verbatim or close to it:

> "Quick one-time setup. Google AI Studio gives free Gemini API access (15 requests per minute, generous daily limits, no credit card needed for the starter tier). I'll walk you through getting a key, then bake it into your Claude Code config so you never have to do this again. Takes ~2 minutes."

---

## Step 2: Walk the User Through Key Creation

Tell them, one step at a time. Wait for each confirmation before moving on. Don't dump the whole list.

1. Open https://aistudio.google.com/apikey in your browser.
2. Sign in with your Google account (any Gmail or Workspace account works).
3. Click the blue **"Create API key"** button at the top right.
4. If prompted to "Create API key in new project", click that. Otherwise pick an existing project.
5. Wait ~5 seconds for the key to generate.
6. Click the copy icon next to the key. It starts with `AIza...` and is about 40 characters.
7. Paste it back here. I'll save it for you.

---

## Step 3: Save the Key to Claude Settings

When the user pastes the key, validate the shape first:

```bash
echo "[PASTED_KEY]" | grep -E "^AIza[A-Za-z0-9_-]{35}$"
```

If it doesn't match, ask them to re-copy and paste. Don't proceed with an invalid key.

Once validated, merge into `~/.claude/settings.json` under the top-level `env` block. **Do not clobber the file.** Read first, merge, write back.

### How to merge

1. Read the existing file:
   ```bash
   cat ~/.claude/settings.json 2>/dev/null || echo "{}"
   ```

2. Use `jq` to merge:
   ```bash
   tmp=$(mktemp) && jq --arg key "[PASTED_KEY]" '.env.GEMINI_API_KEY = $key' ~/.claude/settings.json > "$tmp" && mv "$tmp" ~/.claude/settings.json
   ```

   If the file doesn't exist yet, create it first:
   ```bash
   [ -f ~/.claude/settings.json ] || echo '{}' > ~/.claude/settings.json
   ```

3. Verify the write:
   ```bash
   jq '.env.GEMINI_API_KEY' ~/.claude/settings.json
   ```
   Should print the key in quotes.

### What this does

Claude Code reads `~/.claude/settings.json` on startup and exports the `env` block as environment variables for every session. After this write, `$GEMINI_API_KEY` is available to every future skill and every shell command Claude runs, without the user touching anything.

---

## Step 4: Test the Key

Run a minimal Gemini call to confirm the key works:

```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Reply with just the word: ok"}]}]}' \
  | jq -r '.candidates[0].content.parts[0].text // .error.message'
```

Expected output: `ok`

If the response is an error message ("API key not valid", quota issues, etc.), surface it to the user and have them re-copy the key.

**Important:** The user's current shell session may not have `$GEMINI_API_KEY` set yet (the settings.json env is read on Claude Code startup, not retroactively). For the test call, source it from the file directly:

```bash
export GEMINI_API_KEY=$(jq -r '.env.GEMINI_API_KEY' ~/.claude/settings.json)
```

Then run the curl test.

---

## Step 5: Confirm to User and Continue

Tell them:

> "Key saved to `~/.claude/settings.json`. From now on, this skill and any other Gemini-using skill (like the gemini-api-dev one) will use it automatically. You won't see this setup flow again. Continuing the Foreplay run now."

Then resume onboarding at Phase 2 (brand identification) in SKILL.md.

---

## Step 6 (Optional): If User Already Had the Key in a Different Spot

Some users have `GEMINI_API_KEY` in `~/.zshrc`, `~/.bashrc`, or a project `.env` file. That's fine but it's session-scoped and easy to miss.

If the user mentions this, offer to **also** save it to `~/.claude/settings.json` so it works from Claude Code regardless of which shell config loaded:

> "I noticed you might have a key in your shell config already. Want me to also copy it to `~/.claude/settings.json` so it works inside Claude Code consistently? (Recommended.)"

If yes, run:
```bash
KEY=$(zsh -c 'source ~/.zshrc 2>/dev/null; echo $GEMINI_API_KEY')
# or
KEY=$(bash -c 'source ~/.bashrc 2>/dev/null; echo $GEMINI_API_KEY')
```

Then merge into settings.json with the same `jq` pattern as Step 3.

---

## Failure Modes

**"I can't see the Create API key button."**
The user's Google account may not have AI Studio access yet (rare). Have them check `https://aistudio.google.com` is accessible and they're signed in.

**"API key not valid" on test call.**
Wait 30 seconds and retry; Google AI Studio sometimes takes a moment to propagate new keys.

**"You exceeded your current quota."**
The user pasted an old key that's been throttled. Have them create a new one.

**Key validates but the test call returns 403.**
The key may be project-restricted. Tell the user to go back to AI Studio and check "Restrict key" is not set, or create an unrestricted new key.

---

## Model Selection Notes

This skill uses `gemini-2.5-flash` by default. It's the right balance of cost ($0.075 / 1M input tokens, $0.30 / 1M output) and quality for video analysis. The free tier (15 RPM, 1500 RPD) comfortably covers typical runs (up to ~30 ads analyzed).

For large runs analyzing 30+ videos, the user may hit free-tier daily limits. If that happens, surface:

> "You hit Gemini's free-tier daily limit. Either wait 24 hours, or enable billing on your AI Studio project (free $200 starter credit available for first-time users). Want me to fall back to keyframe-only analysis to finish this run?"

For higher-quality analysis on critical runs, swap to `gemini-2.5-pro`. Cost is ~5x higher. Only suggest this if the user explicitly asks for top quality.
