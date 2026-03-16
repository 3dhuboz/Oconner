import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onOrderPacked = functions
  .region('australia-southeast1')
  .firestore.document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { orderId } = context.params;

    if (before.status === 'packed' || after.status !== 'packed') return null;

    const items = after.items as Array<{
      productId: string;
      productName: string;
      category: string;
      isMeatPack: boolean;
      weight?: number;
      quantity?: number;
      lineTotal: number;
    }>;

    const adminEmail = process.env.SENDGRID_FROM_EMAIL ?? 'orders@example.com.au';

    for (const item of items) {
      const qtyToDeduct = item.isMeatPack ? (item.quantity ?? 1) : (item.weight ?? 0) / 1000;
      const unit = item.isMeatPack ? 'units' : 'kg';

      const movementRef = db.collection('stockMovements').doc();
      await movementRef.set({
        productId: item.productId,
        productName: item.productName,
        type: 'sale',
        qty: -qtyToDeduct,
        unit,
        orderId,
        createdBy: 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const productRef = db.collection('products').doc(item.productId);
      await db.runTransaction(async (tx) => {
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists) return;

        const product = productSnap.data()!;
        const newStock = (product.stockOnHand as number) - qtyToDeduct;

        tx.update(productRef, {
          stockOnHand: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (newStock <= (product.minThreshold as number)) {
          functions.logger.warn(
            `Stock alert: ${item.productName} is below threshold (${newStock} ${unit} remaining)`,
          );

          const sgMail = await import('@sendgrid/mail');
          const apiKey = process.env.SENDGRID_API_KEY;
          if (apiKey) {
            sgMail.default.setApiKey(apiKey);
            await sgMail.default.send({
              to: adminEmail,
              from: adminEmail,
              subject: `⚠️ Stock Alert: ${item.productName} below threshold`,
              html: `<p><strong>${item.productName}</strong> has fallen below minimum stock threshold.</p>
                     <p>Current stock: <strong>${newStock.toFixed(2)} ${unit}</strong></p>
                     <p>Minimum threshold: <strong>${(product.minThreshold as number).toFixed(2)} ${unit}</strong></p>
                     <p>Please reorder from the supplier.</p>`,
            }).catch((err: unknown) => functions.logger.error('Stock alert email failed:', err));
          }
        }
      });
    }

    await change.after.ref.update({
      packedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`Stock deducted for packed order ${orderId}`);
    return null;
  });
