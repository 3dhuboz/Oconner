import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: "Terms and conditions of sale for O'Connor Agriculture. Read before placing your order.",
};

export const runtime = 'edge';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-gray-600 leading-relaxed text-sm">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-white">
        <div className="bg-brand text-white py-12 px-4 text-center">
          <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Terms &amp; Conditions of Sale
          </h1>
          <p className="text-brand-light">O'Connor Agriculture — Last updated March 2026</p>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-14">

          <Section title="1. About O'Connor Agriculture">
            <p>
              O'Connor Agriculture ("we", "us", "our") is a family farming business operating from Calliope and
              the Boyne Valley, Queensland. We supply locally raised, grass fed beef direct to customers
              throughout Queensland.
            </p>
            <p>
              By placing an order through our website or directly with us, you agree to these Terms and Conditions
              of Sale. Please read them carefully before purchasing.
            </p>
          </Section>

          <Section title="2. Orders and Acceptance">
            <p>
              All orders are subject to availability. An order is not accepted until you receive written
              confirmation from us (via email or direct message). We reserve the right to refuse or cancel
              any order at our discretion.
            </p>
            <p>
              For bulk orders (¼ and ½ share), availability is subject to our cutting schedule. We will
              contact you to confirm your order and arrange a delivery date once your animal is ready.
            </p>
          </Section>

          <Section title="3. Pricing">
            <p>
              All prices are listed in Australian dollars (AUD) and include GST where applicable.
              Delivery is <strong>free of charge</strong> to your door.
            </p>
            <p>
              <strong>Weight-based pricing (¼ and ½ Share Beef):</strong> The total price for bulk share
              orders is calculated on the actual dressed weight of the animal. Our grass fed cattle typically
              dress between 215–225 kg; however, this may vary. You will be invoiced at the agreed per-kg price
              multiplied by the actual dressed weight confirmed at the time of processing. We will communicate
              the final weight and total before delivery.
            </p>
            <p>
              We reserve the right to change our prices at any time. The price applicable to your order is the
              price confirmed at the time your order is accepted.
            </p>
          </Section>

          <Section title="4. Payment">
            <p>
              Payment is required in full prior to delivery unless otherwise agreed in writing. We accept payment
              via credit/debit card through our secure payment gateway (Stripe). We do not store your card details.
            </p>
            <p>
              For bulk share orders, a deposit may be required at the time of booking to secure your order, with
              the balance due prior to delivery. Deposit terms will be confirmed at the time of your order.
            </p>
          </Section>

          <Section title="5. Delivery">
            <p>
              Delivery is provided free of charge within our standard delivery zones in Central Queensland.
              We deliver in a refrigerated vehicle on scheduled delivery days. You will receive notification
              prior to your delivery date.
            </p>
            <p>
              It is your responsibility to ensure someone is available to receive the delivery, or that
              adequate cool storage arrangements are in place (e.g. an Esky/fridge). We are not responsible
              for spoilage if your order cannot be received at the time of delivery.
            </p>
            <p>
              Delivery dates are estimates only and may be subject to change due to circumstances outside our
              control (weather, vehicle issues, etc.). We will notify you of any changes as soon as possible.
            </p>
          </Section>

          <Section title="6. Perishable Goods">
            <p>
              All products are perishable. Once delivered, it is your responsibility to refrigerate or freeze
              your order promptly. We recommend placing product into your freezer within 2 hours of delivery.
            </p>
            <p>
              Frozen product has a recommended freezer life of 9–12 months. Vacuum-sealed products may keep
              longer. Always follow safe food handling and storage guidelines.
            </p>
          </Section>

          <Section title="7. Quality Guarantee &amp; Returns">
            <p>
              We take pride in the quality of our beef. If you are not satisfied with your order, please contact
              us within <strong>24 hours of delivery</strong> with details of the issue (including photos where
              possible). We will assess each claim on a case-by-case basis and may offer a replacement,
              credit, or refund at our discretion.
            </p>
            <p>
              We are unable to accept returns of perishable goods once they have been received and stored by
              the customer, unless the product was defective or incorrectly supplied.
            </p>
            <p>
              Refunds will be processed to the original payment method within 5–10 business days.
            </p>
          </Section>

          <Section title="8. Cancellations">
            <p>
              <strong>Standard orders:</strong> You may cancel your order at any time prior to the delivery
              day for a full refund. Cancellations on the delivery day itself may not be refundable.
            </p>
            <p>
              <strong>Bulk share orders (¼ and ½ Share):</strong> Cancellations of bulk orders must be
              made at least <strong>14 days</strong> prior to the agreed cutting/processing date to receive
              a full refund of any deposit paid. Cancellations within 14 days of the processing date may
              result in forfeiture of the deposit.
            </p>
          </Section>

          <Section title="9. Subscriptions">
            <p>
              Subscription box customers agree to the recurring billing schedule selected at sign-up.
              You may pause or cancel your subscription at any time from your account dashboard before
              the next billing date. We are unable to refund subscription payments that have already been
              processed for an upcoming delivery.
            </p>
          </Section>

          <Section title="10. Notifications &amp; Communications">
            <p>
              By creating an account or placing an order, you consent to receive order-related communications
              from us via email. If you have opted in to push notifications through our app, you consent to
              receive delivery reminders and order updates via push notification.
            </p>
            <p>
              You may opt out of push notifications at any time from your account settings or through your
              device's notification settings. Opting out of transactional emails may affect your ability to
              track your order.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>
              To the maximum extent permitted by Australian law, O'Connor Agriculture's liability for any
              claim arising from the supply of our products is limited to the value of the products supplied.
              We are not liable for indirect or consequential losses.
            </p>
            <p>
              Nothing in these terms excludes, restricts, or modifies any guarantee, condition, warranty,
              or right conferred by the Australian Consumer Law where it would be unlawful to do so.
            </p>
          </Section>

          <Section title="12. Privacy">
            <p>
              We collect and use your personal information only for the purpose of processing your order and
              communicating with you about it. We do not sell, share, or disclose your information to third
              parties except where necessary to fulfil your order (e.g. payment processing). We comply with the
              Australian Privacy Act 1988.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms and Conditions are governed by the laws of Queensland, Australia. Any disputes will
              be subject to the exclusive jurisdiction of the courts of Queensland.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              For any questions about these terms or your order, please contact us at{' '}
              <a href="mailto:orders@oconnoragriculture.com.au" className="text-brand hover:underline font-medium">
                orders@oconnoragriculture.com.au
              </a>{' '}
              or message our Facebook page at{' '}
              <a
                href="https://www.facebook.com/profile.php?id=61574996320860"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline font-medium"
              >
                @OConnorAgriculture
              </a>.
            </p>
          </Section>

        </div>
      </main>
      <Footer />
    </>
  );
}
