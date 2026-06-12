import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/d1';
import { deliveryDays, orders } from '@butcher/db';
import type { Env } from '../types';

const SQUARE_API = 'https://connect.squareup.com/v2';

type Db = ReturnType<typeof drizzle>;
type OrderRow = Pick<
  typeof orders.$inferSelect,
  'id'
  | 'items'
  | 'customerName'
  | 'customerEmail'
  | 'customerPhone'
  | 'deliveryFee'
  | 'deliveryDayId'
  | 'internalNotes'
>;

async function squareFetch(env: Env, path: string, body: unknown): Promise<any> {
  if (!env.SQUARE_ACCESS_TOKEN) throw new Error('Square not configured');

  const res = await fetch(`${SQUARE_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function invoiceDueDate(db: Db, order: OrderRow): Promise<string> {
  if (order.deliveryDayId) {
    const [day] = await db.select().from(deliveryDays).where(eq(deliveryDays.id, order.deliveryDayId)).limit(1);
    if (day?.date) {
      const deliveryDate = new Date(day.date);
      deliveryDate.setDate(deliveryDate.getDate() - 1);
      if (deliveryDate > new Date()) return deliveryDate.toISOString().split('T')[0];
    }
  }
  return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

async function findOrCreateSquareCustomer(env: Env, order: OrderRow): Promise<string> {
  const searchResult = await squareFetch(env, '/customers/search', {
    query: {
      filter: {
        email_address: { exact: order.customerEmail },
      },
    },
  });
  if (searchResult.errors) {
    throw new Error(`Square customer search failed: ${JSON.stringify(searchResult.errors).slice(0, 500)}`);
  }
  if (searchResult.customers?.length) return searchResult.customers[0].id;

  const createCustomerResult = await squareFetch(env, '/customers', {
    idempotency_key: crypto.randomUUID(),
    given_name: order.customerName?.split(' ')[0] ?? '',
    family_name: order.customerName?.split(' ').slice(1).join(' ') ?? '',
    email_address: order.customerEmail,
    phone_number: order.customerPhone ? `+61${order.customerPhone.replace(/^0/, '')}` : undefined,
  });
  if (createCustomerResult.errors) {
    throw new Error(`Square customer creation failed: ${JSON.stringify(createCustomerResult.errors).slice(0, 500)}`);
  }

  const squareCustomerId = createCustomerResult.customer?.id;
  if (!squareCustomerId) throw new Error('Square customer created but no ID returned');
  return squareCustomerId;
}

export async function createAndPublishSquareInvoiceForOrder(
  db: Db,
  env: Env,
  order: OrderRow,
): Promise<{ invoiceId: string | null }> {
  if (!env.SQUARE_ACCESS_TOKEN || !env.SQUARE_LOCATION_ID) {
    throw new Error('Square not configured');
  }

  const items = JSON.parse(order.items) as Array<{ productName: string; quantity?: number; lineTotal: number }>;
  const squareCustomerId = await findOrCreateSquareCustomer(env, order);
  const squareLineItems = items.map((item) => {
    const qty = item.quantity ?? 1;
    return {
      name: item.productName ?? 'Item',
      quantity: String(qty),
      base_price_money: {
        amount: Math.round(item.lineTotal / qty),
        currency: 'AUD',
      },
    };
  });

  if (order.deliveryFee > 0) {
    squareLineItems.push({
      name: 'Delivery Fee',
      quantity: '1',
      base_price_money: { amount: order.deliveryFee, currency: 'AUD' },
    });
  }

  const squareOrderResult = await squareFetch(env, '/orders', {
    idempotency_key: crypto.randomUUID(),
    order: {
      location_id: env.SQUARE_LOCATION_ID,
      customer_id: squareCustomerId,
      line_items: squareLineItems,
    },
  });
  if (squareOrderResult.errors) {
    throw new Error(`Square order creation failed: ${JSON.stringify(squareOrderResult.errors).slice(0, 500)}`);
  }

  const squareOrderId = squareOrderResult.order?.id;
  if (!squareOrderId) throw new Error('Square order created but no ID returned');

  const invoiceResult = await squareFetch(env, '/invoices', {
    idempotency_key: crypto.randomUUID(),
    invoice: {
      location_id: env.SQUARE_LOCATION_ID,
      order_id: squareOrderId,
      primary_recipient: {
        customer_id: squareCustomerId,
      },
      payment_requests: [{
        request_type: 'BALANCE',
        due_date: await invoiceDueDate(db, order),
        automatic_payment_source: 'NONE',
      }],
      delivery_method: 'EMAIL',
      title: `O'Connor Agriculture - Order #${order.id.slice(0, 8).toUpperCase()}`,
      accepted_payment_methods: {
        card: true,
        square_gift_card: false,
        bank_account: false,
        buy_now_pay_later: false,
      },
    },
  });
  if (invoiceResult.errors) {
    throw new Error(`Square invoice creation failed: ${JSON.stringify(invoiceResult.errors).slice(0, 500)}`);
  }

  const invoice = invoiceResult.invoice;
  if (invoice?.id) {
    const publishResult = await squareFetch(env, `/invoices/${invoice.id}/publish`, {
      idempotency_key: crypto.randomUUID(),
      version: invoice.version ?? 0,
    });
    if (publishResult.errors) {
      throw new Error(`Square invoice publish failed: ${JSON.stringify(publishResult.errors).slice(0, 500)}`);
    }
  }

  const invoiceId = invoice?.id ?? null;
  await db.update(orders).set({
    paymentStatus: 'invoice_sent',
    internalNotes: `${order.internalNotes ?? ''}\nSquare invoice sent: ${invoiceId ?? 'unknown'}`.trim(),
    updatedAt: Date.now(),
  }).where(eq(orders.id, order.id));

  return { invoiceId };
}
