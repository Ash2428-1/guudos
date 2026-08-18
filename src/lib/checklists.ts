/** Client-safe checklist types shared by domain, services and UI. */

export type InputType = 'bool' | 'number' | 'text' | 'select';
export type ChecklistFrequency = 'daily' | 'per_shift' | 'weekly' | 'monthly' | 'ad_hoc';
export type InstanceStatus = 'pending' | 'in_progress' | 'completed';

export const INSTANCE_STATUS_LABELS: Record<InstanceStatus, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  completed: 'Done',
};

export interface SelectOption {
  label: string;
  value: string;
  /** Choosing this option raises a ticket. */
  flag: boolean;
}

export interface ChecklistItemDef {
  id: string;
  position: number;
  label: string;
  inputType: InputType;
  required: boolean;
  /** Section heading this item sits under (from the source form layout). */
  section: string | null;
  /** bool items: flag when the answer is "No". */
  flagWhenFalse: boolean;
  /** number items: flag when outside [minValue, maxValue]. */
  minValue: number | null;
  maxValue: number | null;
  /** select items: the choices; a chosen option with flag=true raises a ticket. */
  options: SelectOption[] | null;
}

export interface ResponseValue {
  valueBool?: boolean | null;
  valueNumber?: number | null;
  /** Also stores the chosen option value for 'select' items. */
  valueText?: string | null;
}
