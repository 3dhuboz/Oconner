const fetch = require('node-fetch');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function generateText(apiKey, prompt, options = {}) {
  const model = options.model || 'google/gemini-2.5-flash';
  const maxTokens = options.maxTokens || 1024;

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pennywiseit.com.au',
      'X-Title': 'Penny Wise I.T SimpleWebsite'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function generateImage(apiKey, prompt) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pennywiseit.com.au',
      'X-Title': 'Penny Wise I.T SimpleWebsite'
    },
    body: JSON.stringify({
      model: 'openai/dall-e-3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image API error: ${err}`);
  }

  const data = await res.json();
  // Extract image URL from response content
  const content = data.choices?.[0]?.message?.content || '';
  // If the response contains a URL, extract it; otherwise return the raw content
  const urlMatch = content.match(/https?:\/\/[^\s"')]+/);
  return urlMatch ? urlMatch[0] : content;
}

module.exports = { generateText, generateImage };
