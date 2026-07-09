import { describe, expect, it } from 'vitest';
import { normalizeMathDelimiters, rehypeEmojiIcons } from '../src/components/chat/markdown-icons';

describe('normalizeMathDelimiters (LLM math-dialect normalizer)', () => {
  it('converts \\( ... \\) to inline $$ math', () => {
    expect(normalizeMathDelimiters('where \\( C_1 \\) is the concentration')).toBe(
      'where $$C_1$$ is the concentration',
    );
  });

  it('converts \\[ ... \\] to display blocks', () => {
    const out = normalizeMathDelimiters('\\[ pH = -\\log_{10}[H^+] \\]');
    expect(out).toContain('\n$$\npH = -\\log_{10}[H^+]\n$$\n');
  });

  it('upgrades lone-line $$...$$ to display blocks', () => {
    const out = normalizeMathDelimiters('Formula:\n$$C_f = 0.05$$\nDone.');
    expect(out).toContain('$$\nC_f = 0.05\n$$');
  });

  it('leaves inline $$..$$ within a sentence inline', () => {
    const input = 'the value $$x$$ appears mid-sentence';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it('never touches prices', () => {
    const input = 'Dupes cost $15 and $30 each.';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it('passes unmatched delimiters through (mid-stream safety)', () => {
    const input = 'partial \\( C_1 still streaming';
    expect(normalizeMathDelimiters(input)).toBe(input);
  });
});

describe('rehypeEmojiIcons (hast transform)', () => {
  const run = (tree: any) => {
    rehypeEmojiIcons()(tree);
    return tree;
  };

  const textNode = (value: string) => ({ type: 'text', value });
  const el = (tagName: string, children: any[]) => ({ type: 'element', tagName, properties: {}, children });

  it('replaces known emoji with emoji-icon elements', () => {
    const tree = { type: 'root', children: [el('p', [textNode('done ✅ ok')])] };
    run(tree);
    const p = tree.children[0];
    const kinds = p.children.map((c: any) => c.type === 'element' ? `${c.tagName}:${c.properties.icon}` : c.value);
    expect(kinds).toEqual(['done ', 'emoji-icon:check', ' ok']);
  });

  it('handles variation selectors (⚠️ = U+26A0 U+FE0F)', () => {
    const tree = { type: 'root', children: [el('p', [textNode('careful ⚠️ here')])] };
    run(tree);
    const icons = tree.children[0].children.filter((c: any) => c.type === 'element');
    expect(icons).toHaveLength(1);
    expect(icons[0].properties.icon).toBe('warning');
  });

  it('leaves unknown emoji untouched', () => {
    const tree = { type: 'root', children: [el('p', [textNode('fruit 🍊 stays')])] };
    run(tree);
    expect(tree.children[0].children).toEqual([textNode('fruit 🍊 stays')]);
  });

  it('never rewrites inside code blocks', () => {
    const tree = { type: 'root', children: [el('pre', [el('code', [textNode('✅ literal')])])] };
    run(tree);
    expect(tree.children[0].children[0].children).toEqual([textNode('✅ literal')]);
  });
});
