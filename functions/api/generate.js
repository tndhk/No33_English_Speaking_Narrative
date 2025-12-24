// Validation function for output schema
function validateOutput(jsonData) {
  const errors = [];

  // Check required keys
  if (!jsonData.narrative_en) errors.push('Missing narrative_en');
  if (!Array.isArray(jsonData.key_phrases) || jsonData.key_phrases.length === 0) {
    errors.push('key_phrases must be non-empty array');
  }
  if (!Array.isArray(jsonData.alternatives) || jsonData.alternatives.length === 0) {
    errors.push('alternatives must be non-empty array');
  }
  if (!jsonData.recall_test || !jsonData.recall_test.prompt_ja || !Array.isArray(jsonData.recall_test.expected_points_en)) {
    errors.push('recall_test must have prompt_ja and expected_points_en array');
  }

  // Validate key_phrases structure
  if (Array.isArray(jsonData.key_phrases)) {
    for (let i = 0; i < jsonData.key_phrases.length; i++) {
      const phrase = jsonData.key_phrases[i];
      if (!phrase.phrase_en || !phrase.meaning_ja || !phrase.usage_hint_ja) {
        errors.push(`key_phrases[${i}] missing required fields (phrase_en, meaning_ja, usage_hint_ja)`);
      }
    }
  }

  // Validate alternatives structure
  if (Array.isArray(jsonData.alternatives)) {
    for (let i = 0; i < jsonData.alternatives.length; i++) {
      const alt = jsonData.alternatives[i];
      if (!alt.original_en || !alt.alternative_en || !alt.nuance_ja) {
        errors.push(`alternatives[${i}] missing required fields (original_en, alternative_en, nuance_ja)`);
      }
    }
  }

  // Check narrative_en for excessive Japanese
  const japaneseCharCount = (jsonData.narrative_en || '').match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g)?.length || 0;
  const totalCharCount = jsonData.narrative_en?.length || 0;
  if (japaneseCharCount > totalCharCount * 0.1) {
    errors.push('narrative_en contains too much Japanese text');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Call Gemini API
async function callGemini(systemPrompt, env) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${env.GEMINI_API_KEY}`;
  console.log('Calling Gemini API...');

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Call DeepSeek API
async function callDeepSeek(systemPrompt, env) {
  console.log('Calling DeepSeek API...');

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: systemPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Grok API
async function callGrok(systemPrompt, env) {
  console.log('Calling Grok API...');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4-fast',
      messages: [
        { role: 'user', content: systemPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Main function with fallback logic
async function generateWithFallback(systemPrompt, env) {
  const providers = [
    { name: 'Gemini', fn: () => callGemini(systemPrompt, env) },
    { name: 'DeepSeek', fn: () => callDeepSeek(systemPrompt, env) },
    { name: 'Grok', fn: () => callGrok(systemPrompt, env) }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting with ${provider.name}...`);
      const resultText = await provider.fn();

      // Parse and validate output
      let jsonData;
      try {
        jsonData = JSON.parse(resultText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

      // Validate against schema
      const validation = validateOutput(jsonData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }

      console.log(`${provider.name} succeeded with valid output`);
      return resultText;

    } catch (error) {
      console.error(`${provider.name} failed:`, error.message);

      // If this is the last provider, throw the error
      if (provider === providers[providers.length - 1]) {
        throw new Error(`All providers failed. Last error: ${error.message}`);
      }

      // Otherwise, continue to next provider
      continue;
    }
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { category, answers, settings } = await request.json();
    console.log('Request received:', { category, answers, settings });

    const systemPrompt = `You are an expert English writing coach for Japanese learners (TOEIC 400-600).
Transform the user's experience into a natural, memorable English narrative using simple, high-frequency vocabulary.

CRITICAL: Output ONLY valid JSON matching this EXACT schema:
{
  "narrative_en": "The main English narrative. ${settings.length === 'Short' ? '3-4' : settings.length === 'Long' ? '10+' : '5-8'} sentences. Tone: ${settings.tone || 'Business'}.",
  "key_phrases": [
    { "phrase_en": "key expression from narrative", "meaning_ja": "日本語の意味", "usage_hint_ja": "使い方のヒント" }
  ],
  "alternatives": [
    { "original_en": "phrase from narrative", "alternative_en": "alternative expression", "nuance_ja": "ニュアンスの違い" }
  ],
  "recall_test": {
    "prompt_ja": "ナラティブの要点を3点程度で日本語で記述",
    "expected_points_en": ["key point 1", "key point 2"]
  },
  "pronunciation": { "word": "difficult word", "ipa": "/IPA/", "tip_ja": "発音のコツ" }
}

Requirements:
- key_phrases: 3-5 items with ALL three fields (phrase_en, meaning_ja, usage_hint_ja)
- alternatives: 1-2 items with ALL three fields
- recall_test: REQUIRED with prompt_ja and expected_points_en array
- NO Japanese in narrative_en
- Category: ${category}
- User context: ${answers.join(' ')}`;

    const resultText = await generateWithFallback(systemPrompt, env);

    return new Response(resultText, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
