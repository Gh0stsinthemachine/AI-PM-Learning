export function escapeInlineScript(js: string): string;
export function escapeInlineStyle(css: string): string;
export function buildFragment(input: { js: string; css: string }): string;
export function buildWebDocument(input: { js: string; css: string }): string;
export function checkFragment(html: string, js: string): { problems: string[]; size: number; warn: boolean };
