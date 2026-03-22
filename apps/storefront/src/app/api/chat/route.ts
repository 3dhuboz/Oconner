export const runtime = 'edge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://oconner-api.steve-700.workers.dev';

async function getLiveContext(): Promise<string> {
  try {
    const [productsRes, daysRes] = await Promise.all([
      fetch(`${API_URL}/api/products?active=true`),
      fetch(`${API_URL}/api/delivery-days?upcoming=true`),
    ]);

    let productInfo = '';
    if (productsRes.ok) {
      const products = await productsRes.json() as any[];
      const active = products.filter((p: any) => p.active);
      const cuts = active.filter((p: any) => !p.isMeatPack && p.fixedPrice);
      const boxes = active.filter((p: any) => p.isMeatPack);
      const perKg = active.filter((p: any) => !p.isMeatPack && p.pricePerKg && !p.fixedPrice);

      if (boxes.length > 0) {
        productInfo += '\n\nBEEF BOXES (include free delivery over $100):\n';
        productInfo += boxes.map((p: any) => `- ${p.name}: $${((p.fixedPrice ?? 0) / 100).toFixed(2)} — ${p.description}`).join('\n');
      }
      if (cuts.length > 0) {
        productInfo += '\n\nINDIVIDUAL CUTS (fixed price per pack):\n';
        productInfo += cuts.map((p: any) => {
          const price = `$${((p.fixedPrice ?? 0) / 100).toFixed(2)}`;
          const tips = p.cookingTips ? ` | Cooking: ${p.cookingTips}` : '';
          const stock = p.stockOnHand > 0 ? ' (In Stock)' : ' (SOLD OUT)';
          return `- ${p.name}: ${price}${stock} — ${p.description}${tips}`;
        }).join('\n');
      }
      if (perKg.length > 0) {
        productInfo += '\n\nPER-KG PRODUCTS:\n';
        productInfo += perKg.map((p: any) => `- ${p.name}: $${((p.pricePerKg ?? 0) / 100).toFixed(2)}/kg — ${p.description}`).join('\n');
      }
    }

    let deliveryInfo = '';
    if (daysRes.ok) {
      const days = await daysRes.json() as any[];
      const upcoming = days.filter((d: any) => d.active && d.date >= Date.now()).slice(0, 8);
      if (upcoming.length > 0) {
        deliveryInfo += '\n\nUPCOMING DELIVERY DAYS:\n';
        deliveryInfo += upcoming.map((d: any) => {
          const date = new Date(d.date);
          const dateStr = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
          const spotsLeft = (d.maxOrders ?? 40) - (d.orderCount ?? 0);
          const type = d.type === 'pickup' ? `MARKET DAY PICKUP at ${d.marketLocation || d.zones}` : `Delivery to: ${d.zones || 'All areas'}`;
          return `- ${dateStr}: ${type} (${spotsLeft} spots left)`;
        }).join('\n');
      }
    }

    return productInfo + deliveryInfo;
  } catch (err) {
    console.error('Failed to fetch live context:', err);
    return '';
  }
}

function buildSystemPrompt(liveContext: string): string {
  return `You are the O'Connor Agriculture Beef Guide — a warm, knowledgeable assistant for O'Connor Agriculture, a first-generation family-owned grass-fed beef farm from Calliope and the Boyne Valley, QLD, Australia.

About O'Connor Agriculture:
- Family-owned farm using regenerative management practices
- Grass fed and finished beef from naturally managed pastures in the Boyne Valley, QLD
- Tagline: "Good for the land. Good for the community. Good for you."
- All beef is locally raised, grass fed, and naturally healthy with no inputs
- Website: oconnoragriculture.com.au

Pricing:
- Delivery: FREE on orders over $100, $10 delivery fee under $100
- Market day pickups: no delivery fee
- No GST on goods
${liveContext}

Your role:
1. Answer questions about beef cuts, cooking methods, prices, delivery areas and dates
2. Use the LIVE DATA above for current prices, stock availability, and delivery schedules — never guess prices
3. Help customers choose the right product for their needs
4. If a product is SOLD OUT, let them know and suggest alternatives
5. Keep responses concise — 2-3 sentences unless explaining cooking techniques
6. For ordering, direct them to oconnoragriculture.com.au/shop
7. For delivery schedule, direct them to oconnoragriculture.com.au/delivery-days

Always be warm, friendly, and conversational with a rural Australian tone. Never make up information.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ reply: "I'm not fully set up yet — please message us on Facebook to ask your question!" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { messages } = await req.json() as { messages: { role: string; content: string }[] };

    // Fetch live product and delivery data
    const liveContext = await getLiveContext();
    const systemPrompt = buildSystemPrompt(liveContext);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oconnoragriculture.com.au',
        'X-Title': "O'Connor Agriculture",
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
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
