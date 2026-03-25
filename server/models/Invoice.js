const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'AppSubscription' },
  // Invoice type
  type: { type: String, enum: ['one-off', 'recurring', 'setup'], default: 'one-off' },
  // Recurring config
  recurringInterval: { type: String, enum: ['monthly', 'yearly', 'none'], default: 'none' },
  recurringStartDate: { type: Date },
  recurringEndDate: { type: Date },
  nextInvoiceDate: { type: Date },
  parentInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  // Line items
  lineItems: [lineItemSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 10 }, // GST 10%
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'AUD' },
  // Status
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void'], default: 'draft' },
  // Dates
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  paidDate: { type: Date },
  // Square integration
  squareInvoiceId: { type: String, default: '' },
  squarePaymentUrl: { type: String, default: '' },
  squareOrderId: { type: String, default: '' },
  // Branding
  branding: {
    businessName: { type: String, default: 'Penny Wise I.T' },
    abn: { type: String, default: '' },
    email: { type: String, default: 'admin@pennywiseit.com.au' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    logoUrl: { type: String, default: '' }
  },
  notes: { type: String, default: '' },
  internalNotes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-generate invoice number
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    const year = new Date().getFullYear();
    this.invoiceNumber = `PW-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  // Calculate totals
  this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  this.tax = Math.round(this.subtotal * (this.taxRate / 100) * 100) / 100;
  this.total = Math.round((this.subtotal + this.tax) * 100) / 100;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
