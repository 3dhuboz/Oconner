interface Env {
  OPENAI_API_KEY: string;
}

interface GenerateRequest {
  brand: string;
  platform: string;
  postType: string;
  tone: string;
  extraContext?: string;
}

const BRAND_CONTEXTS: Record<string, string> = {
  oconnor: `
Brand: O'Connor Agriculture
Location: Calliope & Boyne Valley, QLD, Australia
Business: First generation family-owned grass fed beef farm
Products: BBQ Box ($290, 7-9kg), Family Box ($290, 10-12kg), Double Box ($550), Value Box ($220, 10kg), plus individual cuts
Tagline: "Good for the land. Good for the community. Good for you."
Values: Regenerative farming, soil health, animal welfare, community, transparency
Contact: orders@oconnoragriculture.com.au | Facebook: O'Connor Agriculture
Tone: Warm, authentic, community-focused, proud of their land`,

  pennywise: `
Brand: Pennywise IT
Location: Queensland, Australia
Business: IT services and technology solutions
Tone: Professional, friendly, solutions-focused, approachable`,
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not configured. Add it to Cloudflare Pages environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: GenerateRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { brand, platform, postType, tone, extraContext } = body;
  const brandContext = BRAND_CONTEXTS[brand] || BRAND_CONTEXTS.oconnor;

  const platformGuide: Record<string, string> = {
    facebook: 'Facebook post: conversational, can be longer (150-300 words), emojis welcome, end with a call to action',
    instagram: 'Instagram caption: punchy opener, 2-3 short paragraphs, 5-10 relevant hashtags at the end',
    linkedin: 'LinkedIn post: professional but personal, story-driven, 100-200 words, no hashtags spam',
  };

  const postTypes: Record<string, string> = {
    product: 'Promote a specific product or beef box. Highlight value, quality, and encourage ordering.',
    farm_update: 'Share an authentic farm update — what\'s happening on the property, the cattle, the land.',
    seasonal: 'Seasonal post tied to weather, holidays, or seasonal cooking. Make it timely and relevant.',
    recipe: 'Share a simple recipe idea using their beef. Make it accessible and appetising.',
    community: 'Community-focused post — local pride, supporting local, family values.',
    educational: 'Educate followers about grass fed beef, regenerative farming, or why their beef is different.',
  };

  const systemPrompt = `You are a social media content writer specialising in Australian agriculture and local food businesses.
${brandContext}

Write a ${platformGuide[platform] || platformGuide.facebook}.
Post type: ${postTypes[postType] || postTypes.product}
Tone: ${tone || 'warm and authentic'}
${extraContext ? `Additional context: ${extraContext}` : ''}

Rules:
- Write in Australian English
- Sound genuine and human, not corporate or generic
- Do NOT use clichés like "In today's world" or "We are excited to announce"
- Keep it real — speak as the farmer/business owner would
- Output ONLY the post content, no explanations or preamble`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

    const data = await res.json() as { choices: { message: { content: string } }[] };
    const post = data.choices[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ post }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
