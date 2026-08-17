/**
 * Bedrock Llama classification service — with two layers of resilience.
 *
 * LAYER 1: Bedrock Llama API call with retry.
 * LAYER 2: Rule-based keyword fallback if Bedrock fails entirely.
 *
 * Swapped from Gemini to Amazon Bedrock Llama.
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// ─── Fixed Department Taxonomy ──────────────────────────────────────────────
const VALID_DEPARTMENTS = [
  'Sanitation',
  'Water Supply',
  'Electricity',
  'Roads & Infrastructure',
  'Health Services',
  'Police',
  'Fire Department',
  'General Grievance',
];

// ─── Keyword Sets for Rule-Based Fallback ───────────────────────────────────
const DEPARTMENT_KEYWORDS = {
  'Sanitation': ['garbage', 'trash', 'waste', 'rubbish', 'dump', 'sewage', 'sewer', 'drain', 'drainage', 'gutter', 'overflow', 'foul smell', 'stink', 'public toilet', 'latrine', 'landfill', 'municipal waste'],
  'Water Supply': ['water shortage', 'no water', 'water supply', 'tap water', 'pipeline', 'pipe leak', 'pipe burst', 'contaminated water', 'dirty water', 'water tank', 'borewell', 'water tanker', 'low water pressure', 'water cut'],
  'Electricity': ['power cut', 'power outage', 'electricity', 'voltage', 'transformer', 'streetlight', 'street light', 'fused', 'short circuit', 'electric wire', 'power meter', 'blackout', 'load shedding', 'electric pole', 'sparking wire'],
  'Roads & Infrastructure': ['pothole', 'road damage', 'broken road', 'footpath', 'pavement', 'bridge', 'culvert', 'construction debris', 'road block', 'damaged road', 'broken pavement'],
  'Health Services': ['hospital', 'clinic', 'ambulance', 'disease outbreak', 'epidemic', 'dengue', 'malaria', 'medical emergency', 'doctor', 'nurse', 'vaccination', 'primary health centre'],
  'Police': ['theft', 'robbery', 'crime', 'noise complaint', 'harassment', 'assault', 'traffic violation', 'illegal parking', 'stalking', 'safety concern', 'law and order'],
  'Fire Department': ['fire', 'burning', 'smoke', 'gas leak', 'explosion', 'cylinder blast', 'rescue'],
};

const URGENT_KEYWORDS = ['fire', 'flood', 'flooding', 'gas leak', 'electrocution', 'collapsed', 'drowning', 'emergency', 'life threatening'];
const FRUSTRATED_KEYWORDS = ['angry', 'furious', 'fed up', 'useless', 'pathetic', 'third time', 'no one is listening', 'disgusted'];

// System prompt instructing the model to output strict JSON
const SYSTEM_PROMPT = `You are a government complaint classification system. Analyze the citizen complaint (which may be a call transcript or a typed message) and extract structured information.

You MUST respond with a single, valid JSON object matching this schema exactly:
{
  "issue_type": "A short label for the type of issue (e.g. 'harassment', 'sewage overflow', 'power outage', 'pothole')",
  "department": "The government department to route this to. Must be exactly one of: ${VALID_DEPARTMENTS.join(', ')}",
  "location": "The location or area mentioned in the complaint. Use 'Not specified' if no location is mentioned.",
  "urgency": "How urgent this complaint is. Must be exactly one of: 'low', 'medium', 'urgent'. Only use 'urgent' for genuinely dangerous situations.",
  "sentiment": "The emotional tone of the citizen. Must be exactly one of: 'neutral', 'frustrated', 'angry'.",
  "summary": "A single-sentence summary of the complaint. If the complaint is in another language or written in Roman characters (like Thanglish/Hinglish), you MUST translate it and write the summary in clear, professional English."
}

Rules:
- Department MUST be exactly one of the listed valid departments.
- If the complaint doesn't clearly match a specific department, use "General Grievance".
- Urgency should be "urgent" only for genuinely dangerous situations (harassment, stalking, flooding, fire, electrocution risk, gas leak, medical emergency, violence).
- Location should be extracted as-is from the text; use "Not specified" if none is mentioned.
- Summary should be one clear sentence an officer can scan quickly. Translate to English if needed.
- Sentiment reflects the citizen's emotional tone, not the severity of the issue.

Examples of Romanized Indian Transliterations (Thanglish/Hinglish):
1. Sanitation Example:
   Input: "Kuypai thotti over-ah overflow aagi stink adikidhu, please clear it near my house in Avadi"
   Output: {
     "issue_type": "garbage accumulation",
     "department": "Sanitation",
     "location": "Avadi",
     "urgency": "medium",
     "sentiment": "frustrated",
     "summary": "The garbage bin is overflowing and producing a foul smell in Avadi."
   }
2. Water Supply Example:
   Input: "Water supply varavey illa two days ah, pipeline repairs or what? near Tambaram"
   Output: {
     "issue_type": "water supply outage",
     "department": "Water Supply",
     "location": "near Tambaram",
     "urgency": "medium",
     "sentiment": "frustrated",
     "summary": "Water supply has been unavailable for two days near Tambaram."
   }
3. Electricity Example:
   Input: "Street light eriyala, romba dark ah iruku vazhi near Anna Nagar"
   Output: {
     "issue_type": "broken streetlight",
     "department": "Electricity",
     "location": "near Anna Nagar",
     "urgency": "medium",
     "sentiment": "neutral",
     "summary": "The streetlight is not working, making the road very dark near Anna Nagar."
   }
4. Roads & Infrastructure Example:
   Input: "Pothole romba perusa iruku road la, bike porapokula padithu accident aagiduchi near Guindy"
   Output: {
     "issue_type": "dangerous pothole",
     "department": "Roads & Infrastructure",
     "location": "near Guindy",
     "urgency": "medium",
     "sentiment": "frustrated",
     "summary": "A large pothole on the road caused a motorcycle accident near Guindy."
   }
5. Health Services Example:
   Input: "Kozhuvathollai dengue fever spread aaitu iruku area-la, please do mosquito spraying near Velachery"
   Output: {
     "issue_type": "dengue outbreak prevention",
     "department": "Health Services",
     "location": "near Velachery",
     "urgency": "medium",
     "sentiment": "frustrated",
     "summary": "Mosquito spraying requested due to spreading dengue fever near Velachery."
   }
6. Police Example:
   Input: "Inga 4 college pasanga vara pora ponnunga kitta dailyum prechana pannitu irukanga , near SDBN college, wee need help!"
   Output: {
     "issue_type": "harassment of women",
     "department": "Police",
     "location": "near SDBN college",
     "urgency": "urgent",
     "sentiment": "frustrated",
     "summary": "Four college boys are harassing girls passing by daily near SDBN College."
   }
7. Fire Department Example:
   Input: "Gas cylinder leak aagi fire spread aagiduchi kitchen full-ah smoke iruku in Adyar"
   Output: {
     "issue_type": "kitchen fire emergency",
     "department": "Fire Department",
     "location": "Adyar",
     "urgency": "urgent",
     "sentiment": "angry",
     "summary": "Fire emergency reported in Adyar due to a gas cylinder leak in the kitchen."
   }
8. General Grievance Example:
   Input: "Office-la certification get panna extra delays aagudhu, no proper service response near Chromepet"
   Output: {
     "issue_type": "administrative service delay",
     "department": "General Grievance",
     "location": "near Chromepet",
     "urgency": "low",
     "sentiment": "frustrated",
     "summary": "Citizens are experiencing administrative delays in getting certificates near Chromepet."
   }

Do not include any preambles, explanations, markdown formatting (like \`\`\`json), or extra text. Output ONLY the raw JSON object.`;

// ─── Layer 1: Bedrock Llama invocation with Retry ───────────────────────────

/**
 * Call Amazon Bedrock Llama model.
 *
 * @param {string} text - The complaint text to classify
 * @returns {Promise<Object>} Parsed classification result
 */
