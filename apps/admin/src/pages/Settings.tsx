import { useState, useEffect } from 'react';
import { api } from '@butcher/shared';
import { Save, RefreshCw, Image, Type, Phone, Layout, ChevronDown, ChevronUp, CreditCard, Mail } from 'lucide-react';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface PaymentConfig {
  provider: 'stripe';
  mode: 'test' | 'live';
  publishableKey: string;
  webhookSecret: string;
  statementDescriptor: string;
}

interface EmailConfig {
  provider: 'sendgrid' | 'smtp' | 'resend';
  apiKey: string;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

interface StorefrontConfig {
  hero: {
    badge: string;
    headline: string;
    headlineLine2: string;
    body: string;
    tagline: string;
    primaryCta: string;
    secondaryCta: string;
    heroImageUrl: string;
  };
  features: Feature[];
  cta: {
    headline: string;
    subtext: string;
    note: string;
    buttonText: string;
  };
  contact: {
    email: string;
    social: string;
    location: string;
  };
}

const PAYMENT_DEFAULTS: PaymentConfig = {
  provider: 'stripe',
  mode: 'test',
  publishableKey: '',
  webhookSecret: '',
  statementDescriptor: "O'Connor Agriculture",
};

const EMAIL_DEFAULTS: EmailConfig = {
  provider: 'sendgrid',
  apiKey: '',
  fromName: "O'Connor Agriculture",
  fromEmail: 'orders@oconnoragriculture.com.au',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
};

const DEFAULTS: StorefrontConfig = {
  hero: {
    badge: 'Locally Raised • Grass Fed • Naturally Healthy',
    headline: 'Local Grass Fed Beef.',
    headlineLine2: 'Delivered to Your Door.',
    body: "First generation family farm from the Boyne Valley, QLD. We use regenerative management practices to produce quality beef that's good for the land and good for you.",
    tagline: '"Good for the land. Good for the community. Good for you."',
    primaryCta: 'Order Now',
    secondaryCta: 'Delivery Schedule',
    heroImageUrl: '',
  },
  features: [
    { icon: '🌿', title: 'Regenerative Farming', description: 'We focus on soil health and animal welfare, producing beef you can feel good about eating.' },
    { icon: '🚚', title: 'Free Delivery', description: 'Temperature-controlled delivery straight to your door. All prices include delivery.' },
    { icon: '👨‍👩‍👧', title: 'Family Owned', description: 'First generation family farm from Calliope and the Boyne Valley, QLD.' },
  ],
  cta: {
    headline: 'Ready to Order?',
    subtext: 'Browse our beef boxes — BBQ Box, Family Box, Double, and Value Box.',
    note: 'All prices include free delivery to your door.',
    buttonText: 'View Beef Boxes',
  },
  contact: {
    email: 'orders@oconnoragriculture.com.au',
    social: 'https://www.facebook.com/profile.php?id=61574996320860',
    location: 'Calliope & Boyne Valley, QLD',
  },
};

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 font-semibold text-gray-800">
          <Icon className="h-4 w-4 text-brand" />
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors';
const textareaCls = `${inputCls} resize-none`;

export default function SettingsPage() {
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULTS);
  const [payment, setPayment] = useState<PaymentConfig>(PAYMENT_DEFAULTS);
  const [email, setEmail] = useState<EmailConfig>(EMAIL_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.config.get()
      .then((data: any) => {
        if (data?.storefront) setConfig({ ...DEFAULTS, ...data.storefront });
        if (data?.payment) setPayment({ ...PAYMENT_DEFAULTS, ...data.payment });
        if (data?.email) setEmail({ ...EMAIL_DEFAULTS, ...data.email });
      })
      .catch((e: unknown) => console.error('Failed to load settings:', e))
      .finally(() => setLoading(false));
  }, []);

  const setPay = <K extends keyof PaymentConfig>(k: K, v: PaymentConfig[K]) =>
    setPayment((p) => ({ ...p, [k]: v }));
  const setEmailField = <K extends keyof EmailConfig>(k: K, v: EmailConfig[K]) =>
    setEmail((e) => ({ ...e, [k]: v }));

  const setHero = (key: keyof StorefrontConfig['hero'], val: string) =>
    setConfig((c) => ({ ...c, hero: { ...c.hero, [key]: val } }));

  const setCta = (key: keyof StorefrontConfig['cta'], val: string) =>
    setConfig((c) => ({ ...c, cta: { ...c.cta, [key]: val } }));

  const setContact = (key: keyof StorefrontConfig['contact'], val: string) =>
    setConfig((c) => ({ ...c, contact: { ...c.contact, [key]: val } }));

  const setFeature = (idx: number, key: keyof Feature, val: string) =>
    setConfig((c) => {
      const features = [...c.features];
      features[idx] = { ...features[idx], [key]: val };
      return { ...c, features };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.config.update({ storefront: config, payment, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to defaults? This will overwrite your current settings on save.')) {
      setConfig(DEFAULTS);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storefront Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Changes are live on the website immediately after saving.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-mid transition-colors disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saved && (
        <div className="bg-brand-light border border-brand/20 text-brand text-sm rounded-lg px-4 py-2.5">
          ✓ Settings saved — the storefront will reflect changes immediately.
        </div>
      )}

      <Section title="Hero Section" icon={Type}>
        <Field label="Badge text (small line above headline)">
          <input className={inputCls} value={config.hero.badge} onChange={(e) => setHero('badge', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Headline line 1">
            <input className={inputCls} value={config.hero.headline} onChange={(e) => setHero('headline', e.target.value)} />
          </Field>
          <Field label="Headline line 2">
            <input className={inputCls} value={config.hero.headlineLine2} onChange={(e) => setHero('headlineLine2', e.target.value)} />
          </Field>
        </div>
        <Field label="Body text">
          <textarea className={textareaCls} rows={3} value={config.hero.body} onChange={(e) => setHero('body', e.target.value)} />
        </Field>
        <Field label="Tagline / quote">
          <input className={inputCls} value={config.hero.tagline} onChange={(e) => setHero('tagline', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary button text">
            <input className={inputCls} value={config.hero.primaryCta} onChange={(e) => setHero('primaryCta', e.target.value)} />
          </Field>
          <Field label="Secondary button text">
            <input className={inputCls} value={config.hero.secondaryCta} onChange={(e) => setHero('secondaryCta', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Hero Image" icon={Image}>
        <Field
          label="Hero background image URL"
          hint="Leave blank to use the solid green brand colour. Use a high-quality landscape image (min 1400px wide). Hosted on any public URL or Cloudflare R2."
        >
          <input
            className={inputCls}
            placeholder="https://your-image-url.com/hero.jpg"
            value={config.hero.heroImageUrl}
            onChange={(e) => setHero('heroImageUrl', e.target.value)}
          />
        </Field>
        {config.hero.heroImageUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 aspect-video relative bg-gray-100">
            <img
              src={config.hero.heroImageUrl}
              alt="Hero preview"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
            />
            <div className="absolute inset-0 bg-brand/50" />
            <p className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">Preview (with overlay)</p>
          </div>
        )}
      </Section>

      <Section title="Feature Cards (Why O'Connor?)" icon={Layout}>
        {config.features.map((f, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Card {i + 1}</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Icon (emoji)">
                <input className={inputCls} value={f.icon} onChange={(e) => setFeature(i, 'icon', e.target.value)} maxLength={4} />
              </Field>
              <div className="col-span-2">
                <Field label="Title">
                  <input className={inputCls} value={f.title} onChange={(e) => setFeature(i, 'title', e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Description">
              <textarea className={textareaCls} rows={2} value={f.description} onChange={(e) => setFeature(i, 'description', e.target.value)} />
            </Field>
          </div>
        ))}
      </Section>

      <Section title="Call to Action (bottom section)" icon={Type}>
        <Field label="Headline">
          <input className={inputCls} value={config.cta.headline} onChange={(e) => setCta('headline', e.target.value)} />
        </Field>
        <Field label="Sub-text">
          <input className={inputCls} value={config.cta.subtext} onChange={(e) => setCta('subtext', e.target.value)} />
        </Field>
        <Field label="Note (small text below sub-text)">
          <input className={inputCls} value={config.cta.note} onChange={(e) => setCta('note', e.target.value)} />
        </Field>
        <Field label="Button text">
          <input className={inputCls} value={config.cta.buttonText} onChange={(e) => setCta('buttonText', e.target.value)} />
        </Field>
      </Section>

      <Section title="Payment Gateway" icon={CreditCard}>
        <Field label="Provider">
          <div className="flex items-center gap-3 py-1.5">
            <span className="text-sm font-medium">Stripe</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Supported</span>
          </div>
        </Field>
        <Field label="Mode">
          <div className="flex gap-3">
            {(['test', 'live'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payMode"
                  value={m}
                  checked={payment.mode === m}
                  onChange={() => setPay('mode', m)}
                  className="accent-brand"
                />
                <span className={`text-sm font-medium ${m === 'live' ? 'text-green-700' : 'text-amber-700'}`}>
                  {m === 'live' ? 'Live (real payments)' : 'Test mode'}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <Field
          label="Stripe Publishable Key"
          hint={`Starts with pk_${payment.mode === 'live' ? 'live' : 'test'}_…`}
        >
          <input
            className={inputCls}
            placeholder={`pk_${payment.mode === 'live' ? 'live' : 'test'}_…`}
            value={payment.publishableKey}
            onChange={(e) => setPay('publishableKey', e.target.value)}
          />
        </Field>
        <Field
          label="Stripe Webhook Secret"
          hint="From Stripe dashboard → Webhooks. Stored server-side only."
        >
          <input
            className={inputCls}
            type="password"
            placeholder="whsec_…"
            value={payment.webhookSecret}
            onChange={(e) => setPay('webhookSecret', e.target.value)}
          />
        </Field>
        <Field label="Statement descriptor (shows on bank statements)">
          <input
            className={inputCls}
            maxLength={22}
            value={payment.statementDescriptor}
            onChange={(e) => setPay('statementDescriptor', e.target.value)}
          />
        </Field>
        {payment.mode === 'live' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠ You are in <strong>live mode</strong>. Real customer cards will be charged.
          </div>
        )}
      </Section>

      <Section title="Email Routing" icon={Mail}>
        <Field label="Email provider">
          <select
            className={inputCls}
            value={email.provider}
            onChange={(e) => setEmailField('provider', e.target.value as EmailConfig['provider'])}
          >
            <option value="sendgrid">SendGrid</option>
            <option value="resend">Resend</option>
            <option value="smtp">SMTP (custom)</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From name">
            <input className={inputCls} value={email.fromName} onChange={(e) => setEmailField('fromName', e.target.value)} />
          </Field>
          <Field label="From email">
            <input className={inputCls} type="email" value={email.fromEmail} onChange={(e) => setEmailField('fromEmail', e.target.value)} />
          </Field>
        </div>

        {email.provider !== 'smtp' ? (
          <Field
            label={`${email.provider === 'sendgrid' ? 'SendGrid' : 'Resend'} API Key`}
            hint="Stored encrypted in Firestore. Used by Cloudflare Worker to send order confirmations."
          >
            <input
              className={inputCls}
              type="password"
              placeholder={email.provider === 'sendgrid' ? 'SG.…' : 're_…'}
              value={email.apiKey}
              onChange={(e) => setEmailField('apiKey', e.target.value)}
            />
          </Field>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="SMTP Host">
                <input className={inputCls} placeholder="smtp.example.com" value={email.smtpHost} onChange={(e) => setEmailField('smtpHost', e.target.value)} />
              </Field>
              <Field label="SMTP Port">
                <input className={inputCls} type="number" value={email.smtpPort} onChange={(e) => setEmailField('smtpPort', e.target.value)} />
              </Field>
            </div>
            <Field label="SMTP Username">
              <input className={inputCls} value={email.smtpUser} onChange={(e) => setEmailField('smtpUser', e.target.value)} />
            </Field>
            <Field label="SMTP Password">
              <input className={inputCls} type="password" value={email.smtpPass} onChange={(e) => setEmailField('smtpPass', e.target.value)} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Contact Details" icon={Phone}>
        <Field label="Email address">
          <input className={inputCls} type="email" value={config.contact.email} onChange={(e) => setContact('email', e.target.value)} />
        </Field>
        <Field label="Facebook / Social URL">
          <input className={inputCls} type="url" value={config.contact.social} onChange={(e) => setContact('social', e.target.value)} />
        </Field>
        <Field label="Location text">
          <input className={inputCls} value={config.contact.location} onChange={(e) => setContact('location', e.target.value)} />
        </Field>
      </Section>

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm text-white bg-brand rounded-lg hover:bg-brand-mid transition-colors disabled:opacity-60 font-medium"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
