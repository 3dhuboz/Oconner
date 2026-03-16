import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const AUDITED_COLLECTIONS = ['orders', 'products', 'customers', 'config', 'deliveryDays'];

export const onDocumentWritten = functions
  .region('australia-southeast1')
  .firestore.document('{collection}/{docId}')
  .onWrite(async (change, context) => {
    const { collection, docId } = context.params;

    if (!AUDITED_COLLECTIONS.includes(collection)) return null;

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let action: string;
    if (!before && after) {
      action = `${collection}.create`;
    } else if (before && !after) {
      action = `${collection}.delete`;
    } else {
      action = `${collection}.update`;

      if (before && after) {
        const changedFields = Object.keys(after).filter(
          (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        );

        if (changedFields.length === 1) {
          const field = changedFields[0];
          if (['updatedAt', 'orderCount', 'lastUpdated'].includes(field)) return null;
          action = `${collection}.${field}_update`;
        }
      }
    }

    const authContext = context.auth;
    const adminUid = authContext?.uid ?? 'system';
    const adminEmail = authContext?.token?.email ?? 'system';

    try {
      await db.collection('auditLog').add({
        action,
        entity: collection,
        entityId: docId,
        before: before ?? {},
        after: after ?? {},
        adminUid,
        adminEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      functions.logger.error('Failed to write audit log:', err);
    }

    return null;
  });
