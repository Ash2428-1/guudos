/** Client-safe checklist types shared by domain, services and UI. */

export type InputType = 'bool' | 'number' | 'text';
export type ChecklistFrequency = 'daily' | 'per_shift' | 'ad_hoc';
export type InstanceStatus = 'pending' | 'in_progress' | 'completed';

export const INSTANCE_STATUS_LABELS: Record<InstanceStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  completed: 'Done',
};

export interface ChecklistItemDef {
  id: string;
  position: number;
  label: string;
  inputType: InputType;
  required: boolean;
  /** bool items: flag when the answer is "No". */
  flagWhenFalse: boolean;
  /** number items: flag when outside [minValue, maxValue]. */
  minValue: number | null;
  maxValue: number | null;
}

export interface ResponseValue {
  valueBool?: boolean | null;
  valueNumber?: number | null;
  valueText?: string | null;
}
