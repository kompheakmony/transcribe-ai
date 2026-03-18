import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to .env.local before using transcription features.");
  }

  return new GoogleGenAI({ apiKey });
};

export async function transcribeAudioToSRT(audioBase64: string, mimeType: string, maxWordsPerLine: number = 7): Promise<string> {
  const model = "gemini-2.5-pro"; // Using Pro for better accuracy in timestamps
  const ai = getAiClient();

  const prompt = `
    Transcribe the provided audio into a high-quality SRT (SubRip Subtitle) format.
    Follow these rules strictly:
    1. Use standard SRT format:
       [Index]
       [Start Time] --> [End Time]
       [Text]
    2. Timestamps must be in HH:MM:SS,mmm format.
    3. IMPORTANT: Limit each subtitle segment to a maximum of ${maxWordsPerLine} words. 
    4. Break the text into short, readable phrases that fit within this word limit.
    5. Ensure the output is ONLY the SRT content, no extra text or markdown blocks.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  return response.text || "";
}

export async function refineSRT(existingSrt: string, maxWordsPerLine: number): Promise<string> {
  const model = "gemini-2.5-flash"; // Flash is sufficient for text-to-text reformatting
  const ai = getAiClient();

  const prompt = `
    You are an expert subtitle editor. I will provide an existing SRT file.
    Your task is to re-segment the subtitles so that each segment has a maximum of ${maxWordsPerLine} words.
    
    Rules:
    1. Maintain the original timing flow as accurately as possible. 
    2. If you split a segment, interpolate the start and end times based on the word count ratio.
    3. Ensure the output is a valid SRT file.
    4. Return ONLY the SRT content.
    
    Existing SRT:
    ${existingSrt}
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text: prompt }] }],
  });

  return response.text || "";
}
