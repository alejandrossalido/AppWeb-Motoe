
import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const geminiChat = async (message: string) => {
  const ai = getAIClient();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "Eres el asistente de IA de EPSA MOTO. Ayudas a los ingenieros y gestores del equipo con tareas técnicas, análisis de datos y coordinación. Responde siempre en Español (España), de forma concisa y profesional.",
    },
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};

export const analyzeComponent = async (base64Image: string, prompt: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
        { text: prompt }
      ]
    }
  });
  return response.text;
};

export const analyzeTacticalVideo = async (frames: string[], prompt: string) => {
  const ai = getAIClient();
  const parts = frames.map(f => ({
    inlineData: { mimeType: 'image/jpeg', data: f.split(',')[1] }
  }));
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [...parts, { text: prompt }]
    }
  });
  return response.text;
};
