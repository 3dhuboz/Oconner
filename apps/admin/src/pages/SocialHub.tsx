import { useState } from 'react';
import { api } from '@butcher/shared';
import { Sparkles, Copy, Check, RefreshCw, Facebook, Instagram, Linkedin, ExternalLink } from 'lucide-react';

const SOCIAL_STUDIO_URL = 'https://oconnor-social.pages.dev';

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
];

const POST_TYPES = [
  { id: 'product', label: 'Product Promo', emoji: '🥩' },
  { id: 'farm_update', label: 'Farm Update', emoji: '🌿' },
  { id: 'seasonal', label: 'Seasonal', emoji: '🌤️' },
  { id: 'recipe', label: 'Recipe Idea', emoji: '🍳' },
  { id: 'community', label: 'Community', emoji: '🤝' },
  { id: 'educational', label: 'Educational', emoji: '📖' },
];

const TONES = [
  { id: 'warm', label: 'Warm & Authentic' },
  { id: 'exciting', label: 'Exciting & Bold' },
  { id: 'informative', label: 'Informative' },
  { id: 'humorous', label: 'Light & Humorous' },
  { id: 'heartfelt', label: 'Heartfelt' },
];

const BRANDS = [
  { id: 'oconnor', label: "O'Connor Agriculture", logo: '/oc-logo.jpg' },
];

export default function SocialHubPage() {
  const [activeTab, setActiveTab] = useState<'generator' | 'studio'>('generator');
  const [brand, setBrand] = useState('oconnor');
  const [platform, setPlatform] = useState('facebook');
  const [postType, setPostType] = useState('product');
  const [tone, setTone] = useState('warm');
  const [extraContext, setExtraContext] = useState('');
  const [generatedPost, setGeneratedPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setGeneratedPost('');
    try {
      const data = await api.post<{ post?: string; error?: string }>('/api/generate-post', { brand, platform, postType, tone, extraContext });
      if (data.error) {
        setError(data.error);
      } else {
        setGeneratedPost(data.post ?? '');
        setCharCount((data.post ?? '').length);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate post.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostEdit = (val: string) => {
    setGeneratedPost(val);
    setCharCount(val.length);
  };

  const charLimit = platform === 'facebook' ? 63206 : platform === 'instagram' ? 2200 : 3000;
  const charWarning = charCount > charLimit * 0.85;

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-brand" />
              Social AI Studio
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">AI post generator + embedded social studio.</p>
          </div>
          {activeTab === 'studio' && (
            <a href={SOCIAL_STUDIO_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand border rounded-lg px-3 py-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
            </a>
          )}
        </div>
        <div className="flex gap-0 border-b -mb-px">
          {(['generator', 'studio'] as const).map((id) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {id === 'generator' ? 'AI Post Generator' : 'Social AI Studio'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'studio' ? (
        <iframe src={SOCIAL_STUDIO_URL} className="flex-1 w-full border-0" title="Social AI Studio"
          allow="camera; microphone; clipboard-read; clipboard-write" />
      ) : (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand</label>
              <div className="flex gap-2">
                {BRANDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBrand(b.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      brand === b.id
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {b.logo && (
                      <img
                        src={b.logo}
                        alt={b.label}
                        className="h-5 w-5 rounded object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      platform === p.id
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <p.icon className={`h-4 w-4 ${platform === p.id ? 'text-brand' : p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Post Type</label>
              <div className="grid grid-cols-3 gap-2">
                {POST_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPostType(t.id)}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      postType === t.id
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      tone === t.id
                        ? 'border-brand bg-brand text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Extra Context <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="e.g. We have BBQ Boxes back in stock, perfect for the long weekend..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none transition-colors"
                rows={3}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-mid text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Post
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {PLATFORMS.find((p) => p.id === platform) && (() => {
                  const P = PLATFORMS.find((p) => p.id === platform)!;
                  return <P.icon className={`h-4 w-4 ${P.color}`} />;
                })()}
                <span className="text-sm font-semibold text-gray-700">Post Preview</span>
              </div>
              {generatedPost && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand transition-colors px-2 py-1 rounded border border-gray-200 hover:border-brand"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-3">
                {error}
              </div>
            )}

            {generatedPost ? (
              <>
                <div className="bg-gray-50 rounded-lg p-1 mb-2">
                  <textarea
                    value={generatedPost}
                    onChange={(e) => handlePostEdit(e.target.value)}
                    className="w-full bg-transparent text-sm text-gray-800 leading-relaxed resize-none focus:outline-none p-2 min-h-[200px]"
                    placeholder="Your generated post will appear here..."
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className={charWarning ? 'text-amber-500 font-medium' : ''}>
                    {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars
                  </span>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-1 hover:text-brand transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate
                  </button>
                </div>
              </>
            ) : (
              <div className="min-h-[200px] flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                <Sparkles className="h-8 w-8 text-gray-200" />
                <p>Fill in the options and hit <strong className="text-gray-500">Generate Post</strong></p>
              </div>
            )}
          </div>

          {generatedPost && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Post to</p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href="https://www.facebook.com/profile.php?id=61574996320860"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Facebook className="h-4 w-4" /> Open Facebook
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Instagram className="h-4 w-4" /> Open Instagram
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-2">Copy the post above, then paste it into the platform.</p>
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
      )}
    </div>
  );
}
