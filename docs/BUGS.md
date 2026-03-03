# CosmeticLens Bug Report

Bugs reported during testing. Ordered by severity and dependency.

---

## Bug 1: Chat input disabled during assistant response; no stop button

**Severity:** Medium  
**Components:** [src/components/chat/ProductInput.jsx](src/components/chat/ProductInput.jsx), [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx)

**Current behavior:**
- While the assistant is generating a response (`isLoading === true`), the textarea is disabled (`disabled={isLoading}`)
- The submit button shows a spinner and is disabled
- User cannot type or queue a follow-up message

**Expected behavior:**
- User should be able to type in the chatbox even while the assistant is working
- A stop button should appear at the rightmost part of the chatbox line to cancel the current response

**Root cause:** ProductInput receives `isLoading` and disables the textarea and submit button. The submit button is repurposed as a loading spinner instead of offering a separate stop control. The `fetch` call has no AbortController for cancellation.

---

## Bug 2: "Find similar products" shown for knowledge questions

**Severity:** Medium  
**Components:** [src/components/chat/AnalysisDisplay.jsx](src/components/chat/AnalysisDisplay.jsx), [src/components/chat/ChatMessage.jsx](src/components/chat/ChatMessage.jsx)

**Current behavior:**
- When user asks a knowledge question (e.g., "Is retinol safe during pregnancy?"), the assistant correctly answers using knowledge
- A "Find similar products" button appears under the answer, which is inappropriate for this type of question

**Expected behavior:**
- "Find similar products" should only appear when the user asked about a **product** (product analysis or dupe request)
- For **knowledge** questions (ingredient safety, effects, etc.), show instead: "Common ingredients with similar effects" — a list of 5–10 similar ingredients in a markdown table

**Root cause:** AnalysisDisplay shows the button when `productName && !dupes?.length && onFindDupes`. `productName` is `prevUserContent` (the previous user message). Any user message is treated as a potential product name.

---

## Bug 3: "Find similar products" on knowledge answer triggers product analysis

**Severity:** Low (dependent on Bug 2)  
**Components:** [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx), [src/pages/api/chat.ts](src/pages/api/chat.ts)

**Current behavior:**
- When user clicks "Find similar products" under the answer to "Is retinol safe during pregnancy?", the assistant interprets it as a request to analyze a product (e.g., "Retinol 1.0 by Obagi") and returns product analysis instead of dupe suggestions

**Expected behavior:**
- N/A if Bug 2 is fixed — the button would not appear for knowledge questions

**Note:** If Bug 2 is fixed (i.e., "Find similar products" is only shown for product-related answers), this bug will not be reachable. No separate fix needed unless Bug 2 fix is deferred.

---

## Bug 4: Dupe request produces full product analysis first, then dupes

**Severity:** Medium  
**Components:** [src/pages/api/chat.ts](src/pages/api/chat.ts), [src/data/system-prompt.md](src/data/system-prompt.md)

**Current behavior:**
- When user asks "Find me a dupe for La Mer cream", the assistant first performs a full product analysis, then offers dupes at the end of the response

**Expected behavior:**
- When dupe intent is detected, respond directly with dupe suggestions
- Include a short explanation of the important ingredients that work and which dupe products share those ingredients
- Skip the full product analysis format; focus on dupes + shared-ingredient rationale

**Root cause:** The API runs `findDupes` and injects results into RAG context, but the system prompt does not instruct the LLM to prioritize a dupe-focused response format. The LLM defaults to the standard product analysis output.

---

## Bug 5: "Find similar products" button creates awkward follow-up phrasing

**Severity:** Medium  
**Components:** [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx), [src/components/chat/ChatMessage.jsx](src/components/chat/ChatMessage.jsx)

**Current behavior:**
- When user clicks "Find similar products", the previous question is used as-is to construct the follow-up
- Example: previous question "Is retinol safe during pregnancy?" becomes "Find me a dupe for Is retinol safe during pregnancy?" — awkward and incorrect

