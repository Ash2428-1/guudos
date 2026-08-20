'use server';

import { redirect } from 'next/navigation';
import { requireManager } from '@/services/auth/session';
import {
  createMovementFromWorkOrder,
  getMobileTeam,
  saveMovementOrder,
  type MovementOrderFields,
} from '@/services/movement-orders/service';
import { type MovementLeg, type TeamMember } from '@/lib/work-orders';

export async function createMovementFromWorkOrderAction(formData: FormData) {
  const woId = String(formData.get('workOrderId'));
  const id = await createMovementFromWorkOrder(woId);
  redirect(`/movement-orders/${id}`);
}

export async function saveMovementOrderAction(
  id: string,
  fields: MovementOrderFields,
  legs: MovementLeg[],
): Promise<boolean> {
  await requireManager();
  await saveMovementOrder(id, fields, legs);
  return true;
}

export async function loadTeamAction(locationId: string): Promise<TeamMember[]> {
  return getMobileTeam(locationId);
}
