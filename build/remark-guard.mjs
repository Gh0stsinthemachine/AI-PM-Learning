// Remark plugin that keeps round files (MDX) safe to author in parallel.
// It fails the build on anything that MDX would otherwise accept silently:
//   - lowercase JSX tags (a stray `<example>` becomes a bogus HTML element)
//   - components outside the allowlist
//   - `{...}` expressions in prose or attributes
//   - import / export statements
//   - attribute values that are not plain string literals
import { visit } from 'unist-util-visit';

export function remarkGuard(options = {}) {
  const allowed = new Set(options.allowed ?? []);
  return (tree, file) => {
    const fail = (node, message) => {
      const line = node.position?.start?.line ?? '?';
      throw new Error(`${file.path ?? 'mdx'}:${line} ${message}`);
    };
    visit(tree, (node) => {
      switch (node.type) {
        case 'mdxjsEsm':
          fail(node, 'import/export is not allowed in a round. Use the allowed components only.');
          break;
        case 'mdxFlowExpression':
        case 'mdxTextExpression':
          fail(node, 'a {…} expression is not allowed. Put {placeholders} inside backticks.');
          break;
        case 'mdxJsxFlowElement':
        case 'mdxJsxTextElement': {
          if (!node.name) fail(node, 'fragments are not allowed.');
          if (!allowed.has(node.name)) {
            fail(node, `<${node.name}> is not an allowed component. Allowed: ${[...allowed].join(', ')}. Put XML tags in backticks.`);
          }
          for (const attr of node.attributes ?? []) {
            if (attr.type !== 'mdxJsxAttribute') fail(node, 'spread attributes are not allowed.');
            if (attr.value !== null && typeof attr.value !== 'string') {
              fail(node, `attribute "${attr.name}" must be a plain string, not an expression.`);
            }
          }
          break;
        }
        default:
      }
    });
  };
}
