const { GoogleGenAI, Type } = require('@google/genai');

// Use the most capable model available
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const getAI = (apiKey) => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// ═══════════════════════════════════════════════════════════════
//  CUTTING-EDGE POST GENERATION
//  - Platform-specific algorithm knowledge
//  - Hook formulas (Pattern Interrupt, Open Loop, Controversy)
//  - Engagement psychology (curiosity gap, social proof, FOMO)
//  - Trending content formats per platform
//  - Optimal hashtag strategy per platform
// ═══════════════════════════════════════════════════════════════

const generateSocialPost = async (apiKey, topic, platform, businessName, businessType, tone, topPostExamples = []) => {
  const ai = getAI(apiKey);
  if (!ai) return { content: 'API Key missing. Configure in Social AI Settings.', hashtags: [] };

  const platformRulesMap = {
    Instagram: `
INSTAGRAM-SPECIFIC RULES (2025 Algorithm):
- First line MUST be a scroll-stopping hook (pattern interrupt, bold claim, or question)
- Use line breaks for readability — short punchy paragraphs (1-2 sentences max)
- Include a clear CTA (save this, share with a friend, comment below, link in bio)
- Emojis: use 3-6 strategically placed emojis, not clustered
- Hashtag strategy: 5-8 highly targeted hashtags. Mix: 2 broad (500K-5M posts), 3 niche (10K-500K posts), 2-3 micro-niche (<10K posts). NO banned or overused spam hashtags
- Carousel/Reel hooks perform 3x better — frame content as if it's a carousel or reel script when relevant
- End with a micro-CTA question to drive comments (the algorithm rewards comment velocity in first 30 min)
`,
    Facebook: `
FACEBOOK-SPECIFIC RULES (2025 Algorithm):
- First line MUST hook — Facebook truncates after ~3 lines so the hook is critical
- Longer-form storytelling performs best on Facebook (150-300 words ideal)
- Ask a genuine question — Facebook's algorithm heavily rewards comment-generating posts
- Use "Share if you agree" or "Tag someone who..." patterns for organic reach
- Emojis: use sparingly (2-4), Facebook's audience skews slightly more professional
- NO hashtags or max 1-2 branded ones — Facebook's algorithm doesn't reward hashtags like Instagram
- Native video/photo descriptions outperform link posts — write as if accompanying an image
- Controversy and opinion posts get 2-5x more reach than promotional content
`,
    TikTok: `
TIKTOK-SPECIFIC RULES (2025 Algorithm):
- This is a VIDEO SCRIPT / caption — write as if spoken on camera, not read
- First 3 words MUST stop the scroll — TikTok users swipe in 0.5 seconds
- Use "POV:", "Story time:", "I can't believe" style openers — they perform 4x better
- Keep caption under 150 characters — TikTok truncates and the hook must be visible
- Include 3-5 hashtags: 1 mega (#foryou or #fyp), 2 trending niche, 1 branded
- Write a VIDEO HOOK at the top as if speaking: what happens in the first 3 seconds of the video?
- TikTok rewards authenticity over polish — casual, raw, real beats production quality
- Include trending sound/audio suggestions if relevant to the topic
- End with a "duet this" or "comment your answer" CTA — interaction spikes algorithm reach
- Write in first person, conversational, fast-paced
`,
    LinkedIn: `
LINKEDIN-SPECIFIC RULES (2025 Algorithm):
- LinkedIn rewards thought leadership, professional insights, and personal stories
- First line (visible before "see more") MUST be compelling — make it a bold insight or counterintuitive claim
- Use short paragraphs (1-2 lines) with strategic line breaks for readability in feed
- Personal stories get 3x more engagement than pure promotional content — lead with "I used to think..."
- Hashtags: use 3-5 professional hashtags (e.g., #marketing #businessgrowth #entrepreneurship)
- End with a professional discussion prompt: "What's your take?", "Agree or disagree?"
- NO emojis in the first line — keep the opening professional; 1-3 emojis total is fine
- Optimal length: 150-300 words for feed posts; carousel-style numbered lists perform best
- Include specific data points, percentages, or timelines — professional readers trust specifics
- Tag 1-2 relevant people or companies if appropriate to extend reach
`
  };
  const platformRules = platformRulesMap[platform] || platformRulesMap.Instagram;

  // Build context from top-performing posts
  let performanceContext = '';
  if (topPostExamples.length > 0) {
    performanceContext = `
═══ THIS ACCOUNT'S TOP-PERFORMING POSTS ═══
(Study the style, tone, length, and hooks that ACTUALLY work for this audience. Your post should match this proven voice.)

${topPostExamples.map((p, i) => `${i + 1}. (engagement score: ${p.engagement}) "${p.text}"`).join('\n\n')}

CRITICAL: Match the writing style, tone, and length patterns from these winning posts. If short punchy posts work, write short. If storytelling works, tell a story. Let the DATA guide your voice.
`;
  }

  try {
    const prompt = `You are a world-class social media strategist and copywriter working for "${businessName}", a ${businessType} business.

VOICE & TONE: ${tone}
${performanceContext}
YOUR MISSION: Write a ${platform} post about "${topic}" that is engineered to maximise engagement, reach, and conversions.

${platformRules}

ADVANCED COPYWRITING TECHNIQUES TO APPLY:
1. HOOK FORMULA — Use one of: Pattern Interrupt ("Stop scrolling if..."), Open Loop ("Most people don't know this about..."), Contrarian Take ("Unpopular opinion:"), Social Proof ("We just hit..."), or Direct Address ("Hey ${businessType} lovers")
2. CURIOSITY GAP — Create tension between what the reader knows and what they want to know
3. EMOTIONAL TRIGGER — Tap into aspiration, belonging, FOMO, pride, or surprise
4. VALUE-FIRST — Lead with what the audience GETS, not what you're selling
5. CONVERSATIONAL — Write like you're texting a smart friend, not writing an essay

Return JSON with:
- "content": the full post text (properly formatted with line breaks as \\n)
- "hashtags": array of hashtag strings (follow the platform-specific rules above)`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    // Safely extract text — response.text can throw on blocked/empty responses
    let rawText;
    try { rawText = response.text; } catch (e) {
      console.error('[Generate Post] response.text threw:', e.message);
      return { content: 'Content generation was blocked. Try a different topic.', hashtags: [] };
    }

    if (!rawText) return { content: 'Empty response from AI. Try again.', hashtags: [] };

    const parsed = JSON.parse(rawText);
    // Ensure content is always a string (Gemini may return error objects)
    return {
      content: typeof parsed.content === 'string' ? parsed.content : (parsed.content?.message || JSON.stringify(parsed.content) || 'Generation failed.'),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter(h => typeof h === 'string') : []
    };
  } catch (error) {
    console.error('[Generate Post] Error:', error?.message || error);
    const msg = error?.message || String(error);
    if (msg.includes('API_KEY_INVALID') || msg.includes('401')) {
      return { content: 'Invalid API Key. Check your key in Settings.', hashtags: [] };
    }
    return { content: `AI Error: ${msg.substring(0, 120)}`, hashtags: [] };
  }
};

