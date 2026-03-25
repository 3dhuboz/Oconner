const express = require('express');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const AppSubscription = require('../models/AppSubscription');
const { auth, adminOnly } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { findOrCreateSquareCustomer, createSquareInvoice, publishSquareInvoice, cancelSquareInvoice, getSquareInvoice } = require('../utils/square');

const router = express.Router();

// ══════════════════════════════════════════════
// ADMIN — Invoice Management
// ══════════════════════════════════════════════

// List all invoices (with filters)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.customerId) query.customer = req.query.customerId;

    const invoices = await Invoice.find(query)
      .populate('customer', 'firstName lastName email company')
      .populate('subscription')
      .sort('-createdAt');
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single invoice
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'firstName lastName email company phone')
      .populate('subscription');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Invoice stats/summary
router.get('/stats/summary', auth, adminOnly, async (req, res) => {
  try {
    const [totalInvoices, draftCount, sentCount, paidCount, overdueCount] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'draft' }),
      Invoice.countDocuments({ status: 'sent' }),
      Invoice.countDocuments({ status: 'paid' }),
      Invoice.countDocuments({ status: 'overdue' })
    ]);

    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const outstanding = await Invoice.aggregate([
      { $match: { status: { $in: ['sent', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const recurringRevenue = await Invoice.aggregate([
      { $match: { type: 'recurring', status: { $in: ['sent', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    res.json({
      totalInvoices,
      draftCount,
      sentCount,
      paidCount,
      overdueCount,
      totalRevenue: totalRevenue[0]?.total || 0,
      outstanding: outstanding[0]?.total || 0,
      recurringRevenue: recurringRevenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create invoice
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { customerId, lineItems, type, dueDate, notes, recurringInterval, branding, subscriptionId } = req.body;

    const customer = await User.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const invoice = new Invoice({
      customer: customerId,
      subscription: subscriptionId || undefined,
      type: type || 'one-off',
      recurringInterval: type === 'recurring' ? (recurringInterval || 'monthly') : 'none',
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        amount: (item.quantity || 1) * item.unitPrice
      })),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      notes: notes || '',
      branding: branding || {},
      createdBy: req.user._id
    });

    if (type === 'recurring' && recurringInterval) {
      invoice.recurringStartDate = new Date();
      const nextDate = new Date();
      if (recurringInterval === 'yearly') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      invoice.nextInvoiceDate = nextDate;
    }

    await invoice.save();
    await invoice.populate('customer', 'firstName lastName email company');

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
});

// Update invoice (draft only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'draft') return res.status(400).json({ message: 'Can only edit draft invoices' });

    const { lineItems, dueDate, notes, type, recurringInterval, branding } = req.body;

    if (lineItems) {
      invoice.lineItems = lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        amount: (item.quantity || 1) * item.unitPrice
      }));
    }
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;
    if (type) invoice.type = type;
    if (recurringInterval) invoice.recurringInterval = recurringInterval;
    if (branding) Object.assign(invoice.branding, branding);

    await invoice.save();
    await invoice.populate('customer', 'firstName lastName email company');

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update invoice', error: err.message });
  }
});

// Send invoice (via Square + email)
router.post('/:id/send', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer', 'firstName lastName email company phone');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'draft' && invoice.status !== 'sent') {
      return res.status(400).json({ message: 'Invoice cannot be sent in current status' });
    }

    const customer = invoice.customer;

    // Try Square integration
    const squareCustomer = await findOrCreateSquareCustomer({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      company: customer.company,
      phone: customer.phone
    });

    if (squareCustomer) {
      const squareResult = await createSquareInvoice({
        squareCustomerId: squareCustomer.id,
        lineItems: invoice.lineItems,
        dueDate: invoice.dueDate,
        title: `Invoice ${invoice.invoiceNumber}`,
        invoiceNumber: invoice.invoiceNumber,
        branding: invoice.branding
      });

      if (squareResult) {
        invoice.squareInvoiceId = squareResult.invoice.id;
        invoice.squareOrderId = squareResult.orderId;

        // Publish the Square invoice (sends email via Square)
        const published = await publishSquareInvoice(squareResult.invoice.id, squareResult.invoice.version);
        if (published?.publicUrl) {
          invoice.squarePaymentUrl = published.publicUrl;
        }
      }
    }

    // Always send our own branded email too
    const brandName = invoice.branding?.businessName || 'Penny Wise I.T';
    sendEmail({
      to: customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${brandName}`,
      html: invoiceEmailHtml(invoice, customer)
    }).catch(err => console.error('[Email] Invoice send failed:', err.message));

    invoice.status = 'sent';
    invoice.issueDate = new Date();
    await invoice.save();

    res.json({ message: `Invoice ${invoice.invoiceNumber} sent to ${customer.email}`, invoice });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send invoice', error: err.message });
  }
});

// Mark as paid
router.post('/:id/mark-paid', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidDate: new Date() },
      { new: true }
    ).populate('customer', 'firstName lastName email company');

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Send payment receipt
    const customer = invoice.customer;
    sendEmail({
      to: customer.email,
      subject: `Payment Received — Invoice ${invoice.invoiceNumber}`,
      html: paymentReceiptHtml(invoice, customer)
    }).catch(err => console.error('[Email] Receipt send failed:', err.message));

    res.json({ message: 'Invoice marked as paid', invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Mark as overdue
router.post('/:id/mark-overdue', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'overdue' },
      { new: true }
    ).populate('customer', 'firstName lastName email company');

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice marked as overdue', invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel/void invoice
router.post('/:id/cancel', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Cancel in Square if applicable
    if (invoice.squareInvoiceId) {
      const squareInv = await getSquareInvoice(invoice.squareInvoiceId);
      if (squareInv) {
        await cancelSquareInvoice(invoice.squareInvoiceId, squareInv.version);
      }
    }

    invoice.status = 'cancelled';
    await invoice.save();
    await invoice.populate('customer', 'firstName lastName email company');

    res.json({ message: 'Invoice cancelled', invoice });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete draft invoice
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (invoice.status !== 'draft') return res.status(400).json({ message: 'Can only delete draft invoices' });

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Duplicate invoice (for recurring re-issue)
router.post('/:id/duplicate', auth, adminOnly, async (req, res) => {
  try {
    const source = await Invoice.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Invoice not found' });

    const newInvoice = new Invoice({
      customer: source.customer,
      subscription: source.subscription,
      type: source.type,
      recurringInterval: source.recurringInterval,
      lineItems: source.lineItems,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      notes: source.notes,
      branding: source.branding,
      parentInvoice: source._id,
      createdBy: req.user._id
    });

    await newInvoice.save();
    await newInvoice.populate('customer', 'firstName lastName email company');

    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to duplicate invoice', error: err.message });
  }
});

// Quick-create invoice for a subscription
router.post('/from-subscription', auth, adminOnly, async (req, res) => {
  try {
    const { subscriptionId, includeSetupFee } = req.body;
    const sub = await AppSubscription.findById(subscriptionId)
      .populate('app', 'name setupFee')
      .populate('user', 'firstName lastName email company');
    if (!sub) return res.status(404).json({ message: 'Subscription not found' });

    const lineItems = [];
    const intervalLabel = sub.billingInterval === 'yearly' ? 'Year' : 'Month';

    // Subscription line item
    lineItems.push({
      description: `${sub.app.name} — ${sub.planKey.charAt(0).toUpperCase() + sub.planKey.slice(1)} Plan (${intervalLabel}ly)`,
      quantity: 1,
      unitPrice: sub.amount,
      amount: sub.amount
    });

    // Setup fee (if requested and not yet paid)
    if (includeSetupFee && sub.app.setupFee > 0 && !sub.setupFeePaid) {
      lineItems.push({
        description: `${sub.app.name} — One-Time Setup & Configuration`,
        quantity: 1,
        unitPrice: sub.app.setupFee,
        amount: sub.app.setupFee
      });
    }

    const invoice = new Invoice({
      customer: sub.user._id,
      subscription: sub._id,
      type: 'recurring',
      recurringInterval: sub.billingInterval || 'monthly',
      lineItems,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdBy: req.user._id
    });

    await invoice.save();
    await invoice.populate('customer', 'firstName lastName email company');

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice from subscription', error: err.message });
  }
});

// ══════════════════════════════════════════════
// Email Templates
// ══════════════════════════════════════════════

function invoiceEmailHtml(invoice, customer) {
  const brandName = invoice.branding?.businessName || 'Penny Wise I.T';
  const itemsHtml = invoice.lineItems.map(item =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:13px">${item.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:13px">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-size:13px;font-weight:600">$${item.amount.toFixed(2)}</td>
    </tr>`
  ).join('');

  const paymentLink = invoice.squarePaymentUrl
    ? `<div style="text-align:center;margin:24px 0">
        <a href="${invoice.squarePaymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Pay Now — $${invoice.total.toFixed(2)} AUD</a>
      </div>`
    : `<p style="color:#475569;font-size:13px">Please contact us for payment details.</p>`;

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:32px 24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">${brandName}</h1>
      <p style="color:#67e8f9;margin:8px 0 0;font-size:13px">Invoice ${invoice.invoiceNumber}</p>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#1e293b;font-size:15px">Hi ${customer.firstName || 'there'},</p>
      <p style="color:#475569;font-size:14px;line-height:1.7">Please find your invoice below. Payment is due by <strong>${new Date(invoice.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead>
          <tr style="border-bottom:2px solid #e2e8f0">
            <th style="text-align:left;padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase">Description</th>
            <th style="text-align:center;padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase">Qty</th>
            <th style="text-align:right;padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <table style="width:100%;margin:16px 0;font-size:14px">
        <tr><td style="padding:4px 0;color:#64748b">Subtotal</td><td style="text-align:right;padding:4px 0;color:#1e293b">$${invoice.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b">GST (${invoice.taxRate}%)</td><td style="text-align:right;padding:4px 0;color:#1e293b">$${invoice.tax.toFixed(2)}</td></tr>
        <tr style="border-top:2px solid #0f172a"><td style="padding:12px 0;font-weight:800;color:#0f172a;font-size:16px">Total</td><td style="text-align:right;padding:12px 0;font-weight:800;color:#0f172a;font-size:16px">$${invoice.total.toFixed(2)} AUD</td></tr>
      </table>

      ${paymentLink}

      ${invoice.notes ? `<p style="color:#64748b;font-size:12px;margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px">${invoice.notes}</p>` : ''}
    </div>
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">${brandName}${invoice.branding?.abn ? ` — ABN: ${invoice.branding.abn}` : ''}</p>
      <p style="color:#94a3b8;font-size:11px;margin:4px 0 0"><a href="https://www.pennywiseit.com.au" style="color:#6366f1">www.pennywiseit.com.au</a></p>
    </div>
  </div>
</body></html>`;
}

function paymentReceiptHtml(invoice, customer) {
  const brandName = invoice.branding?.businessName || 'Penny Wise I.T';
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:22px">Payment Received ✓</h1>
      <p style="color:#bbf7d0;margin:8px 0 0;font-size:13px">Invoice ${invoice.invoiceNumber}</p>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#1e293b;font-size:15px">Hi ${customer.firstName || 'there'},</p>
      <p style="color:#475569;font-size:14px;line-height:1.7">We've received your payment of <strong>$${invoice.total.toFixed(2)} AUD</strong> for invoice <strong>${invoice.invoiceNumber}</strong>. Thank you!</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0;color:#166534;font-size:13px;font-weight:600">✅ Payment confirmed</p>
        <p style="margin:8px 0 0;color:#15803d;font-size:12px">Paid on ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <p style="color:#475569;font-size:13px">If you have any questions, just reply to this email or visit <a href="https://www.pennywiseit.com.au/contact" style="color:#6366f1">our contact page</a>.</p>
      <p style="color:#475569;font-size:13px;margin-top:24px">Cheers,<br/><strong>The ${brandName} Team</strong></p>
    </div>
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="color:#94a3b8;font-size:11px;margin:0">${brandName}</p>
    </div>
  </div>
</body></html>`;
}

module.exports = router;