**Expected behavior:**
- When user clicks follow-up buttons (e.g., "Find similar products"), rephrase the question to be natural
- For product context: "Find similar products for [product name]" — extract or infer the product name, not the full previous question
- Avoid pasting the raw previous message into a dupe query template

**Root cause:** `handleFindDupes(productName)` receives `prevUserContent` (the full previous user message) and constructs `Find me a dupe for ${productName}`. No extraction or rephrasing is applied.

---

## Bug 6: Language switch causes page refresh and chat state loss

**Severity:** Medium  
**Components:** [src/components/layout/LanguageSwitcher.jsx](src/components/layout/LanguageSwitcher.jsx), [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx)

**Current behavior:**
- Language switcher uses `<a href="...">` — full page navigation
- Two unwanted effects:
  1. If user was in a chat before switching language, they land on the "start new chat" empty state instead of staying in the previous chat
  2. When clicking a previous chat in the sidebar after the switch, the view shows the very beginning of that chat instead of staying at the latest response (scroll position resets)

**Expected behavior:**
- After language switch, preserve chat context: either stay in the current chat or restore it
- When opening a chat from the sidebar, scroll to the latest message (bottom) by default

**Root cause:** LanguageSwitcher navigates to `/{lang}{pathWithoutLang}` via full page load. Chat state (messages, activeChatId) lives in React state; `activeChatId` is null on fresh mount. Chat history is in localStorage but `activeChatId` is not persisted across navigation. Scroll position is not restored when selecting a chat.

---

## Bug 7: Chat title is raw first question; long questions produce poor titles

**Severity:** Medium  
**Components:** [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx)

**Current behavior:**
- Each chat name is the first 50 characters of the first user message
- Long first questions produce unwieldy or truncated titles (e.g., "What sensitive ingredients may the previous item contain to preg...")

**Expected behavior:**
- Title should be derived from the first question but re-interpreted to be precise and concise
- Use OpenAI API to summarize the first user message into a short, descriptive chat title (e.g., "CeraVe pregnancy safety" instead of the full question)

**Root cause:** `saveChat` in ChatInterface.jsx uses `msgs.find((m) => m.role === 'user')?.content?.slice(0, 50)` — raw truncation with no summarization.

---

## Bug 8: Dull waiting experience; no "thinking" indicator

**Severity:** Low  
**Components:** [src/components/chat/LoadingIndicator.jsx](src/components/chat/LoadingIndicator.jsx), [src/components/chat/ChatInterface.jsx](src/components/chat/ChatInterface.jsx), [src/pages/api/chat.ts](src/pages/api/chat.ts)

**Current behavior:**
- Response can take longer than desired
- Loading indicator shows bouncing dots but is not visually engaging
- No "thinking" line with jumping dots like ChatGPT and other popular LLM chats

**Expected behavior:**
- Add a "thinking" line with slightly jumping dots to show the model is working
- Explore ways to make responses faster (e.g., streaming, caching, API optimization)

**Root cause:** LoadingIndicator uses a simple bounce animation. Chat API uses a single blocking `fetch` call with no streaming. No performance optimizations are in place.

---

## Summary

| Bug | Severity | Description |
|-----|----------|-------------|
| 1 | Medium | Input disabled during response; no stop button |
| 2 | Medium | "Find similar products" shown for knowledge questions |
| 3 | Low | Misinterpreted product when clicking button (resolved if Bug 2 fixed) |
| 4 | Medium | Dupe request produces full analysis instead of direct dupe response |
| 5 | Medium | Awkward phrasing when using follow-up buttons |
| 6 | Medium | Language switch loses chat state and scroll position |
| 7 | Medium | Chat title is raw first question; should use LLM to make precise and concise |
| 8 | Low | Dull waiting experience; add thinking indicator and consider speed improvements |