// ═══════════════════════════════════════════════════════════════
//  IMAGE GENERATION — Professional marketing visuals
// ═══════════════════════════════════════════════════════════════

const generateMarketingImage = async (apiKey, prompt) => {
  const ai = getAI(apiKey);
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: `Create a professional, scroll-stopping social media marketing image for a business: ${prompt}. Style: modern, clean, high-contrast, vibrant brand colours. Photography style with cinematic lighting. No text overlays. Suitable for Instagram/Facebook feed. Commercial quality, aspirational, lifestyle-focused.` }]
      },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Gemini Image Error:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
//  BEST POSTING TIMES — Algorithm-aware, data-driven
// ═══════════════════════════════════════════════════════════════

const analyzePostTimes = async (apiKey, businessType, location, postData = {}) => {
  const ai = getAI(apiKey);
  if (!ai) return 'API Key missing.';

  const { pastFbPosts = [], pastIgPosts = [] } = postData;
  const hasRealData = pastFbPosts.length > 0 || pastIgPosts.length > 0;

  // Build real timing analysis if we have data
  let realTimingBlock = '';
  if (hasRealData) {
    const allPosts = [
      ...pastFbPosts.map(p => ({ ...p, platform: 'Facebook' })),
      ...pastIgPosts.map(p => ({ ...p, platform: 'Instagram' }))
    ];
    const dayTime = {};
    for (const p of allPosts) {
      const key = `${p.platform}|${p.day}|${p.time}`;
      dayTime[key] = (dayTime[key] || { total: 0, count: 0 });
      dayTime[key].total += p.engagement;
      dayTime[key].count += 1;
    }
    const ranked = Object.entries(dayTime)
      .map(([k, v]) => ({ key: k, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    realTimingBlock = `
═══ ACTUAL POSTING DATA FROM THIS ACCOUNT ═══
Total posts analyzed: ${allPosts.length} (${pastFbPosts.length} FB, ${pastIgPosts.length} IG)

TOP PERFORMING TIME SLOTS (by avg engagement score):
${ranked.map((r, i) => { const [plat, day, time] = r.key.split('|'); return `${i + 1}. ${plat} — ${day} ${time} (avg score: ${r.avg})`; }).join('\n')}

IMPORTANT: Your analysis MUST reference this actual data. Tell the user EXACTLY which days/times work best for THEM based on their real engagement numbers.
`;
  }

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `You are a social media data scientist. ${hasRealData ? 'You have REAL engagement data from this specific account — use it as the PRIMARY basis for your analysis.' : 'Based on 2024-2025 research from Hootsuite, Sprout Social, Later, and Buffer:'}

BUSINESS: ${businessType} located in ${location}
${realTimingBlock}
Provide a detailed analysis of the BEST times to post on each platform.${hasRealData ? ' Lead with the ACTUAL data from this account, then supplement with industry research.' : ''}

FORMAT YOUR RESPONSE AS:

${hasRealData ? '📊 YOUR DATA SAYS:\n• [Reference actual top-performing slots from the data above]\n\n' : ''}📱 INSTAGRAM — Best Times:
• [Day]: [Time] — [Why this works${hasRealData ? ' — reference actual data' : ''}]
(3-5 time slots)

📘 FACEBOOK — Best Times:
• [Day]: [Time] — [Why this works${hasRealData ? ' — reference actual data' : ''}]
(3-5 time slots)

⚡ PRO TIPS:
• [2-3 tips${hasRealData ? ' based on patterns in this account\'s data' : ''}]

Be specific with times (e.g. "Tuesday 7:15 AM" not "mornings"). Use the ${location} local timezone.`
    });
    let text;
    try { text = response.text; } catch (e) {
      console.error('[Post Times] response.text threw:', e.message);
      return 'Could not analyze times — response was blocked.';
    }
    return text || 'Could not analyze times.';
  } catch (error) {
    console.error('[Post Times] Error:', error?.message || error);
    return 'Could not analyze times.';
  }
};

