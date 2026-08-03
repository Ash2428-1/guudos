import {
  type ChecklistItemDef,
  type InstanceStatus,
  type ResponseValue,
} from '@/lib/checklists';
import { isAnswered } from './flags';

export interface Progress {
  status: InstanceStatus;
  requiredTotal: number;
  requiredAnswered: number;
  completionPct: number; // 0..100
}

/**
 * Derive display progress from items + responses. Note: the *authoritative*
 * completed status is set server-side on submit; this drives the UI.
 */
export function computeProgress(
  items: ChecklistItemDef[],
  responses: Map<string, ResponseValue>,
): Progress {
  const required = items.filter((i) => i.required);
  const requiredTotal = required.length;
  const requiredAnswered = required.filter((i) =>
    isAnswered(i, responses.get(i.id)),
  ).length;
  const anyAnswered = items.some((i) => isAnswered(i, responses.get(i.id)));

  const completionPct =
    requiredTotal === 0
      ? anyAnswered
        ? 100
        : 0
      : Math.round((requiredAnswered / requiredTotal) * 100);

  let status: InstanceStatus = 'pending';
  if (requiredTotal > 0 && requiredAnswered >= requiredTotal) {
    status = 'completed';
  } else if (anyAnswered) {
    status = 'in_progress';
  }

  return { status, requiredTotal, requiredAnswered, completionPct };
}