async function callBedrockWithRetry(text) {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const modelId = process.env.AWS_BEDROCK_MODEL_ID || 'us.meta.llama3-1-8b-instruct-v1:0';
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const command = new ConverseCommand({
        modelId: modelId,
        system: [{ text: SYSTEM_PROMPT }],
        messages: [
          {
            role: 'user',
            content: [{ text: text }],
          },
        ],
        inferenceConfig: {
          maxTokens: 1024,
          temperature: 0.1,
        },
      });

      const response = await client.send(command);
      const responseText = response.output.message.content[0].text;

      // Extract the JSON object from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Response did not contain a valid JSON object');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Defensive: ensure department is in the valid list
      if (!VALID_DEPARTMENTS.includes(parsed.department)) {
        console.warn(`[Bedrock] Unknown department "${parsed.department}", falling back to General Grievance`);
        parsed.department = 'General Grievance';
      }

      return parsed;
    } catch (err) {
      console.error(`[Bedrock] Attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err.message);

      const isRetryable = err.status === 503 ||
        err.message?.includes('503') ||
        err.message?.includes('throttling') ||
        err.message?.includes('Throttling') ||
        err.message?.includes('LimitExceeded') ||
        err.message?.includes('overloaded');

      if (isRetryable && attempt < MAX_ATTEMPTS) {
        console.warn(`[Bedrock] Retryable error on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw err;
    }
  }
}

