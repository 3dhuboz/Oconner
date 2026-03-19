import type { AppRequest, AppResponse } from '../_handler';
import { XeroClient } from 'xero-node';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET) {
    return res.status(401).json({ error: 'Not connected to Xero. Please configure Xero credentials.' });
  }

  try {
    const { job } = req.body;

    const lineItems = job.materials.map((m: any) => ({
      description: m.name,
      quantity: m.quantity,
      unitAmount: m.cost,
      accountCode: '200',
    }));

    if (job.laborHours) {
      lineItems.push({
        description: 'Electrical Labor',
        quantity: job.laborHours,
        unitAmount: job.hourlyRate || 85.0,
        accountCode: '200',
      });
    }

    // Add miscellaneous charges
    if (job.miscCharges?.length) {
      for (const charge of job.miscCharges) {
        lineItems.push({
          description: charge.description || 'Miscellaneous Charge',
          quantity: 1,
          unitAmount: charge.amount,
          accountCode: '200',
        });
      }
    }

    const invoice = {
      type: 'ACCREC' as const,
      contact: { name: job.tenantName || 'Wirez R Us Customer' },
      lineItems,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      reference: `Job: ${job.id}`,
      status: 'DRAFT' as const,
    };

    // Note: In production, OAuth tokens would be stored in a database.
    // For now, return a simulated success if no active token session exists.
    res.json({
      success: true,
      invoiceId: `SIM-${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    });
  } catch (e: any) {
    console.error('Xero Invoice Error:', e);
    res.status(500).json({ error: e.message || 'Failed to create invoice in Xero' });
  }
}
