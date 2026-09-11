const dotenv = require("dotenv");
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/**
 * Make an HTTP request to the Google Gemini Generative Language API.
 * Uses native fetch (Node 18+).
 */
async function callGeminiApi(prompt, systemInstruction = "") {
  if (!GEMINI_API_KEY) {
    return null; // Signals fallback mode
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Gemini API returned error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || null;
  } catch (err) {
    console.warn("Gemini API call failed, falling back to local heuristic engine:", err.message);
    return null;
  }
}

/**
 * Test AI Connection and report status.
 */
async function testConnection() {
  if (!GEMINI_API_KEY) {
    return {
      connected: false,
      mode: "Deterministic Fallback Engine",
      model: "k12-rule-based-v2.4",
      message: "No GEMINI_API_KEY detected in backend environment. Running in deterministic operational engine mode."
    };
  }

  try {
    const testPrompt = "Provide a 1-sentence confirmation of K-12 operations predictive monitoring status.";
    const result = await callGeminiApi(testPrompt);
    if (result) {
      return {
        connected: true,
        mode: "Google Gemini Live AI",
        model: GEMINI_MODEL,
        message: "Gemini API connection established successfully.",
        sampleOutput: result.trim()
      };
    }
    return {
      connected: false,
      mode: "Deterministic Fallback Engine",
      model: "k12-rule-based-v2.4",
      message: "Gemini API responded with empty output or rate-limited. Operational fallback active."
    };
  } catch (error) {
    return {
      connected: false,
      mode: "Deterministic Fallback Engine",
      model: "k12-rule-based-v2.4",
      message: `Gemini API connection failed: ${error.message}. Operational fallback active.`
    };
  }
}

/**
 * Generate natural language explanation for an operational anomaly or forecast.
 */
async function generateExplanation(metric, actual, expected, contributingFactors = []) {
  const factorsList = contributingFactors.map(f => typeof f === "string" ? f : f.factor || JSON.stringify(f)).join(", ");
  
  if (GEMINI_API_KEY) {
    const prompt = `As a K-12 School Group Operations AI, explain the operational impact of the following anomaly:
Metric: ${metric}
Current Observed Value: ${actual}
Expected Baseline: ${expected}
Contributing Factors: ${factorsList}
Provide a concise 2-sentence user-facing operational summary explaining why this occurred and what immediate operational risk it creates. Avoid AI meta-talk.`;

    const aiExplanation = await callGeminiApi(prompt);
    if (aiExplanation) {
      return aiExplanation.trim();
    }
  }

  // Deterministic high-quality fallback explanation
  const diff = Number(actual) - Number(expected);
  const direction = diff > 0 ? "above" : "below";
  return `${metric} is currently ${Math.abs(diff).toFixed(1)} ${direction} baseline (${actual} vs target ${expected}). Primary operational drivers include: ${factorsList || "seasonal distribution variance and workload clustering"}. Action is recommended before service level degradation.`;
}

/**
 * Generate a recommended preventive action plan.
 */
async function generatePreventiveRecommendation(domain, issueDescription, constraints = "") {
  if (GEMINI_API_KEY) {
    const prompt = `As a K-12 School Group Operations Director AI, propose a concrete preventive action plan for this issue:
Domain: ${domain}
Issue: ${issueDescription}
Constraints: ${constraints}

Format response in JSON with keys:
- title (string, concise actionable title)
- description (string, operational execution steps)
- expectedImpact (string, percentage and qualitative outcome)
- assumptions (string)
- constraints (string)`;

    const aiResponse = await callGeminiApi(prompt);
    if (aiResponse) {
      try {
        const cleanJson = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        // Continue to fallback if json parsing fails
      }
    }
  }

  // Deterministic fallback recommendation
  return {
    title: `Proactive Capacity Rebalancing for ${domain}`,
    description: `Deploy flexible reserve resources and reassign non-critical administrative blocks to address ${issueDescription.toLowerCase()}.`,
    expectedImpact: "+12.5% SLA recovery within 5 school days, -35% escalation risk",
    assumptions: "Department coordinators have available floating substitute and support staff pool.",
    constraints: constraints || "Subject to local safeguarding policies and maximum weekly contractual hours (35h)."
  };
}

module.exports = {
  testConnection,
  generateExplanation,
  generatePreventiveRecommendation,
  hasApiKey: Boolean(GEMINI_API_KEY)
};
