# CosmeticLens Historical Bug Report

All bugs reported since project start, in **chronological order** (oldest first).  
Status: **Fixed** | **Open**

---

## 1. Gemini API did not work; model fallback issues

**Status:** Fixed  
**Reported:** Early project

**Issue:**
- Gemini API did not work
- Switched to OpenAI API
- Model `gpt-4o-mini` (5o mini) did not work
- Switched to `gpt-4o-mini` (4o mini) and added model fallback

**Fix:** Switched to OpenAI API with 4o mini and model fallback logic.

---

## 2. OBF lookup failure showed error instead of fallback

**Status:** Fixed  
**Reported:** Early project

**Issue:**
- When Open Beauty Facts (OBF) did not have the product, the app showed an error

**Expected behavior:**
- Fall back to LLM knowledge mode
- Send product name to the LLM and ask: "The user is asking about [PRODUCT NAME]. Based on your knowledge of this product's typical ingredients and formulation, provide an analysis. If you're not certain about the exact ingredients, clearly state this and provide general information about what this type of product typically contains."

**Fix:** Implemented LLM knowledge fallback when OBF lookup fails.

---

## 3. Chinese prompts inaccurate; unexpected responses

**Status:** Fixed  
**Reported:** Early project

**Issue:**
- Chinese prompts were written inaccurately, leading to unexpected LLM responses

**Fix:**
- System prompt rewritten with strict zh instructions: all section headers, table headers, and verdict labels must be Chinese
- Added writing style guidance (conversational, skincare-native terms like 成分党, 早C晚A, etc.)
- `translations-reference.json` created with standardized Chinese terms for sections, tables, verdicts, skin types, and common terms
- `prompt.ts` updated to append the Chinese terminology reference JSON when `language === 'zh'`, plus reinforcement instructions in both Mode A and Mode B user messages

---

## 4. Forgot password, sign up/login visibility, display name, sidebar guest label

**Status:** Fixed  
**Reported:** Mid project

**Issues:**
1. **Forgot password** — Did not direct user to reset password via email; instead cleared the form
2. **Sidebar showed "Guest"** — When logged in, bottom of chat sidebar still showed "Guest" instead of user name
3. **Display name at signup** — Users needed to enter a display name when registering
4. **Sign up / Log in buttons** — Should disappear when user is logged in; only visible when not logged in

**Fix:**
1. **Forgot Password (LoginForm.jsx):** Replaced page-reload with in-component `showReset` state. "Forgot password?" switches to reset view with email field and "Send Reset Link" button. Calls `resetPassword(email)` from useAuth (Supabase `resetPasswordForEmail`). On success, shows "Check your email for reset instructions." "Back to login" returns to normal form.
2. **Display name at signup (SignupForm.jsx, useAuth.jsx):** Added `display_name` and `display_name_placeholder` i18n keys. Added "Display Name" input above email. `useAuth.signUp` accepts `displayName` and forwards to Supabase as `options.data.display_name`.
3. **Chat sidebar (ChatInterface.jsx):** Import useAuth, derive display name from `user.user_metadata.display_name` (fallback to email prefix), pass `user={{ name: displayName }}` to ChatSidebar.
4. **Nav buttons (Navigation.astro):** Updated `updateAuthUI()` to add/remove `md:flex` based on session; auth buttons hidden when logged in.

---

## 5. Follow-up questions re-output full analysis; no conversation context

**Status:** Fixed  
**Reported:** Mid project

**Issue:**
- After analyzing CeraVe cleanser, asking "what sensitive ingredients may the previous item contain to pregnant person" caused the assistant to re-output the same full analysis
- ChatInterface sent the follow-up to `/api/analyze` as `productName: "what sensitive ingredients..."` — single message with zero context
- OBF lookup failed, fell back to LLM knowledge mode; LLM had no idea user had asked about CeraVe before

**Root cause:** Single-message flow; no multi-turn conversation history sent to the LLM.

**Fix:** Solved with multi-turn chat and RAG — full message array sent to OpenAI, conversation history preserved.

---

## 6. Supabase SQL schema not idempotent; policy already exists

**Status:** Fixed  
**Reported:** Mid project

**Issue:**
- Running the full SQL schema in Supabase SQL editor gave: `ERROR: 42710: policy "Users can view own profile" for table "profiles" already exists`
- Error occurs when re-running the full schema; `CREATE POLICY` fails if the policy already exists

**Fix:** Schema updated to be idempotent: drop policies (and the trigger) before recreating them.

---

## 7. extractProductFromDupeRequest trim on undefined

**Status:** Fixed  
**Reported:** Recent

**Issue:**
- `TypeError: Cannot read properties of undefined (reading 'trim')` at `extractProductFromDupeRequest` in `prompt.ts`
- Called from `chat.ts` when `userText` or regex captures could be undefined

**Fix:** Added null/undefined guards in `extractProductFromDupeRequest` and `looksLikeDupeRequest`; validate `lastUserMsg.content` in chat API before use.

---

## 8–15. Current open bugs (Feb 2025)

**Status:** Open  
**Reported:** Recent testing session

These are documented in [docs/BUGS.md](BUGS.md). Summary:

| # | Description |
|---|-------------|
| 8 | Chat input disabled during assistant response; no stop button |
| 9 | "Find similar products" shown for knowledge questions |
| 10 | "Find similar products" on knowledge answer triggers product analysis (resolved if #9 fixed) |
| 11 | Dupe request produces full product analysis first, then dupes |
| 12 | "Find similar products" button creates awkward follow-up phrasing |
| 13 | Language switch causes page refresh and chat state loss |
| 14 | Chat title is raw first question; long questions produce poor titles — use OpenAI to re-interpret as precise, concise title |
| 15 | Dull waiting experience; no "thinking" indicator |

---

## Legend

- **Fixed** — Resolved and deployed
- **Open** — Not yet fixed; see [BUGS.md](BUGS.md) for details
