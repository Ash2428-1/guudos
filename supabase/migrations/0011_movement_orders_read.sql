-- =============================================================================
-- 0011_movement_orders_read.sql — Movement orders are an "on-mobile" view.
-- Any org member (MUM / operator / supervisor) may READ movement orders + legs
-- so crews can see their own deployment plan. Creating and editing stays
-- management-only (the existing FOR ALL policies from 0010 handle writes).
-- =============================================================================

drop policy if exists mo_read on public.movement_orders;
create policy mo_read on public.movement_orders for select
  using (organization_id in (select public.user_org_ids()));

drop policy if exists leg_read on public.movement_legs;
create policy leg_read on public.movement_legs for select
  using (exists (
    select 1 from public.movement_orders mo
    where mo.id = movement_order_id
      and mo.organization_id in (select public.user_org_ids())));
