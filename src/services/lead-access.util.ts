// 3. Internal
import { RoleName } from '@/entities/Role.entity';
import { ForbiddenError } from '@/errors/app.errors';
import { AuthUser } from '@/middleware/auth.middleware';

/**
 * The single RBAC rule every lead-scoped endpoint applies (CA-43/CA-66,
 * also CA-112 for agent traffic): a SalesMan may only act on leads
 * assigned to them; an Admin bypasses the filter entirely. Shared by every
 * service that touches a lead or one of its nested resources (Site Visit,
 * Conclusion, Activity Log) so the rule is enforced in exactly one place.
 *
 * `assignedSalemanId` is null until a lead reaches the Lead stage (HLD:
 * "Set at Lead stage"), so a just-created Enquiry has no assignee yet —
 * while unassigned, the creator (`createdById`) is granted access instead,
 * otherwise a SalesMan would be locked out of the Enquiry they just
 * created and could never advance it themselves. Once a lead is assigned,
 * only the assignee (or Admin) has access, per CA-43's strict reading —
 * the creator does not retain standing access after reassignment away.
 */
export function assertLeadAccess(
  actor: AuthUser,
  leadAssignedSalemanId: string | null,
  leadCreatedById: string,
): void {
  if (actor.role === RoleName.ADMIN) {
    return;
  }
  if (leadAssignedSalemanId === null) {
    if (leadCreatedById === actor.id) {
      return;
    }
  } else if (leadAssignedSalemanId === actor.id) {
    return;
  }
  throw new ForbiddenError('You do not have access to this lead');
}
