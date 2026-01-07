
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Task, IntegrationStatus } from '../types';

// Simplified helper for Base64 since we need to implement it manually per guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface VoiceAgentProps {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  integrations: IntegrationStatus;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ setTasks, integrations }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const nextStartTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleManualCommand = () => {
    if (!manualInput.trim()) return;

    // Simple command parsing for task creation
    const input = manualInput.toLowerCase();

    if (input.includes('create task') || input.includes('add task') || input.includes('new task')) {
      // Parse the task details from the command
      const taskMatch = manualInput.match(/(?:create|add|new) task[:\s]+(.+)/i);
      if (taskMatch) {
        const today = new Date().toISOString().split('T')[0];
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          title: taskMatch[1].trim(),
          duration: 30, // Default duration
          category: 'personal',
          priority: 'medium',
          completed: false,
          dueDate: today,
          syncedToCalendar: integrations.googleCalendar
        };

        setTasks(prev => [...prev, newTask]);
        setTranscript(prev => [...prev.slice(-4), `Agent: Task "${newTask.title}" created successfully!`]);
      }
    } else {
      setTranscript(prev => [...prev.slice(-4), `You: ${manualInput}`, `Agent: I heard you! Try saying "create task: [task name]" to add a new task.`]);
    }

    setManualInput('');
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
      alert("API Key not found. Please add VITE_API_KEY or GEMINI_API_KEY to your .env.local file.");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent?.outputTranscription?.text;
              setTranscript(prev => [...prev.slice(-4), `Agent: ${text}`]);

              // Check if agent is creating a task
              if (text && (text.toLowerCase().includes('task created') || text.toLowerCase().includes('added task'))) {
                // Extract task name if possible
                const taskNameMatch = text.match(/["'](.+?)["']/);
                if (taskNameMatch) {
                  const today = new Date().toISOString().split('T')[0];
                  const newTask: Task = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: taskNameMatch[1],
                    duration: 30,
                    category: 'personal',
                    priority: 'medium',
                    completed: false,
                    dueDate: today,
                    syncedToCalendar: integrations.googleCalendar
                  };
                  setTasks(prev => [...prev, newTask]);
                }
              }
            }
          },
          onerror: () => setIsActive(false),
          onclose: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are LifeLoop, a supportive and proactive life coach. Help the user navigate their goals, offer time management tips, and be encouraging. 
          
When the user asks you to create a task, respond with: "Task created: '[task name]'". Always include the task name in quotes.
You can help users create tasks by listening for commands like "create task", "add task", or "new task".`,
          outputAudioTranscription: {}
        }
      });
    } catch (err) {
      console.error(err);
      setIsActive(false);
      alert("Failed to start voice session. Please check your microphone permissions and API key.");
    }
  };

  return (
    <div className="flex flex-col items-center glass p-10 rounded-3xl h-full justify-center">
      <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-indigo-500 animate-pulse shadow-[0_0_50px_rgba(99,102,241,0.5)]' : 'bg-slate-700'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold mb-2">LifeLoop Voice Coach</h2>
      <p className="text-slate-400 mb-8 text-center max-w-sm">
        {isActive ? "I'm listening. Try saying 'create task: [task name]' to add tasks!" : "Start a conversation or type commands to manage your tasks."}
      </p>

      <div className="w-full bg-black/30 rounded-xl p-4 mb-8 min-h-[100px] max-h-[200px] overflow-y-auto text-sm text-slate-300">
        {transcript.length > 0 ? transcript.map((t, i) => <div key={i} className="mb-1">{t}</div>) : "No conversation yet..."}
      </div>

      {/* Manual Command Input */}
      <div className="w-full mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualCommand()}
            placeholder="Type a command: 'create task: Buy groceries'"
            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
            disabled={isActive}
          />
          <button
            onClick={handleManualCommand}
            disabled={isActive || !manualInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Try: "create task: Finish homework" or "add task: Morning workout"
        </p>
      </div>

      <button
        onClick={isActive ? () => window.location.reload() : startSession}
        className={`px-12 py-4 rounded-full font-bold text-lg transition-all ${isActive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/20'}`}
      >
        {isActive ? 'Stop Session' : 'Start Voice Coaching'}
      </button>

      <p className="text-xs text-slate-500 mt-4 text-center max-w-md">
        Voice features require microphone access and a Gemini API key. Tasks created will appear in your dashboard.
      </p>
    </div>
  );
};

export default VoiceAgent;
