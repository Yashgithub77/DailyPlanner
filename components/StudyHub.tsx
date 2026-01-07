
import React, { useState } from 'react';
import { analyzeContent } from '../services/geminiService';

type HubMode = 'summarize' | 'quiz';

const SmartHub: React.FC = () => {
  const [mode, setMode] = useState<HubMode>('summarize');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [quiz, setQuiz] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File is too large. Please select a file smaller than 10MB.");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSummary('');
      setQuiz([]);
    }
  };

  const processMaterial = async (requestType: HubMode) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setQuizScore(null);
    setUserAnswers([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const analysis = await analyzeContent(base64, file.type);

          if (analysis.summary.includes("Error")) {
            setError(analysis.summary);
          } else {
            if (requestType === 'summarize') {
              setSummary(analysis.summary);
            } else {
              setQuiz(analysis.quiz);
            }
          }
        } catch (err: any) {
          setError(err.message || "Failed to analyze document.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const checkQuiz = () => {
    if (quiz.length === 0) return;
    let score = 0;
    quiz.forEach((q, i) => {
      if (userAnswers[i] === q.answer) score++;
    });
    setQuizScore(score);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold">Smart Hub</h1>
        <p className="text-slate-400">Upload material for AI-powered analysis, summarization, and quiz generation.</p>
      </header>

      {/* Mode Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode('summarize')}
          className={`flex-1 p-6 rounded-3xl font-bold text-lg transition-all ${mode === 'summarize'
            ? 'glass border-2 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/20'
            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
        >
          <div className="text-3xl mb-2">📝</div>
          Summarize Content
        </button>
        <button
          onClick={() => setMode('quiz')}
          className={`flex-1 p-6 rounded-3xl font-bold text-lg transition-all ${mode === 'quiz'
            ? 'glass border-2 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/20'
            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
        >
          <div className="text-3xl mb-2">🎯</div>
          Generate Quiz
        </button>
      </div>

      {/* Upload Section */}
      <div className="glass p-8 rounded-3xl text-center relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-bold text-indigo-400 animate-pulse">
              {mode === 'summarize' ? 'Analyzing and summarizing...' : 'Generating quiz questions...'}
            </p>
          </div>
        )}

        <input
          type="file"
          id="smart-hub-upload"
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,application/pdf"
        />
        <label
          htmlFor="smart-hub-upload"
          className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/20 transition-all mb-6"
        >
          <span className="text-5xl mb-4">{file ? '📄' : '📤'}</span>
          <span className="text-lg font-medium">{file ? file.name : 'Drop study material here or click to browse'}</span>
          <span className="text-sm text-slate-500 mt-2">Supports Images (PNG, JPG) and PDFs</span>
        </label>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          onClick={() => processMaterial(mode)}
          disabled={!file || loading}
          className="bg-indigo-600 px-10 py-3 rounded-xl font-bold hover:bg-indigo-500 disabled:bg-slate-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          {loading ? 'Processing...' : mode === 'summarize' ? 'Generate Summary' : 'Generate Quiz'}
        </button>
      </div>

      {/* Summarize Section */}
      {mode === 'summarize' && summary && (
        <div className="glass p-8 rounded-3xl border border-white/5 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-indigo-400">📝</span> Content Summary
          </h3>
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base">{summary}</p>
          </div>
        </div>
      )}

      {/* Quiz Section */}
      {mode === 'quiz' && quiz.length > 0 && (
        <div className="glass p-8 rounded-3xl border border-white/5 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-indigo-400">🎯</span> Knowledge Quiz
          </h3>
          <div className="space-y-8">
            {quiz.map((q, idx) => (
              <div key={idx} className="space-y-4">
                <p className="font-semibold text-slate-200 text-lg">{idx + 1}. {q.question}</p>
                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <button
                      key={optIdx}
                      onClick={() => {
                        const newAns = [...userAnswers];
                        newAns[idx] = optIdx;
                        setUserAnswers(newAns);
                      }}
                      className={`p-3 rounded-xl text-left border transition-all ${userAnswers[idx] === optIdx ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-800/50 border-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${userAnswers[idx] === optIdx ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        {opt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 space-y-4">
              <button
                onClick={checkQuiz}
                disabled={userAnswers.length < quiz.length}
                className="w-full bg-slate-800 py-4 rounded-xl font-bold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/10"
              >
                Submit Answers
              </button>

              {quizScore !== null && (
                <div className={`p-6 rounded-2xl text-center transition-all animate-in zoom-in duration-300 ${quizScore === quiz.length ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-indigo-500/20 border border-indigo-500/50'}`}>
                  <div className="text-sm uppercase tracking-widest font-bold opacity-75 mb-1">Your Score</div>
                  <div className="text-5xl font-black mb-2">{quizScore} / {quiz.length}</div>
                  <p className="text-sm">
                    {quizScore === quiz.length ? "Perfect! You've mastered this material." : "Good effort! Review the material and try again."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartHub;
