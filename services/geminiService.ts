
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Real Agentic Tool: Pushing to Google Calendar
const pushCalendarTool: FunctionDeclaration = {
  name: 'push_to_google_calendar',
  parameters: {
    type: Type.OBJECT,
    description: 'Create a new event in the user Google Calendar.',
    properties: {
      title: { type: Type.STRING },
      startTime: { type: Type.STRING, description: 'ISO string or descriptive time' },
      duration: { type: Type.NUMBER, description: 'Minutes' }
    },
    required: ['title', 'startTime', 'duration']
  }
};

export async function breakDownGoal(goalTitle: string, constraints: string, hasIntegrations: boolean): Promise<Task[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Break down the goal "${goalTitle}" into actionable tasks. 
    Constraints: ${constraints}. 
    Integrations Active: ${hasIntegrations ? 'Google Calendar & Fit' : 'None'}.
    Include at least one fitness task if Fit is active. 
    Always suggest specific start times for these tasks.`,
    config: {
      tools: hasIntegrations ? [{ functionDeclarations: [pushCalendarTool] }] : [],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            startTime: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            category: { type: Type.STRING, enum: ['work', 'study', 'fitness', 'personal'] }
          },
          required: ['title', 'duration', 'priority', 'category']
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  try {
    const tasks = JSON.parse(text).map((t: any) => ({
      ...t,
      id: Math.random().toString(36).substr(2, 9),
      completed: false,
      syncedToCalendar: hasIntegrations // Simulate the agent auto-pushing
    }));
    return tasks;
  } catch (e) {
    console.error("Failed to parse breakdown JSON:", text);
    return [];
  }
}

export async function reOptimizeSchedule(missedTasks: Task[], tomorrowTasks: Task[]): Promise<Task[]> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Reschedule these missed tasks: ${JSON.stringify(missedTasks)} and merge with tomorrow: ${JSON.stringify(tomorrowTasks)}. Optimize for morning high-focus.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            startTime: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            category: { type: Type.STRING, enum: ['work', 'study', 'fitness', 'personal'] }
          },
          required: ['title', 'duration', 'priority', 'category']
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  return JSON.parse(text).map((t: any) => ({
    ...t,
    id: Math.random().toString(36).substr(2, 9),
    completed: false,
    syncedToCalendar: true
  }));
}

export async function analyzeContent(base64Data: string, mimeType: string): Promise<{ summary: string; quiz: any[] }> {
  const isSupportedModality = mimeType.startsWith('image/') || mimeType === 'application/pdf';
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: isSupportedModality ? mimeType : 'image/jpeg' } },
        { text: "Analyze the attached material. Provide a summary and 3 multiple-choice questions." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answer: { type: Type.NUMBER }
              },
              required: ['question', 'options', 'answer']
            }
          }
        },
        required: ['summary', 'quiz']
      }
    }
  });
  return JSON.parse(response.text || '{}');
}
