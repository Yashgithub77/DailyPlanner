
import React, { useState, useEffect } from 'react';
import { View, Goal, Task, Achievement, IntegrationStatus, ThemeType } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import StudyHub from './components/StudyHub';
import Wellness from './components/Wellness';
import VoiceAgent from './components/VoiceAgent';
import Achievements from './components/Achievements';
import ThemeSwitcher from './components/ThemeSwitcher';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Early Bird', description: 'Complete a task before 8 AM', icon: '☀️' },
  { id: '2', title: 'Deep Work', description: 'Complete a 90min focus session', icon: '🧠' },
  { id: '3', title: 'Consistent', description: 'Complete all daily tasks', icon: '🔥' },
];

const THEME_VARS: Record<ThemeType, any> = {
  midnight: { primary: '#6366f1', secondary: '#4f46e5', bg: '#0f172a', accent: '#a5b4fc' },
  cyberpunk: { primary: '#f472b6', secondary: '#db2777', bg: '#000000', accent: '#9333ea' },
  ocean: { primary: '#0ea5e9', secondary: '#0284c7', bg: '#082f49', accent: '#bae6fd' },
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [streak, setStreak] = useState(1);
  const [lastCompletionDate, setLastCompletionDate] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeType>('midnight');
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    googleCalendar: false,
    googleFit: false
  });

  // Load streak from localStorage on mount
  useEffect(() => {
    const savedStreak = localStorage.getItem('lifeloop_streak');
    const savedDate = localStorage.getItem('lifeloop_last_completion');
    if (savedStreak) setStreak(parseInt(savedStreak));
    if (savedDate) setLastCompletionDate(savedDate);
  }, []);

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const toggleIntegration = (key: keyof IntegrationStatus) => {
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => !t.dueDate || t.dueDate === today);
  const progress = todayTasks.length > 0 ? (todayTasks.filter(t => t.completed).length / todayTasks.length) * 100 : 0;

  // Update streak when all today's tasks are completed
  useEffect(() => {
    if (progress === 100 && todayTasks.length > 0) {
      if (lastCompletionDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (lastCompletionDate === yesterdayStr) {
          // Consecutive day
          newStreak = streak + 1;
        } else if (lastCompletionDate === today) {
          // Already completed today
          newStreak = streak;
        }
        // else: streak resets to 1 (gap in days)

        setStreak(newStreak);
        setLastCompletionDate(today);
        localStorage.setItem('lifeloop_streak', newStreak.toString());
        localStorage.setItem('lifeloop_last_completion', today);
      }
    }
  }, [progress, todayTasks.length, today, lastCompletionDate, streak]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = THEME_VARS[theme];
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--bg-main', colors.bg);
    root.style.setProperty('--accent', colors.accent);
    document.body.style.backgroundColor = colors.bg;
  }, [theme]);

  return (
    <div className={`flex h-screen overflow-hidden text-slate-100 transition-colors duration-700`} style={{ backgroundColor: 'var(--bg-main)' }}>
      <Sidebar currentView={currentView} setView={setCurrentView} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <style>{`
          :root {
            --primary: #6366f1;
            --secondary: #4f46e5;
            --accent: #a5b4fc;
            --bg-main: #0f172a;
          }
          .text-primary { color: var(--primary); }
          .bg-primary { background-color: var(--primary); }
          .border-primary { border-color: var(--primary); }
          .ring-primary { --tw-ring-color: var(--primary); }
          .shadow-primary { --tw-shadow-color: var(--primary); }
        `}</style>

        <div className="max-w-7xl mx-auto space-y-8 pb-20">
          {currentView === 'dashboard' && (
            <Dashboard
              tasks={tasks}
              setTasks={setTasks}
              toggleTask={toggleTask}
              progress={progress}
              streak={streak}
              integrations={integrations}
            />
          )}
          {currentView === 'planner' && (
            <Planner
              goals={goals}
              setGoals={setGoals}
              setTasks={setTasks}
              tasks={tasks}
              hasIntegrations={integrations.googleCalendar || integrations.googleFit}
              integrations={integrations}
              toggleIntegration={toggleIntegration}
            />
          )}
          {currentView === 'study' && <StudyHub />}
          {currentView === 'wellness' && <Wellness />}
          {currentView === 'voice' && <VoiceAgent setTasks={setTasks} integrations={integrations} />}
          {currentView === 'achievements' && <Achievements achievements={achievements} progress={progress} />}
          {currentView === 'themes' && (
            <ThemeSwitcher currentTheme={theme} setTheme={setTheme} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
