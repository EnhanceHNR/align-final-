
import { GoogleGenAI, Type } from "@google/genai";

export const getManufacturingAdvice = async (stageName: string, materialType: string) => {
  try {
    // Create Gemini instance right before the call using process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Manufacturing Stage: "${stageName}"
Material: "${materialType}"
Task: Provide 3 technical advice bullet points.`;

    const response = await ai.models.generateContent({
      // Complex reasoning task upgraded to gemini-3-pro-preview
      model: "gemini-3-pro-preview",
      // Simplified string content as per guidelines
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class prosthetic manufacturing expert. You MUST output ONLY raw JSON that strictly adheres to the provided schema. Do not include any introductory text, markdown formatting, or explanation. Only the JSON object.",
        maxOutputTokens: 500,
        temperature: 0.2, // Lower temperature for more consistent formatting
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 technical bullet points of advice"
            }
          },
          required: ["advice"],
          propertyOrdering: ["advice"]
        }
      },
    });

    // Access text property directly
    const text = response.text || '';
    // Clean potential markdown or unexpected characters
    const jsonStr = text.replace(/```json|```/g, '').trim();
    
    try {
      const data = JSON.parse(jsonStr);
      if (data && Array.isArray(data.advice) && data.advice.length > 0) {
        return data.advice;
      }
      throw new Error("Invalid advice format");
    } catch (parseError) {
      console.warn("Failed to parse Gemini JSON, falling back to basic extraction", parseError);
      // Fallback: If JSON parsing fails, try to split lines if it looks like a list
      if (text.includes('\n')) {
        return text.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
      }
      throw parseError;
    }
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return [
      "Ensure clean surface preparation before bonding.",
      "Monitor temperature gradients during curing.",
      "Double-check alignment markers before final assembly."
    ];
  }
};
