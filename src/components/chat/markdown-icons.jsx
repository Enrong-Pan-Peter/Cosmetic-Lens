/**
 * Emoji → Phosphor icon rendering for assistant markdown.
 *
 * The model writes ordinary emoji (natural for LLMs); the renderer swaps
 * every known emoji for the matching monochrome Phosphor line icon so the
 * output matches the site's design language. Unknown emoji pass through
 * unchanged, and emoji inside code blocks stay literal.
 *
 * Used by AnalysisDisplay: `rehypePlugins={[rehypeEmojiIcons]}` +
 * `components={{ 'emoji-icon': EmojiIcon }}`.
 */
import {
  CheckCircle,
  Warning,
  XCircle,
  Question,
  Prohibit,
  Star,
  Sparkle,
  Lightbulb,
  Drop,
  Microscope,
  BookOpen,
  ShieldCheck,
  Sun,
  Info,
  Robot,
  Flask,
  MagnifyingGlass,
} from '@phosphor-icons/react';

// Map WITHOUT variation selectors (U+FE0F is stripped before lookup).
const EMOJI_TO_ICON = {
  '✅': 'check',
  '✔': 'check',
  '⚠': 'warning',
  '❌': 'x',
  '❓': 'question',
  '🚫': 'prohibit',
  '⛔': 'prohibit',
  '⭐': 'star',
  '🌟': 'star',
  '✨': 'sparkle',
  '💡': 'lightbulb',
  '💧': 'drop',
  '🧴': 'drop',
  '🔬': 'microscope',
  '📖': 'book',
  '📚': 'book',
  '🛡': 'shield',
  '☀': 'sun',
  'ℹ': 'info',
  '🤖': 'robot',
  '🧪': 'flask',
  '🔍': 'search',
};

const ICON_COMPONENTS = {
  check: CheckCircle,
  warning: Warning,
  x: XCircle,
  question: Question,
  prohibit: Prohibit,
  star: Star,
  sparkle: Sparkle,
  lightbulb: Lightbulb,
  drop: Drop,
  microscope: Microscope,
  book: BookOpen,
  shield: ShieldCheck,
  sun: Sun,
  info: Info,
  robot: Robot,
  flask: Flask,
  search: MagnifyingGlass,
};

// Longest-first alternation; optional variation selector after each.
const EMOJI_RE = new RegExp(
  `(${Object.keys(EMOJI_TO_ICON)
    .sort((a, b) => b.length - a.length)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})\\uFE0F?`,
  'g',
);

/** Rehype plugin: replace known emoji in text nodes with <emoji-icon> elements. */
export function rehypeEmojiIcons() {
  return (tree) => {
    walk(tree);
  };
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  // Leave code literal.
  if (node.type === 'element' && (node.tagName === 'code' || node.tagName === 'pre')) return;

  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      EMOJI_RE.lastIndex = 0;
      if (!EMOJI_RE.test(child.value)) {
        next.push(child);
        continue;
      }
      EMOJI_RE.lastIndex = 0;
      let last = 0;
      let m;
      while ((m = EMOJI_RE.exec(child.value)) !== null) {
        if (m.index > last) {
          next.push({ type: 'text', value: child.value.slice(last, m.index) });
        }
        const icon = EMOJI_TO_ICON[m[1]];
        next.push({
          type: 'element',
          tagName: 'emoji-icon',
          properties: { icon },
          children: [],
        });
        last = m.index + m[0].length;
      }
      if (last < child.value.length) {
        next.push({ type: 'text', value: child.value.slice(last) });
      }
    } else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

/**
 * Normalize the math delimiter styles LLMs actually emit into the two forms
 * remark-math (singleDollarTextMath: false) understands:
 *
 *   \( x \)            → $$x$$            (inline)
 *   \[ x \]            → $$\n x \n$$      (display block)
 *   $$x$$ alone on line → $$\n x \n$$     (upgrade to centered display)
 *
 * Without this, ChatGPT-style output renders raw "( C_1 )" text and
 * left-aligned formulas. Unmatched delimiters (mid-stream) pass through.
 */
export function normalizeMathDelimiters(content) {
  if (!content || (!content.includes('\\(') && !content.includes('\\[') && !content.includes('$$'))) {
    return content;
  }
  let out = content;
  // \[ ... \] → display block
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `\n\n$$\n${expr.trim()}\n$$\n\n`);
  // \( ... \) → inline math
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$$${expr.trim()}$$`);
  // A $$...$$ standing alone on its own line was meant as display math.
  out = out.replace(/^[ \t]*\$\$([^$\n]+?)\$\$[ \t]*$/gm, (_, expr) => `$$\n${expr.trim()}\n$$`);
  return out;
}

/** React renderer for the <emoji-icon> elements the plugin produces. */
export function EmojiIcon({ icon }) {
  const Icon = ICON_COMPONENTS[icon];
  if (!Icon) return null;
  return (
    <Icon
      size="1em"
      weight="regular"
      aria-hidden="true"
      className="inline-block align-[-0.125em] mx-0.5"
    />
  );
}
