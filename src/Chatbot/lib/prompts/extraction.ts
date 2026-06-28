export const EXTRACTION_PROMPT = `Extract structured school information from the following HTML content.

Return ONLY valid JSON with these exact fields:
{
  "curricula": ["IB", "British", "American", "Australian", "Thai", "Other"],
  "age_from": <integer, youngest age accepted>,
  "age_to": <integer, oldest age accepted>,
  "fees_min_usd": <integer, annual fees minimum in USD, null if not found>,
  "fees_max_usd": <integer, annual fees maximum in USD, null if not found>,
  "boarding": <boolean, true if boarding is available>,
  "description": "<2 sentence description of the school's unique qualities and strengths>"
}

Rules:
- curricula: only include from the allowed list above. Use "IB" for International Baccalaureate, "British" for UK curriculum, "American" for US curriculum.
- fees: convert to USD if in another currency (use approximate rates). Leave null if genuinely not found.
- age_from / age_to: use 3 and 18 as defaults for K-12 if not specified.
- description: focus on what makes the school distinctive. Be factual and concise.
- If information is missing or ambiguous, use null for numbers and make a reasonable inference for text.`;
