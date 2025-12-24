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

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response data:', JSON.stringify(data).substring(0, 500));

    const resultText = data.candidates[0].content.parts[0].text;

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
