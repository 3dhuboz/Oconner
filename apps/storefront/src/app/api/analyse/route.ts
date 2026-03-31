export const runtime = 'edge';

const PROMPT = `Analyse this meat/food image. Respond ONLY with a valid JSON object — no markdown, no code fences.
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
If no meat is clearly visible, set cutName to "No meat detected" and fill others with "N/A".`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'AI not configured' }, { status: 503 });
  }

  const { base64, mimeType } = await req.json() as { base64: string; mimeType: string };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://oconner.com.au',
      'X-Title': "O'Connor Agriculture",
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content ?? '';

  try {
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Parse failed' }, { status: 500 });
  }
}
