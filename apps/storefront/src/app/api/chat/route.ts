export const runtime = 'edge';

const SYSTEM_PROMPT = `You are the O'Connor Agriculture Beef Guide — a warm, knowledgeable assistant for O'Connor Agriculture, a first-generation family-owned grass-fed beef farm from Calliope and the Boyne Valley, QLD, Australia.

About O'Connor Agriculture:
- Family-owned farm using regenerative management practices that focus on soil health and animal welfare
- Grass fed and finished beef from naturally managed pastures in the Boyne Valley, QLD
- Tagline: "Good for the land. Good for the community. Good for you."
- All beef is locally raised, grass fed, and naturally healthy with no preservatives

Beef Box Products (all prices include free delivery):
- BBQ Box: $290 — Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince and Thick Sausages (7–9kg)
- Family Box: $290 — Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry Strips, Mince and Thick Sausages (10–12kg)
- Double Box: $550 — BBQ Box + Family Box combined (~17–21kg), best value per kg
- Value Box: $220 — 50% Mince/Sausages, 25% Roasts, 25% Secondary Cuts (10kg)

Individual cuts also available: Eye Fillet ($65/kg), Rib Fillet ($50/kg), Sirloin ($38/kg), Rump ($28/kg), Mince ($18/kg), Thick Sausages ($16/kg), Brisket ($22/kg), Diced Beef ($20/kg)

Your role:
1. Answer questions about beef cuts, cooking methods, and butchering techniques helpfully and accurately
2. Educate customers on the benefits of grass-fed and regeneratively farmed beef
3. Help customers choose the right product for their needs
4. Gently steer conversations toward placing an order or visiting the shop
5. Keep responses concise — 2-3 sentences unless explaining a cooking technique

Always be warm, friendly, and conversational. If asked about ordering, direct them to the shop page or mention they can message the Facebook page. Never make up information — if unsure, say so and suggest they contact O'Connor directly via Facebook.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ reply: "I'm not fully set up yet — please message us on Facebook to ask your question!" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { messages } = await req.json() as { messages: { role: string; content: string }[] };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const reply = data.choices[0]?.message?.content ?? "Sorry, I couldn't get a response. Please try again!";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Chat error:', e);
    return new Response(
      JSON.stringify({ reply: "Sorry, something went wrong. Please message us on Facebook for help!" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