// ─── Layer 2: Rule-Based Keyword Fallback ───────────────────────────────────

/**
 * Classify a complaint using keyword matching when Bedrock is unavailable.
 */
function keywordFallbackClassify(text) {
  const lowerText = text.toLowerCase();

  // Count which departments have at least one keyword match
  const matchedDepartments = [];
  for (const [department, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    const hasMatch = keywords.some((keyword) => lowerText.includes(keyword));
    if (hasMatch) {
      matchedDepartments.push(department);
    }
  }

  // Department decision
  let department;
  if (matchedDepartments.length === 1) {
    department = matchedDepartments[0];
  } else {
    if (matchedDepartments.length >= 2) {
      console.log(`[Fallback] Ambiguous match across ${matchedDepartments.length} departments: ${matchedDepartments.join(', ')} → General Grievance`);
    }
    department = 'General Grievance';
  }

  // Urgency: default medium, escalate to urgent on danger keywords
  const isUrgent = URGENT_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  const urgency = isUrgent ? 'urgent' : 'medium';

  // Sentiment: default neutral, escalate to frustrated on frustration keywords
  const isFrustrated = FRUSTRATED_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  const sentiment = isFrustrated ? 'frustrated' : 'neutral';

  // Summary: first ~150 characters of the raw text as a rough summary
  const summary = text.length > 150 ? text.substring(0, 147) + '...' : text;

  return {
    issue_type: 'Unclassified — needs review',
    department,
    location: 'Not specified',
    urgency,
    sentiment,
    summary,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify a citizen complaint. Always returns a result — never throws.
 *
 * Tries Bedrock first, falls back to keyword matching if Bedrock is completely unavailable.
 *
 * @param {string} text - The call transcript or typed complaint text
 * @returns {Promise<Object>} Classification result with `classified_by: 'ai' | 'rules'`
 */
async function classifyComplaint(text) {
  // Layer 1: Try Bedrock
  try {
    const result = await callBedrockWithRetry(text);
    console.log('[Bedrock] Classification result (AI):', result);
    return { ...result, classified_by: 'ai' };
  } catch (err) {
    console.error('[Bedrock] All attempts failed, falling back to keyword classification:', err.message);
  }

  // Layer 2: Rule-based keyword fallback
  const fallbackResult = keywordFallbackClassify(text);
  console.log('[Fallback] Classification result (rules):', fallbackResult);
  return { ...fallbackResult, classified_by: 'rules' };
}

module.exports = { classifyComplaint, VALID_DEPARTMENTS };
