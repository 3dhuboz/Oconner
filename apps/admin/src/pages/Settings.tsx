import { useState, useEffect } from 'react';
import { api } from '@butcher/shared';
import { Save, RefreshCw, Image, Type, Phone, Layout, ChevronDown, ChevronUp, CreditCard, Mail, Bell, Send, Users, Radio, Plus, X } from 'lucide-react';
import { toast } from '../lib/toast';

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

interface TickerItem {
  text: string;
  url?: string;
}

interface TickerConfig {
  enabled: boolean;
  items: TickerItem[];
  facebookPageUrl?: string;
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

  const [ticker, setTicker] = useState<TickerConfig>({ enabled: true, items: [], facebookPageUrl: 'https://www.facebook.com/profile.php?id=61574996320860' });

  const [pushStats, setPushStats] = useState<{ subscribers: number } | null>(null);
  const [pushForm, setPushForm] = useState({ title: "O'Connor — Update", body: '', url: '' });
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<{ sent: number; total: number } | null>(null);
  const [pushMode, setPushMode] = useState<'test' | 'broadcast'>('test');

  useEffect(() => {
    api.config.get()
      .then((data: any) => {
        if (data?.storefront) setConfig({ ...DEFAULTS, ...data.storefront });
        if (data?.payment) setPayment({ ...PAYMENT_DEFAULTS, ...data.payment });
        if (data?.email) setEmail({ ...EMAIL_DEFAULTS, ...data.email });
        if (data?.ticker) setTicker({ enabled: true, items: [], facebookPageUrl: 'https://www.facebook.com/profile.php?id=61574996320860', ...data.ticker });
      })
      .catch((e: unknown) => console.error('Failed to load settings:', e))
      .finally(() => setLoading(false));
    api.get<{ subscribers: number }>('/api/push/admin/stats')
      .then(setPushStats)
      .catch(() => {});
  }, []);

  const handlePushSend = async () => {
    if (!pushForm.body.trim()) return;
    if (pushMode === 'broadcast' && !confirm(`Send push to all ${pushStats?.subscribers ?? 0} subscribers?`)) return;
    setPushSending(true);
    setPushResult(null);
    try {
      const endpoint = pushMode === 'test' ? '/api/push/admin/test-send' : '/api/push/admin/broadcast';
      const result = await api.post<{ sent: number; total: number }>(endpoint, {
        title: pushForm.title,
        body: pushForm.body,
        url: pushForm.url || undefined,
      });
      setPushResult(result);
      toast(`Push sent to ${result.sent} device${result.sent !== 1 ? 's' : ''}`);
    } catch (e: any) {
      toast(e?.message ?? 'Push send failed', 'error');
    } finally {
      setPushSending(false);
    }
  };

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
      await api.config.update({ storefront: config, payment, email, ticker });
      toast('Settings saved — storefront updated immediately');
    } catch (e) {
      console.error('Save failed:', e);
      toast('Save failed', 'error');
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
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

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

      <Section title="Push Notifications" icon={Bell}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Active subscribers:</span>
            <span className="font-semibold text-gray-900">
              {pushStats === null ? '…' : pushStats.subscribers}
            </span>
          </div>
          <button
            onClick={() => api.get<{ subscribers: number }>('/api/push/admin/stats').then(setPushStats).catch(() => {})}
            className="text-xs text-gray-400 hover:text-brand transition-colors flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['test', 'broadcast'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setPushMode(m); setPushResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pushMode === m ? 'bg-brand text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {m === 'test' ? '🧪 Test (my device)' : `📢 Broadcast (all ${pushStats?.subscribers ?? 0})`}
            </button>
          ))}
        </div>

        <Field label="Notification title">
          <input
            className={inputCls}
            value={pushForm.title}
            onChange={(e) => setPushForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field label="Message body *">
          <textarea
            className={textareaCls}
            rows={2}
            placeholder="Your order arrives tomorrow…"
            value={pushForm.body}
            onChange={(e) => setPushForm((f) => ({ ...f, body: e.target.value }))}
          />
        </Field>
        <Field label="Link URL (optional)" hint="Tapping the notification opens this URL">
          <input
            className={inputCls}
            placeholder="https://oconner.com.au/account"
            value={pushForm.url}
            onChange={(e) => setPushForm((f) => ({ ...f, url: e.target.value }))}
          />
        </Field>

        {pushResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-3 py-2.5">
            ✓ Sent to {pushResult.sent} of {pushResult.total} device{pushResult.total !== 1 ? 's' : ''}
          </div>
        )}

        {pushMode === 'test' && (
          <p className="text-xs text-gray-400">
            Test mode sends only to push subscriptions registered to <strong>your own admin account</strong>.
            Make sure you've allowed notifications on the storefront first.
          </p>
        )}
        {pushMode === 'broadcast' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
            ⚠ Broadcast will send to <strong>all {pushStats?.subscribers ?? 0} subscribed devices</strong>. Use sparingly.
          </div>
        )}

        <button
          onClick={handlePushSend}
          disabled={pushSending || !pushForm.body.trim()}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {pushSending ? 'Sending…' : pushMode === 'test' ? 'Send test push' : 'Broadcast now'}
        </button>
      </Section>

      <Section title="Social Ticker" icon={Radio}>
        <Field label="Enable ticker" hint="Shows a scrolling update bar at the top of the homepage.">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ticker.enabled}
              onChange={(e) => setTicker((t) => ({ ...t, enabled: e.target.checked }))}
              className="accent-brand w-4 h-4"
            />
            <span className="text-sm text-gray-700">Show ticker on homepage</span>
          </label>
        </Field>
        <Field label="Facebook page URL" hint="Clicking the Facebook logo in the ticker takes visitors here.">
          <input
            className={inputCls}
            placeholder="https://www.facebook.com/yourpage"
            value={ticker.facebookPageUrl ?? ''}
            onChange={(e) => setTicker((t) => ({ ...t, facebookPageUrl: e.target.value }))}
          />
        </Field>
        <Field label="Ticker messages" hint="Copy key updates from your Facebook posts here — they scroll across the top of the homepage.">
          <div className="space-y-2">
            {ticker.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input
                    className={inputCls}
                    placeholder="e.g. 🥩 Fresh beef boxes available this Friday — order now!"
                    value={item.text}
                    onChange={(e) => setTicker((t) => { const items = [...t.items]; items[i] = { ...items[i], text: e.target.value }; return { ...t, items }; })}
                  />
                  <input
                    className={inputCls}
                    placeholder="Link URL (optional, e.g. /shop)"
                    value={item.url ?? ''}
                    onChange={(e) => setTicker((t) => { const items = [...t.items]; items[i] = { ...items[i], url: e.target.value || undefined }; return { ...t, items }; })}
                  />
                </div>
                <button
                  onClick={() => setTicker((t) => ({ ...t, items: t.items.filter((_, j) => j !== i) }))}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setTicker((t) => ({ ...t, items: [...t.items, { text: '' }] }))}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-mid transition-colors font-medium"
            >
              <Plus className="h-4 w-4" /> Add message
            </button>
          </div>
        </Field>
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
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
