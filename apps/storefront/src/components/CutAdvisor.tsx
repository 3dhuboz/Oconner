'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Sparkles, ChefHat, Thermometer, Clock, Lightbulb, RefreshCw, X } from 'lucide-react';

interface CutResult {
  cutName: string;
  confidence: string;
  cookingMethod: string;
  portionSize: string;
  cookingTemp: string;
  cookingTime: string;
  flavorNotes: string;
  alternatives: string[];
  tips: string;
}

const DEMO_RESULT: CutResult = {
  cutName: 'Beef Ribeye Steak',
  confidence: 'High',
  cookingMethod: 'Pan-sear then oven finish',
  portionSize: '300–400g per serve',
  cookingTemp: '57°C (medium-rare)',
  cookingTime: '3–4 min each side + 5 min rest',
  flavorNotes: 'Rich, buttery marbling with deep beefy flavour. The intramuscular fat melts during cooking for exceptional juiciness.',
  alternatives: ['Scotch Fillet', 'Beef Striploin', 'T-Bone Steak'],
  tips: 'Bring to room temperature 30 min before cooking. Sear on high heat, then rest on a wire rack — never a flat plate.',
};

async function analyseWithGemini(base64: string, mimeType: string): Promise<CutResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return DEMO_RESULT;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64 } },
            {
              text: `Analyse this food/meat image. Respond ONLY with a valid JSON object — no markdown, no code fences.
Fields required:
{
  "cutName": "name of the meat cut (or dish if cooked)",
  "confidence": "High | Medium | Low",
  "cookingMethod": "best cooking method for this cut",
  "portionSize": "typical portion size per serve",
  "cookingTemp": "ideal internal temperature",
  "cookingTime": "estimated cooking time",
  "flavorNotes": "brief flavour and texture description",
  "alternatives": ["2–3 similar alternative cuts available"],
  "tips": "single most important cooking tip"
}
If no meat is clearly visible, set cutName to "No meat detected" and fill others with "N/A".`,
            },
          ],
        }],
      }),
    }
  );

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim()) as CutResult;
  } catch {
    return DEMO_RESULT;
  }
}

const CONFIDENCE_COLORS: Record<string, string> = {
  High: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-red-100 text-red-700',
};

export default function CutAdvisor() {
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [result, setResult] = useState<CutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      setImageMime(file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) processFile(f);
  };

  const handleAnalyse = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const base64 = image.split(',')[1];
      const res = await analyseWithGemini(base64, imageMime);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setImage(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <section className="py-20 px-4 bg-gray-950 text-white relative overflow-hidden">
      {/* subtle meat texture background hint */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'url(https://butcher-storefront.pages.dev/hero-cows.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 bg-gray-950/90" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-900/40 border border-red-700/40 text-red-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI Powered
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wide mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            🥩 AI Cut Advisor
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Upload a photo of any meat dish and our AI will identify the cut, suggest the perfect cooking method, ideal temperature, and alternatives if it&apos;s unavailable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload panel */}
          <div className="space-y-4">
            {!image ? (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all min-h-64 ${
                  dragging
                    ? 'border-red-400 bg-red-900/20'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-white/5'
                }`}
              >
                <Upload className="h-12 w-12 text-gray-500 mb-4" />
                <p className="font-semibold text-gray-300 mb-1">Drop your photo here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <p className="text-xs text-gray-600 mt-3">JPG, PNG, WEBP up to 10MB</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden min-h-64">
                <img src={image} alt="Upload" className="w-full h-64 object-cover" />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <button
              onClick={handleAnalyse}
              disabled={!image || loading}
              className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Identify This Cut
                </>
              )}
            </button>

            {!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !result && (
              <p className="text-xs text-gray-600 text-center">
                Demo mode — add <code className="text-gray-400">NEXT_PUBLIC_GEMINI_API_KEY</code> to enable live AI analysis
              </p>
            )}
          </div>

          {/* Results panel */}
          <div>
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-3 text-gray-600">
                <ChefHat className="h-16 w-16" />
                <p className="font-medium text-gray-500">Upload a photo to get started</p>
                <p className="text-sm text-gray-600 max-w-xs">
                  Works with raw cuts, cooked dishes, BBQ plates — anything with meat
                </p>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-red-900 border-t-red-500 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-2xl">🥩</span>
                </div>
                <p className="text-gray-400 font-medium">Analysing your cut…</p>
                <p className="text-sm text-gray-600">Identifying cut, method &amp; cooking guide</p>
              </div>
            )}

            {result && (
              <div className="space-y-3 animate-in fade-in duration-500">
                {/* Cut name + confidence */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Identified Cut</p>
                      <h3 className="text-xl font-bold text-white">{result.cutName}</h3>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${CONFIDENCE_COLORS[result.confidence] ?? 'bg-gray-700 text-gray-300'}`}>
                      {result.confidence} confidence
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{result.flavorNotes}</p>
                </div>

                {/* Cooking stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-red-400 mb-1">
                      <ChefHat className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Method</span>
                    </div>
                    <p className="text-sm text-white font-medium">{result.cookingMethod}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                      <Thermometer className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Temp</span>
                    </div>
                    <p className="text-sm text-white font-medium">{result.cookingTemp}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Time</span>
                    </div>
                    <p className="text-sm text-white font-medium">{result.cookingTime}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-green-400 mb-1">
                      <span className="text-xs">🍽️</span>
                      <span className="text-xs font-semibold uppercase tracking-wider">Portion</span>
                    </div>
                    <p className="text-sm text-white font-medium">{result.portionSize}</p>
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-amber-900/30 border border-amber-700/30 rounded-xl p-3 flex gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-200">{result.tips}</p>
                </div>

                {/* Alternatives */}
                {result.alternatives?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Available Alternatives</p>
                    <div className="flex flex-wrap gap-2">
                      {result.alternatives.map((alt) => (
                        <span key={alt} className="bg-brand/20 text-brand-light text-xs font-medium px-2.5 py-1 rounded-full border border-brand/30">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={reset}
                  className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
                >
                  Try another photo →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
