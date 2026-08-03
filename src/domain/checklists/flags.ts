import { type ChecklistItemDef, type ResponseValue } from '@/lib/checklists';

/** Has this item been answered? (drives required/completion logic) */
export function isAnswered(
  item: ChecklistItemDef,
  r: ResponseValue | undefined,
): boolean {
  if (!r) return false;
  switch (item.inputType) {
    case 'bool':
      return r.valueBool === true || r.valueBool === false;
    case 'number':
      return r.valueNumber !== null && r.valueNumber !== undefined;
    case 'text':
      return Boolean(r.valueText && r.valueText.trim());
  }
}

/**
 * Should this response be flagged (i.e. raise a ticket)?
 *  - bool:   flagged when answered "No" and the item flags on false
 *  - number: flagged when outside [minValue, maxValue]
 *  - text:   never auto-flagged (informational)
 */
export function evaluateFlag(
  item: ChecklistItemDef,
  r: ResponseValue | undefined,
): boolean {
  if (!r) return false;
  switch (item.inputType) {
    case 'bool':
      return item.flagWhenFalse && r.valueBool === false;
    case 'number': {
      const v = r.valueNumber;
      if (v === null || v === undefined) return false;
      if (item.minValue !== null && v < item.minValue) return true;
      if (item.maxValue !== null && v > item.maxValue) return true;
      return false;
    }
    case 'text':
      return false;
  }
}