// ═══════════════════════════════════════════════════════════════
//  AI STRATEGIST — Deep competitive analysis & growth hacking
// ═══════════════════════════════════════════════════════════════

const generateRecommendations = async (apiKey, businessName, businessType, stats, postData = {}) => {
  const ai = getAI(apiKey);
  if (!ai) return 'API Key missing.';

  const engagementBenchmark = stats.engagement > 5 ? 'above average' : stats.engagement > 2 ? 'average' : 'below average';
  const reachToFollowerRatio = stats.followers > 0 ? ((stats.reach / stats.followers) * 100).toFixed(0) : 0;
  const postFrequency = stats.postsLast30Days > 20 ? 'high' : stats.postsLast30Days > 8 ? 'moderate' : 'low';

  const { pastFbPosts = [], pastIgPosts = [] } = postData;
  const hasRealData = pastFbPosts.length > 0 || pastIgPosts.length > 0;

  // Build real post analysis if available
  let postAnalysisBlock = '';
  if (hasRealData) {
    const allPosts = [
      ...pastFbPosts.map(p => ({ ...p, platform: 'Facebook' })),
      ...pastIgPosts.map(p => ({ ...p, platform: 'Instagram', message: p.caption }))
    ].sort((a, b) => b.engagement - a.engagement);

    const topPosts = allPosts.slice(0, 5);
    const worstPosts = allPosts.slice(-3);
    const avgEngagement = allPosts.length > 0 ? Math.round(allPosts.reduce((s, p) => s + p.engagement, 0) / allPosts.length) : 0;

    // Content length analysis
    const avgLength = Math.round(allPosts.reduce((s, p) => s + (p.message || '').length, 0) / allPosts.length);
    const topAvgLength = Math.round(topPosts.reduce((s, p) => s + (p.message || '').length, 0) / topPosts.length);

    postAnalysisBlock = `
═══ REAL POST PERFORMANCE DATA ═══
(Base ALL recommendations on this actual data — not generic advice)

${allPosts.length} POSTS ANALYZED (${pastFbPosts.length} Facebook, ${pastIgPosts.length} Instagram)
Average engagement score: ${avgEngagement}
Average post length: ${avgLength} chars | Top posts avg: ${topAvgLength} chars

TOP 5 POSTS (highest engagement):
${topPosts.map((p, i) => `${i + 1}. [${p.platform}] ${p.day} ${p.time} | Score: ${p.engagement} (👍${p.likes} 💬${p.comments} 🔁${p.shares || 0}) | "${(p.message || '').substring(0, 120)}"`).join('\n')}

WORST 3 POSTS (lowest engagement):
${worstPosts.map((p, i) => `${i + 1}. [${p.platform}] ${p.day} ${p.time} | Score: ${p.engagement} | "${(p.message || '').substring(0, 80)}"`).join('\n')}

YOUR AUDIT MUST: Reference specific posts from the data above. Explain WHY the top posts worked and WHY the worst ones failed. Base every recommendation on observable patterns.
`;
  }

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `You are an elite social media growth strategist hired to audit "${businessName}", a ${businessType} business.
${hasRealData ? 'You have ACTUAL post performance data — your analysis MUST reference this real data, not generic advice.' : ''}

CURRENT PERFORMANCE DATA:
- Followers: ${stats.followers.toLocaleString()}
- Monthly Reach: ${stats.reach.toLocaleString()} (${reachToFollowerRatio}% of followers — ${reachToFollowerRatio > 80 ? 'excellent' : reachToFollowerRatio > 30 ? 'decent' : 'needs improvement'})
- Engagement Rate: ${stats.engagement}% (${engagementBenchmark} for ${businessType} industry)
- Post Frequency: ${stats.postsLast30Days} posts/month (${postFrequency} frequency)
${postAnalysisBlock}
Perform a COMPREHENSIVE STRATEGIC AUDIT:

📊 PERFORMANCE DIAGNOSIS
- ${hasRealData ? 'Analyze what the TOP performing posts have in common (timing, length, tone, topic, format)' : 'What the numbers tell us about content-audience fit'}
- ${hasRealData ? 'Identify patterns in the WORST performing posts — what to stop doing' : 'Identify the biggest bottleneck'}

🚀 TOP 5 HIGH-IMPACT ACTIONS (ranked by expected ROI)
For each: What to do, why it works, expected impact
${hasRealData ? '- MUST reference actual patterns from the data above (e.g. "Your Tuesday morning posts get 3x more engagement — double down on this slot")' : ''}

📈 CONTENT MIX RECOMMENDATION
- Ideal pillar ratio, formats to prioritise, posting frequency

🎯 QUICK WINS (THIS WEEK)
- 3 immediate high-impact actions

💡 ADVANCED GROWTH TACTICS
- 2 cutting-edge strategies most businesses aren't using

Be specific to ${businessType}. ${hasRealData ? 'Reference actual post examples from the data.' : 'Give examples, not generic advice.'}`
    });
    let text;
    try { text = response.text; } catch (e) {
      console.error('[Recommendations] response.text threw:', e.message);
      return 'Unable to generate recommendations — response was blocked. Try again.';
    }
    return text || 'No recommendations generated.';
  } catch (error) {
    console.error('[Recommendations] Error:', error?.message || error);
    return `Unable to analyze stats: ${error?.message || 'Unknown error'}`;
  }
};

