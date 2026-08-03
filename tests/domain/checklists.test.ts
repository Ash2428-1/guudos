import { describe, expect, it } from 'vitest';
import { evaluateFlag, isAnswered } from '@/domain/checklists/flags';
import { computeProgress } from '@/domain/checklists/status';
import { type ChecklistItemDef, type ResponseValue } from '@/lib/checklists';

const item = (over: Partial<ChecklistItemDef>): ChecklistItemDef => ({
  id: 'i1',
  position: 0,
  label: 'x',
  inputType: 'bool',
  required: true,
  flagWhenFalse: true,
  minValue: null,
  maxValue: null,
  ...over,
});

describe('evaluateFlag', () => {
  it('flags a bool answered "No" when flagWhenFalse', () => {
    expect(evaluateFlag(item({}), { valueBool: false })).toBe(true);
    expect(evaluateFlag(item({}), { valueBool: true })).toBe(false);
  });

  it('does not flag a bool when flagWhenFalse is off', () => {
    expect(evaluateFlag(item({ flagWhenFalse: false }), { valueBool: false })).toBe(false);
  });

  it('flags a number outside [min,max]', () => {
    const fridge = item({ inputType: 'number', minValue: 2, maxValue: 8 });
    expect(evaluateFlag(fridge, { valueNumber: 1 })).toBe(true);
    expect(evaluateFlag(fridge, { valueNumber: 9 })).toBe(true);
    expect(evaluateFlag(fridge, { valueNumber: 5 })).toBe(false);
  });

  it('never flags text', () => {
    expect(evaluateFlag(item({ inputType: 'text' }), { valueText: 'anything' })).toBe(false);
  });
});

describe('isAnswered', () => {
  it('treats both true and false bool as answered', () => {
    expect(isAnswered(item({}), { valueBool: false })).toBe(true);
    expect(isAnswered(item({}), undefined)).toBe(false);
  });
  it('requires non-empty text', () => {
    expect(isAnswered(item({ inputType: 'text' }), { valueText: '  ' })).toBe(false);
    expect(isAnswered(item({ inputType: 'text' }), { valueText: 'ok' })).toBe(true);
  });
});

describe('computeProgress', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c', required: false })];

  it('is pending with no responses', () => {
    const p = computeProgress(items, new Map());
    expect(p.status).toBe('pending');
    expect(p.completionPct).toBe(0);
  });

  it('is in_progress when some but not all required answered', () => {
    const r = new Map<string, ResponseValue>([['a', { valueBool: true }]]);
    const p = computeProgress(items, r);
    expect(p.status).toBe('in_progress');
    expect(p.requiredAnswered).toBe(1);
    expect(p.completionPct).toBe(50);
  });

  it('is completed when all required answered (optional ignored)', () => {
    const r = new Map<string, ResponseValue>([
      ['a', { valueBool: true }],
      ['b', { valueBool: false }],
    ]);
    const p = computeProgress(items, r);
    expect(p.status).toBe('completed');
    expect(p.completionPct).toBe(100);
  });
});
