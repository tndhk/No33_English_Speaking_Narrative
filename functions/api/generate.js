import Ajv from 'ajv';

// Initialize JSON Schema validator
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false
});

// Define formal JSON Schema based on spec.md requirements
const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['narrative_en', 'key_phrases', 'alternatives', 'recall_test'],
  properties: {
    narrative_en: {
      type: 'string',
      minLength: 1,
      description: 'Main English narrative (5-8 sentences for Normal length, ±1 tolerance)'
    },
    key_phrases: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      description: 'Key phrases from the narrative (1-5 items)',
      items: {
        type: 'object',
        required: ['phrase_en', 'meaning_ja', 'usage_hint_ja'],
        properties: {
          phrase_en: {
            type: 'string',
            minLength: 1,
            description: 'English phrase'
          },
          meaning_ja: {
            type: 'string',
            minLength: 1,
            description: 'Japanese meaning'
          },
          usage_hint_ja: {
            type: 'string',
            minLength: 1,
            description: 'Brief usage hint in Japanese'
          }
        },
        additionalProperties: false
      }
    },
    alternatives: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      description: 'Alternative expressions (1-2 items)',
      items: {
        type: 'object',
        required: ['original_en', 'alternative_en', 'nuance_ja'],
        properties: {
          original_en: {
            type: 'string',
            minLength: 1,
            description: 'Original expression from narrative'
          },
          alternative_en: {
            type: 'string',
            minLength: 1,
            description: 'Alternative expression'
          },
          nuance_ja: {
            type: 'string',
            minLength: 1,
            description: 'Explanation of nuance difference'
          }
        },
        additionalProperties: false
      }
    },
    recall_test: {
      type: 'object',
      required: ['prompt_ja', 'expected_points_en'],
      description: 'Recall test for memorization',
      properties: {
        prompt_ja: {
          type: 'string',
          minLength: 1,
          description: '3 key points in Japanese for reproduction'
        },
        expected_points_en: {
          type: 'array',
          minItems: 2,
          maxItems: 4,
          description: 'Expected answer points (2-4 items)',
          items: {
            type: 'string',
            minLength: 1
          }
        }
      },
      additionalProperties: false
    },
    pronunciation: {
      type: 'object',
      description: 'Optional word pronunciation guide',
      properties: {
        word: {
          type: 'string',
          minLength: 1,
          description: 'Word to pronounce'
        },
        ipa: {
          type: 'string',
          minLength: 1,
          description: 'IPA phonetic notation'
        },
        tip_ja: {
          type: 'string',
          minLength: 1,
          description: 'Pronunciation tip in Japanese'
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

// Compile schema validator
const validate = ajv.compile(jsonSchema);

// Helper function to count sentences
function countSentences(text) {
  return (text.match(/[.!?]+/g) || []).length;
}

// Helper function to count Japanese characters
function getJapaneseCharCount(text) {
  return (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;
}

// Comprehensive validation function with detailed logging
function validateOutput(jsonData, settings = {}) {
  const errors = [];
  const warnings = [];
  const logContext = {
    timestamp: new Date().toISOString(),
    schemaVersion: '1.0',
    validationType: 'comprehensive'
  };

  // Step 1: Schema validation using ajv
  console.log('[VALIDATION] Starting JSON schema validation');
  const isSchemaValid = validate(jsonData);

  if (!isSchemaValid) {
    console.error('[VALIDATION] Schema validation failed', {
      ...logContext,
      errors: validate.errors,
      data: jsonData
    });

    // Collect all schema validation errors
    if (validate.errors) {
      validate.errors.forEach(err => {
        const path = err.instancePath || 'root';
        const message = `${path || 'root'}: ${err.message}`;
        errors.push(message);
      });
    }
  } else {
    console.log('[VALIDATION] Schema validation passed');
  }

  // Step 2: Sentence count validation (based on settings)
  if (isSchemaValid && jsonData.narrative_en) {
    const sentenceCount = countSentences(jsonData.narrative_en);
    let expectedRange = [5, 8]; // Default "Normal"

    if (settings.length === 'Short') {
      expectedRange = [3, 4];
    } else if (settings.length === 'Long') {
      expectedRange = [10, Infinity];
    }

    const tolerance = 1;
    const minExpected = expectedRange[0] - tolerance;
    const maxExpected = expectedRange[1] + tolerance;

    console.log('[VALIDATION] Sentence count check', {
      sentenceCount,
      expectedRange,
      tolerance,
      valid: sentenceCount >= minExpected && sentenceCount <= maxExpected
    });

    if (sentenceCount < minExpected || sentenceCount > maxExpected) {
      errors.push(
        `Sentence count (${sentenceCount}) outside acceptable range ${minExpected}-${maxExpected} for "${settings.length || 'Normal'}" length setting`
      );
    }
  }

  // Step 3: Japanese character validation (max 10%)
  if (isSchemaValid && jsonData.narrative_en) {
    const japaneseCharCount = getJapaneseCharCount(jsonData.narrative_en);
    const totalCharCount = jsonData.narrative_en.length;
    const japanesePercent = totalCharCount > 0 ? (japaneseCharCount / totalCharCount) * 100 : 0;

    console.log('[VALIDATION] Japanese character check', {
      japaneseCharCount,
      totalCharCount,
      japanesePercent: japanesePercent.toFixed(2) + '%',
      maxAllowed: '10%'
    });

    if (japanesePercent > 10) {
      errors.push(
        `Japanese characters exceed limit: ${japanesePercent.toFixed(2)}% (max 10%)`
      );
    }
  }

  // Step 4: Key phrases field validation
  if (isSchemaValid && Array.isArray(jsonData.key_phrases)) {
    console.log('[VALIDATION] Validating key_phrases fields');
    jsonData.key_phrases.forEach((phrase, i) => {
      if (!phrase.phrase_en?.trim()) {
        errors.push(`key_phrases[${i}]: phrase_en is empty`);
      }
      if (!phrase.meaning_ja?.trim()) {
        errors.push(`key_phrases[${i}]: meaning_ja is empty`);
      }
      if (!phrase.usage_hint_ja?.trim()) {
        errors.push(`key_phrases[${i}]: usage_hint_ja is empty`);
      }
    });
  }

  // Step 5: Alternatives field validation
  if (isSchemaValid && Array.isArray(jsonData.alternatives)) {
    console.log('[VALIDATION] Validating alternatives fields');
    jsonData.alternatives.forEach((alt, i) => {
      if (!alt.original_en?.trim()) {
        errors.push(`alternatives[${i}]: original_en is empty`);
      }
      if (!alt.alternative_en?.trim()) {
        errors.push(`alternatives[${i}]: alternative_en is empty`);
      }
      if (!alt.nuance_ja?.trim()) {
        errors.push(`alternatives[${i}]: nuance_ja is empty`);
      }
    });
  }

  // Step 6: Recall test field validation
  if (isSchemaValid && jsonData.recall_test) {
    console.log('[VALIDATION] Validating recall_test fields');
    if (!jsonData.recall_test.prompt_ja?.trim()) {
      errors.push('recall_test.prompt_ja is empty');
    }
    if (!jsonData.recall_test.expected_points_en?.every(point => point?.trim())) {
      errors.push('recall_test.expected_points_en contains empty values');
    }
  }

  // Log final validation result
  const isValid = errors.length === 0;
  console.log('[VALIDATION] Validation complete', {
    ...logContext,
    isValid,
    errorCount: errors.length,
    warningCount: warnings.length
  });

  if (!isValid) {
    console.error('[VALIDATION] Validation errors:', errors);
  }

  return {
    isValid,
    errors,
    warnings,
    metadata: logContext
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
async function generateWithFallback(systemPrompt, env, settings = {}) {
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

      // Validate against schema with settings
      const validation = validateOutput(jsonData, settings);
      if (!validation.isValid) {
        const errorDetails = {
          provider: provider.name,
          errors: validation.errors,
          timestamp: validation.metadata.timestamp
        };
        console.error('[VALIDATION] Validation failed for provider', errorDetails);
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

    const systemPromptTemplate = `# Role
You are an expert English writing coach for Japanese learners (TOEIC 400-600).
Your goal is to transform a user's personal experience or thoughts into a natural, memorable English narrative.

# Output Format
You MUST output in JSON format exactly following the schema below. No other text is allowed outside the JSON block.

# JSON Schema
{
  "narrative_en": "string (The main English narrative. Number of sentences follows the 'length' setting.)",
  "key_phrases": [
    {
      "phrase_en": "string",
      "meaning_ja": "string",
      "usage_hint_ja": "string (Brief tip)"
    }
  ],
  "alternatives": [
    {
      "original_en": "string",
      "alternative_en": "string",
      "nuance_ja": "string (Brief explanation of the difference)"
    }
  ],
  "recall_test": {
    "prompt_ja": "string (3 key points in Japanese for reproduction)",
    "expected_points_en": ["string", "string"]
  },
  "pronunciation": {
    "word": "string",
    "ipa": "string",
    "tip_ja": "string"
  }
}

# Rules
1. narrative_en: Use natural, modern English. Avoid overly academic terms unless 'formal' tone is selected.
2. key_phrases: 3-5 items. Focus on practical expressions used in the narrative.
3. alternatives: Max 2 items. Provide subtle nuance differences.
4. recall_test: prompt_ja should NOT be a word-for-word translation, but rather the essence of what needs to be said.
5. NO Japanese in narrative_en.
6. Match the requested tone (Casual/Business/Formal) and length (Short: 3-4, Normal: 5-8, Long: 10+).

# Context
- Category: ${category}
- Tone: ${settings.tone || 'Business'}
- Length: ${settings.length || 'Normal'}
- User Inputs:
${answers.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}`;

    console.log('Using constructed system prompt');
    const resultText = await generateWithFallback(systemPromptTemplate, env, settings);

    return new Response(resultText, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error in generate:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
