
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the API key directly from process.env.API_KEY as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Generates catchy social media hooks for a given piece of content using Gemini.
 */
export const generateHooksForContent = async (title: string, content: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 catchy social media hooks for the following content. 
      Title: ${title}
      Excerpt: ${content}
      
      Return them as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    // Access the .text property of GenerateContentResponse directly as it is a getter.
    const text = response.text || "[]";
    const hooks = JSON.parse(text);
    return hooks as string[];
  } catch (error) {
    console.error("Error generating hooks:", error);
    return ["Error generating hooks. Please try again later."];
  }
};
