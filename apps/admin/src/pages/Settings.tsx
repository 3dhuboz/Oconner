import { useState, useEffect, useRef } from 'react';
import { api } from '@butcher/shared';
import { Save, RefreshCw, Image, Type, Phone, Layout, ChevronDown, ChevronUp, CreditCard, Mail, Bell, Send, Users, Radio, Plus, X, BookOpen, Upload, Star, Trash2 } from 'lucide-react';
import { toast } from '../lib/toast';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface PaymentConfig {
  provider: 'square';
  mode: 'test' | 'live';
  accessToken: string;
  locationId: string;
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
  provider: 'square',
  mode: 'live',
  accessToken: '',
  locationId: '',
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

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? 'https://oconner-api.steve-700.workers.dev';

function resolveImageUrl(value: string): string {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  // Partial path like "/648756608_..." — prepend API images path
  if (value.startsWith('/')) return `${API_BASE}/images${value}`;
  return `${API_BASE}/images/${value}`;
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await api.images.upload(file, 'about');
      onChange(url);
      toast('Image uploaded');
    } catch {
      toast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = resolveImageUrl(value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {previewUrl && (
        <div className="mb-2">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full max-w-[200px] h-28 rounded-lg object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or upload"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" /> {uploading ? '...' : 'Upload'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
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

  const [rewards, setRewards] = useState({
    enabled: false,
    stampsRequired: 10,
    prize: '',
    programName: "O'Connor Rewards",
  });

  const [subscriptionFrequencies, setSubscriptionFrequencies] = useState(['fortnightly', 'monthly']);

  const [reviews, setReviews] = useState<{ name: string; location: string; text: string; rating: number }[]>([
    { name: 'Sarah M.', location: 'Gladstone, QLD', text: 'The best beef we have ever had.', rating: 5 },
  ]);

  const [about, setAbout] = useState({
    heroTagline: 'Locally Raised · Grass Fed · Naturally Healthy',
    heroTitle: "About O'Connor Agriculture",
    heroBody: "First generation family farmers from Calliope and the Boyne Valley, QLD — raising grass fed beef the right way, delivering it straight to your door.",
    heroImage: '/649363139_122169276728833210_2969468506503855850_n.jpg',
    storyTitle: 'Good for the land. Good for the community. Good for you.',
    storyP1: "We're a first generation farming family from the Boyne Valley, Queensland. Like many farmers, we started with a simple idea: raise cattle the right way — on grass, on open land, without shortcuts.",
    storyP2: 'What began as a passion for regenerative agriculture grew into something we\'re incredibly proud of. Our cattle roam freely across the Calliope region, grazing on natural pastures the way nature intended. No feedlots. No unnecessary additives. Just honest, hard work and healthy animals.',
    storyP3: 'We cut out the middleman so you get farm-fresh, grass fed beef at a fair price — delivered straight to your door in temperature-controlled comfort.',
    storyImage: '/649363139_122169276728833210_2969468506503855850_n.jpg',
    cattleTitle: 'Raised on grass. Born on country.',
    cattleBody: "Our cattle are raised entirely on natural pasture in the Boyne Valley region — some of the most fertile and beautiful grazing country in Queensland.\n\nWe use regenerative grazing management to look after the land while producing premium quality beef. Healthy soil grows healthy grass, which grows healthy cattle — and that shows in the flavour.",
    cattleImage1: '/648756608_122169276602833210_2007100768441221733_n.jpg',
    cattleImage2: '/605527026_122159273378833210_2192412403070503185_n.jpg',
    teamTitle: 'Faces behind your delivery',
    teamBody: 'From paddock to your front door — our small, dedicated team handles every step with the care and pride of true family farmers.',
    teamImage1: '/649233392_122169276668833210_2761320253198269250_n.jpg',
    teamImage2: '/627050601_122164946600833210_6379541527443613506_n.jpg',
    teamImage3: '/637918980_122167024448833210_227926334031877108_n.jpg',
    processTitle: 'Expertly butchered, carefully packed',
    processBody: "Every animal is processed at a local, licensed abattoir and butchered by experienced tradespeople who take pride in every cut.\n\nBulk orders are carefully packed in freezer bags and boxed, ready for your freezer. Individual cuts and sausages are vacuum-sealed for maximum freshness.\n\nDelivered in a refrigerated vehicle straight to your door — so your beef arrives in perfect condition, every time.",
    processImage: '/633837159_122166552518833210_2828990505487028501_n.jpg',
    value1: 'Regenerative Farming',
    value1Body: 'We focus on soil health and animal welfare. Healthy land grows healthy cattle, and healthy cattle produces better beef.',
    value2: 'Community First',
    value2Body: "Supporting local jobs, local land, and local families. When you buy from us, you're investing in the Boyne Valley community.",
    value3: 'Farm to Door',
    value3Body: 'No supermarket markups. No middlemen. Just farm-fresh beef delivered directly to your home at honest prices.',
  });

  useEffect(() => {
    api.config.get()
      .then((data: any) => {
        if (data?.storefront) setConfig({ ...DEFAULTS, ...data.storefront });
        if (data?.payment) setPayment({ ...PAYMENT_DEFAULTS, ...data.payment });
        if (data?.email) setEmail({ ...EMAIL_DEFAULTS, ...data.email });
        if (data?.ticker) setTicker({ enabled: true, items: [], facebookPageUrl: 'https://www.facebook.com/profile.php?id=61574996320860', ...data.ticker });
        if (data?.about) setAbout((prev) => ({ ...prev, ...data.about }));
        if (data?.rewards) setRewards((prev) => ({ ...prev, ...data.rewards }));
        if (data?.subscriptionFrequencies) setSubscriptionFrequencies(data.subscriptionFrequencies);
        if (data?.reviews) setReviews(data.reviews);
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
      await api.config.update({ storefront: config, payment, email, ticker, about, rewards, subscriptionFrequencies, reviews });
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-mid transition-colors disabled:opacity-60 font-medium mt-2"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Feature Cards'}
        </button>
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
            <span className="text-sm font-medium">Square</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Connected</span>
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
                  {m === 'live' ? 'Live (real payments)' : 'Sandbox'}
                </span>
              </label>
            ))}
          </div>
        </Field>
        <Field
          label="Square Access Token"
          hint="From Square Developer Dashboard → Credentials"
        >
          <input
            className={inputCls}
            type="password"
            placeholder="sq0atp-…"
            value={payment.accessToken}
            onChange={(e) => setPay('accessToken', e.target.value)}
          />
        </Field>
        <Field
          label="Square Location ID"
          hint="From Square Developer Dashboard → Locations"
        >
          <input
            className={inputCls}
            placeholder="L…"
            value={payment.locationId}
            onChange={(e) => setPay('locationId', e.target.value)}
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

      <Section title="Rewards Program" icon={Users}>
        <Field label="Enable Rewards Program">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rewards.enabled}
              onChange={() => setRewards((r) => ({ ...r, enabled: !r.enabled }))}
              className="accent-brand w-5 h-5"
            />
            <span className="text-sm">Customers earn stamps with each order</span>
          </label>
        </Field>
        {rewards.enabled && (
          <>
            <Field label="Stamps required for reward" hint="How many orders/stamps before the customer earns a free reward">
              <input
                type="number"
                className={inputCls}
                min={1}
                max={50}
                value={rewards.stampsRequired}
                onChange={(e) => setRewards((r) => ({ ...r, stampsRequired: Number(e.target.value) || 10 }))}
              />
            </Field>
            <Field label="Reward description" hint="What the customer receives when they collect enough stamps">
              <input
                className={inputCls}
                value={rewards.prize}
                onChange={(e) => setRewards((r) => ({ ...r, prize: e.target.value }))}
                placeholder="e.g. Free BBQ Box, Free 2kg Mince, $50 credit"
              />
            </Field>
            <Field label="Program name" hint="Displayed to customers on the storefront">
              <input
                className={inputCls}
                value={rewards.programName}
                onChange={(e) => setRewards((r) => ({ ...r, programName: e.target.value }))}
                placeholder="O'Connor Rewards"
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Subscription Settings" icon={RefreshCw}>
        <Field label="Available Delivery Frequencies" hint="Toggle which frequencies customers can choose when subscribing. At least one must be enabled.">
          <div className="space-y-2">
            {[
              { id: 'weekly', label: 'Weekly', desc: 'Every week (52 deliveries/year)' },
              { id: 'fortnightly', label: 'Fortnightly', desc: 'Every 2 weeks (26 deliveries/year)' },
              { id: 'monthly', label: 'Monthly', desc: 'Once a month (12 deliveries/year)' },
            ].map((freq) => {
              const isEnabled = subscriptionFrequencies.includes(freq.id);
              return (
                <label key={freq.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isEnabled ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => {
                      const updated = isEnabled ? subscriptionFrequencies.filter((f) => f !== freq.id) : [...subscriptionFrequencies, freq.id];
                      if (updated.length === 0) return;
                      setSubscriptionFrequencies(updated);
                    }}
                    className="accent-brand w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium">{freq.label}</p>
                    <p className="text-xs text-gray-400">{freq.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Field>
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
            hint="Stored encrypted. Used by Cloudflare Worker to send order confirmations."
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

      <Section title="About Page" icon={BookOpen}>
        <p className="text-xs text-gray-400 mb-3">Edit the content and images on the About Us page.</p>
        <div className="space-y-4">
          <Field label="Hero Tagline">
            <input className={inputCls} value={about.heroTagline} onChange={(e) => setAbout({ ...about, heroTagline: e.target.value })} />
          </Field>
          <Field label="Hero Title">
            <input className={inputCls} value={about.heroTitle} onChange={(e) => setAbout({ ...about, heroTitle: e.target.value })} />
          </Field>
          <Field label="Hero Body">
            <textarea className={textareaCls} rows={2} value={about.heroBody} onChange={(e) => setAbout({ ...about, heroBody: e.target.value })} />
          </Field>
          <ImageField label="Hero Background Image" value={about.heroImage} onChange={(url) => setAbout({ ...about, heroImage: url })} />
          <hr className="my-2" />
          <p className="text-xs font-semibold text-gray-500 uppercase">Our Story</p>
          <Field label="Story Headline">
            <input className={inputCls} value={about.storyTitle} onChange={(e) => setAbout({ ...about, storyTitle: e.target.value })} />
          </Field>
          <Field label="Story Paragraph 1">
            <textarea className={textareaCls} rows={3} value={about.storyP1} onChange={(e) => setAbout({ ...about, storyP1: e.target.value })} />
          </Field>
          <Field label="Story Paragraph 2">
            <textarea className={textareaCls} rows={3} value={about.storyP2} onChange={(e) => setAbout({ ...about, storyP2: e.target.value })} />
          </Field>
          <Field label="Story Paragraph 3">
            <textarea className={textareaCls} rows={3} value={about.storyP3} onChange={(e) => setAbout({ ...about, storyP3: e.target.value })} />
          </Field>
          <ImageField label="Story Image" value={about.storyImage} onChange={(url) => setAbout({ ...about, storyImage: url })} />
          <hr className="my-2" />
          <p className="text-xs font-semibold text-gray-500 uppercase">Our Cattle</p>
          <Field label="Cattle Headline">
            <input className={inputCls} value={about.cattleTitle} onChange={(e) => setAbout({ ...about, cattleTitle: e.target.value })} />
          </Field>
          <Field label="Cattle Body">
            <textarea className={textareaCls} rows={4} value={about.cattleBody} onChange={(e) => setAbout({ ...about, cattleBody: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ImageField label="Cattle Image 1" value={about.cattleImage1} onChange={(url) => setAbout({ ...about, cattleImage1: url })} />
            <ImageField label="Cattle Image 2" value={about.cattleImage2} onChange={(url) => setAbout({ ...about, cattleImage2: url })} />
          </div>
          <hr className="my-2" />
          <p className="text-xs font-semibold text-gray-500 uppercase">The Team</p>
          <Field label="Team Headline">
            <input className={inputCls} value={about.teamTitle} onChange={(e) => setAbout({ ...about, teamTitle: e.target.value })} />
          </Field>
          <Field label="Team Body">
            <textarea className={textareaCls} rows={2} value={about.teamBody} onChange={(e) => setAbout({ ...about, teamBody: e.target.value })} />
          </Field>
          <div className="space-y-3">
            <ImageField label="Team Image 1" value={about.teamImage1} onChange={(url) => setAbout({ ...about, teamImage1: url })} />
            <ImageField label="Team Image 2" value={about.teamImage2} onChange={(url) => setAbout({ ...about, teamImage2: url })} />
            <ImageField label="Team Image 3" value={about.teamImage3} onChange={(url) => setAbout({ ...about, teamImage3: url })} />
          </div>
          <hr className="my-2" />
          <p className="text-xs font-semibold text-gray-500 uppercase">Our Process</p>
          <Field label="Process Headline">
            <input className={inputCls} value={about.processTitle} onChange={(e) => setAbout({ ...about, processTitle: e.target.value })} />
          </Field>
          <Field label="Process Body">
            <textarea className={textareaCls} rows={4} value={about.processBody} onChange={(e) => setAbout({ ...about, processBody: e.target.value })} />
          </Field>
          <ImageField label="Process Image" value={about.processImage} onChange={(url) => setAbout({ ...about, processImage: url })} />
          <hr className="my-2" />
          <p className="text-xs font-semibold text-gray-500 uppercase">Values</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Field label="Value 1 Title"><input className={inputCls} value={about.value1} onChange={(e) => setAbout({ ...about, value1: e.target.value })} /></Field>
              <Field label="Value 1 Body"><textarea className={textareaCls} rows={2} value={about.value1Body} onChange={(e) => setAbout({ ...about, value1Body: e.target.value })} /></Field>
            </div>
            <div className="space-y-2">
              <Field label="Value 2 Title"><input className={inputCls} value={about.value2} onChange={(e) => setAbout({ ...about, value2: e.target.value })} /></Field>
              <Field label="Value 2 Body"><textarea className={textareaCls} rows={2} value={about.value2Body} onChange={(e) => setAbout({ ...about, value2Body: e.target.value })} /></Field>
            </div>
            <div className="space-y-2">
              <Field label="Value 3 Title"><input className={inputCls} value={about.value3} onChange={(e) => setAbout({ ...about, value3: e.target.value })} /></Field>
              <Field label="Value 3 Body"><textarea className={textareaCls} rows={2} value={about.value3Body} onChange={(e) => setAbout({ ...about, value3Body: e.target.value })} /></Field>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Customer Reviews" icon={Star}>
        <p className="text-xs text-gray-400 mb-3">Paste your best Facebook reviews here. They'll appear on the homepage.</p>
        {reviews.map((r, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 relative">
            <button
              onClick={() => setReviews((prev) => prev.filter((_, j) => j !== i))}
              className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 rounded"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Review {i + 1}</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name">
                <input className={inputCls} value={r.name} onChange={(e) => setReviews((prev) => prev.map((rv, j) => j === i ? { ...rv, name: e.target.value } : rv))} placeholder="Sarah M." />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={r.location} onChange={(e) => setReviews((prev) => prev.map((rv, j) => j === i ? { ...rv, location: e.target.value } : rv))} placeholder="Gladstone, QLD" />
              </Field>
            </div>
            <Field label="Review text">
              <textarea className={textareaCls} rows={2} value={r.text} onChange={(e) => setReviews((prev) => prev.map((rv, j) => j === i ? { ...rv, text: e.target.value } : rv))} placeholder="Paste the review from Facebook..." />
            </Field>
            <Field label="Rating">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviews((prev) => prev.map((rv, j) => j === i ? { ...rv, rating: star } : rv))}
                    className={`p-0.5 ${star <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
              </div>
            </Field>
          </div>
        ))}
        <button
          onClick={() => setReviews((prev) => [...prev, { name: '', location: '', text: '', rating: 5 }])}
          className="flex items-center gap-1.5 text-sm text-brand font-medium hover:underline mt-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add review
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-mid transition-colors disabled:opacity-60 font-medium mt-2"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Reviews'}
        </button>
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
