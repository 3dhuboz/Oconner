export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  adminUid: string;
  adminEmail: string;
  timestamp: number;
}
