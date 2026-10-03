import { describe, it, expect } from 'vitest';
import { classifySampleError, partialText, KNOWN_CODES } from '../../src/runtime/sampleErrors';

describe('sample error copy', () => {
  it('every documented code maps to copy', () => {
    for (const code of KNOWN_CODES) {
      const c = classifySampleError({ code, message: 'x' });
      expect(c.copy.length).toBeGreaterThan(3);
      expect(['silent', 'hide', 'tools', 'tell', 'bug']).toContain(c.kind);
    }
  });
  it('hides live controls for permanent refusals', () => {
    for (const code of ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']) {
      expect(classifySampleError({ code }).kind).toBe('hide');
    }
  });
  it('Stop is silent and the agent has its own kind', () => {
    expect(classifySampleError({ code: 'cancelled' }).kind).toBe('silent');
    expect(classifySampleError({ code: 'tools_unavailable' }).kind).toBe('tools');
  });
  it('unknown codes and non-objects are treated as upstream errors', () => {
    expect(classifySampleError({ code: 'brand_new' }).code).toBe('brand_new');
    expect(classifySampleError({ code: 'brand_new' }).kind).toBe('tell');
    expect(classifySampleError(null).kind).toBe('tell');
    expect(classifySampleError('boom').kind).toBe('tell');
  });
  it('page bugs name their code', () => {
    expect(classifySampleError({ code: 'invalid_request' }).copy).toContain('invalid_request');
  });
  it('plain English: no code names in viewer copy except bugs', () => {
    for (const code of KNOWN_CODES) {
      const c = classifySampleError({ code });
      if (c.kind !== 'bug') expect(c.copy).not.toMatch(/_/);
    }
  });
  it('extracts partial text', () => {
    expect(partialText({ code: 'x', text: 'half' })).toBe('half');
    expect(partialText({})).toBe('');
  });
});