// ═══════════════════════════════════════════════════════════════
//  SMART AI SCHEDULER — Full content calendar with viral science
// ═══════════════════════════════════════════════════════════════

const generateSmartSchedule = async (apiKey, businessName, businessType, tone, stats, postsToGenerate = 7, researchData = {}) => {
  const ai = getAI(apiKey);
  if (!ai) return { posts: [], strategy: 'API Key missing.' };

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // ── BUILD RESEARCH ANALYSIS BLOCK ──
    const { pastFbPosts = [], pastIgPosts = [], scheduledPosts = [] } = researchData;
    const hasRealData = pastFbPosts.length > 0 || pastIgPosts.length > 0;

    // Analyze top-performing posts
    let performanceBlock = '';
    if (hasRealData) {
      const allPosts = [
        ...pastFbPosts.map(p => ({ ...p, platform: 'Facebook' })),
        ...pastIgPosts.map(p => ({ ...p, platform: 'Instagram', message: p.caption }))
      ].sort((a, b) => b.engagement - a.engagement);

      const topPosts = allPosts.slice(0, 3);
      const worstPosts = allPosts.slice(-2);

      // Analyze best days/times from real data
      const dayEngagement = {};
      const hourEngagement = {};
      for (const p of allPosts) {
        dayEngagement[p.day] = (dayEngagement[p.day] || { total: 0, count: 0 });
        dayEngagement[p.day].total += p.engagement;
        dayEngagement[p.day].count += 1;
        const hour = p.time;
        hourEngagement[hour] = (hourEngagement[hour] || { total: 0, count: 0 });
        hourEngagement[hour].total += p.engagement;
        hourEngagement[hour].count += 1;
      }

      const bestDays = Object.entries(dayEngagement)
        .map(([day, d]) => ({ day, avg: Math.round(d.total / d.count) }))
        .sort((a, b) => b.avg - a.avg);

      // Extract hashtags from top IG posts
      const topHashtags = {};
      for (const p of pastIgPosts.filter(p => p.engagement > 0)) {
        const tags = (p.caption || '').match(/#\w+/g) || [];
        for (const tag of tags) {
          topHashtags[tag.toLowerCase()] = (topHashtags[tag.toLowerCase()] || 0) + p.engagement;
        }
      }
      const bestHashtags = Object.entries(topHashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag]) => tag);

      performanceBlock = `
═══ REAL DATA ═══
TOP POSTS: ${topPosts.map((p, i) => `${i + 1}.[${p.platform}] ${p.day} ${p.time} score:${p.engagement} "${(p.message || '').substring(0, 60)}"`).join(' | ')}
WORST: ${worstPosts.map(p => `[${p.platform}] ${p.day} score:${p.engagement}`).join(' | ')}
BEST DAYS: ${bestDays.slice(0, 4).map(d => `${d.day}:${d.avg}`).join(', ')}
${bestHashtags.length > 0 ? `TOP HASHTAGS: ${bestHashtags.slice(0, 10).join(' ')}` : ''}
Analyzed: ${allPosts.length} posts
`;
    } else {
      performanceBlock = `
NOTE: No past post data available (Facebook not connected or no post history).
Use general best practices for ${businessType} businesses, but acknowledge this in your strategy.
`;
    }

    // Build scheduled posts awareness block
    let scheduleBlock = '';
    if (scheduledPosts.length > 0) {
      scheduleBlock = `
═══ ALREADY SCHEDULED POSTS (DO NOT overlap these dates/times) ═══
${scheduledPosts.map(p => `- ${new Date(p.scheduledFor).toLocaleDateString('en-AU')} ${new Date(p.scheduledFor).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} [${p.platform}] ${p.pillar ? `(${p.pillar})` : ''} ${p.topic}`).join('\n')}

CRITICAL: Schedule new posts AROUND these existing posts. Do NOT create posts on the same day/time.
If the schedule is getting dense, space new posts at least 1 day apart from existing ones.
`;
    }

    const prompt = `Data-driven social media strategist for "${businessName}" (${businessType}). Tone: ${tone}.
Date: ${now.toISOString().split('T')[0]}. Window: ${now.toISOString().split('T')[0]} to ${windowEnd.toISOString().split('T')[0]}.
Metrics: ${stats.followers} followers, ${stats.engagement}% engagement, ${stats.postsLast30Days} posts/30d.
${performanceBlock}${scheduleBlock}
Generate EXACTLY ${postsToGenerate} posts. ${hasRealData ? 'Base timing/style on real data above.' : 'Use optimal AU times.'}
Rules: Mix FB+IG. Pillars: 40% Value, 25% Engage, 20% Community, 15% Promo. ${scheduledPosts.length > 0 ? `Avoid ${scheduledPosts.length} existing scheduled slots.` : ''} Content must be specific to ${businessType}.

JSON: {"posts":[...], "strategy":"brief 1-2 sentence summary"}
Each post: platform, scheduledFor (ISO+10:00), topic, content (full caption), hashtags (IG only), imagePrompt, mediaType ("image" or "video" — use "video" for posts that would perform best as Reels/short video, typically 20-30% of posts), reasoning, pillar.`;

    console.log('[Smart Schedule] Calling Gemini API with model:', TEXT_MODEL);
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  scheduledFor: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  content: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imagePrompt: { type: Type.STRING },
                  mediaType: { type: Type.STRING },
                  reasoning: { type: Type.STRING },
                  pillar: { type: Type.STRING }
                }
              }
            },
            strategy: { type: Type.STRING }
          }
        }
      }
    });

    // Safely extract text — response.text can throw on blocked/empty responses
    let rawText;
    try {
      rawText = response.text;
    } catch (textErr) {
      console.error('[Smart Schedule] response.text threw:', textErr.message);
      const blockReason = response.candidates?.[0]?.finishReason || 'unknown';
      return { posts: [], strategy: `Content generation was blocked (reason: ${blockReason}). Try again.` };
    }

    if (!rawText) {
      console.error('[Smart Schedule] Empty response from Gemini');
      return { posts: [], strategy: 'Gemini returned an empty response. Try again.' };
    }

    const data = JSON.parse(rawText);
    console.log('[Smart Schedule] Response parsed — posts:', Array.isArray(data.posts) ? data.posts.length : 'NOT ARRAY', '| strategy length:', (data.strategy || '').length);
    // Sanitize every post field — Gemini may return objects instead of strings
    const safePosts = (Array.isArray(data.posts) ? data.posts : []).map(p => ({
      platform: typeof p.platform === 'string' ? p.platform : String(p.platform || 'Instagram'),
      scheduledFor: typeof p.scheduledFor === 'string' ? p.scheduledFor : new Date().toISOString(),
      topic: typeof p.topic === 'string' ? p.topic : (p.topic?.message || JSON.stringify(p.topic) || ''),
      content: typeof p.content === 'string' ? p.content : (p.content?.message || JSON.stringify(p.content) || ''),
      hashtags: Array.isArray(p.hashtags) ? p.hashtags.filter(h => typeof h === 'string') : [],
      imagePrompt: typeof p.imagePrompt === 'string' ? p.imagePrompt : '',
      mediaType: typeof p.mediaType === 'string' ? p.mediaType : 'image',
      reasoning: typeof p.reasoning === 'string' ? p.reasoning : (p.reasoning?.message || ''),
      pillar: typeof p.pillar === 'string' ? p.pillar : (p.pillar?.message || 'Value')
    }));
    const safeStrategy = typeof data.strategy === 'string' ? data.strategy : (data.strategy?.message || JSON.stringify(data.strategy) || '');
    return { posts: safePosts, strategy: safeStrategy };
  } catch (error) {
    console.error('[Smart Schedule] Error:', error?.message || error);
    return { posts: [], strategy: `Error: ${error?.message || 'Unknown error — check your Gemini API key and try again.'}` };
  }
};

module.exports = {
  generateSocialPost,
  generateMarketingImage,
  analyzePostTimes,
  generateRecommendations,
  generateSmartSchedule
};
