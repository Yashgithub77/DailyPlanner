
import React, { useState } from 'react';
import { Task, IntegrationStatus, FitnessData } from '../types';
import EmojiStatus from './EmojiStatus';
import { reOptimizeSchedule } from '../services/geminiService';

interface DashboardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  toggleTask: (id: string) => void;
  progress: number;
  streak: number;
  integrations: IntegrationStatus;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, setTasks, toggleTask, progress, streak, integrations }) => {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    duration: 30,
    category: 'work' as 'work' | 'study' | 'fitness' | 'personal',
    priority: 'medium' as 'low' | 'medium' | 'high',
    startTime: ''
  });

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => !t.dueDate || t.dueDate === today);
  const pendingTasks = todayTasks.filter(t => !t.completed);

  const mockFitData: FitnessData = {
    steps: 8421,
    calories: 450,
    activeMinutes: 32,
    heartRate: 72
  };

  const handleEndOfDay = async () => {
    if (pendingTasks.length === 0) {
      alert("No tasks to reschedule! You're a hero.");
      return;
    }
    setIsRescheduling(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const tomorrowTasks = await reOptimizeSchedule(pendingTasks, []);
      setTasks(prev => [
        ...prev.filter(t => t.completed || t.dueDate !== today),
        ...tomorrowTasks.map(t => ({
          ...t,
          id: Math.random().toString(36).substr(2, 9),
          dueDate: tomorrowDate
        }))
      ]);
      alert(`LifeLoop Agent has rescheduled ${pendingTasks.length} tasks for tomorrow.`);
    } catch (e) {
      console.error(e);
      alert("Failed to reschedule tasks. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTask.title,
      duration: newTask.duration,
      category: newTask.category,
      priority: newTask.priority,
      startTime: newTask.startTime || undefined,
      completed: false,
      dueDate: today,
      syncedToCalendar: integrations.googleCalendar
    };

    setTasks(prev => [...prev, task]);
    setNewTask({ title: '', duration: 30, category: 'work', priority: 'medium', startTime: '' });
    setShowTaskForm(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-slate-400">Your AI agent is executing loops across {todayTasks.length} tasks.</p>
          </div>
          <div className="glass px-6 py-4 rounded-3xl flex items-center gap-4 border-amber-500/20 shadow-xl shadow-amber-500/5">
            <span className="text-4xl drop-shadow-lg">🔥</span>
            <div>
              <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Streak</div>
              <div className="text-2xl font-black text-amber-500">{streak} Days</div>
            </div>
          </div>
        </header>



        <section className="glass rounded-[40px] overflow-hidden border-white/5 shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div>
              <h2 className="text-2xl font-bold">Today's Protocol</h2>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Synchronized with Google Cloud</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {showTaskForm ? 'Cancel' : '+ Add Task'}
              </button>
              <button
                onClick={handleEndOfDay}
                disabled={isRescheduling || pendingTasks.length === 0}
                className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                {isRescheduling ? 'Rescheduling...' : 'Reschedule Remaining'}
              </button>
            </div>
          </div>

          {showTaskForm && (
            <div className="p-8 bg-slate-800/30 border-b border-white/5">
              <h3 className="text-lg font-bold mb-4">Create New Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Task Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={newTask.duration}
                    onChange={(e) => setNewTask({ ...newTask, duration: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Start Time (optional)</label>
                  <input
                    type="time"
                    value={newTask.startTime}
                    onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value as any })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="fitness">Fitness</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddTask}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition-all"
              >
                Add Task to Dashboard
              </button>
            </div>
          )}

          <div className="divide-y divide-white/5">
            {todayTasks.length === 0 ? (
              <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                <span className="text-6xl opacity-20">📅</span>
                <p className="max-w-xs">Your loop is currently empty. Ask the planner to build your tomorrow.</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} className="p-6 flex items-center gap-6 group hover:bg-white/5 transition-all">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="w-8 h-8 rounded-xl bg-slate-800 border-white/10 checked:bg-indigo-600 transition-all cursor-pointer"
                    style={task.completed ? { backgroundColor: 'var(--primary)' } : {}}
                  />
                  <div className="flex-1">
                    <h4 className={`text-lg font-bold transition-all ${task.completed ? 'text-slate-600 line-through' : 'text-slate-100'}`}>{task.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">
                      <span className={`px-3 py-1 rounded-full ${task.category === 'fitness' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800'}`}>
                        {task.category}
                      </span>
                      <span>{task.duration}m</span>
                      {task.startTime && <span className="text-primary font-black" style={{ color: 'var(--primary)' }}>• {task.startTime}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-8">
        <EmojiStatus progress={progress} />

        <div className="glass p-8 rounded-[40px] border-indigo-500/20">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Agentic Insights
          </h3>
          <div className="space-y-4">
            {integrations.googleFit && mockFitData.steps < 3000 && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl text-sm text-rose-200 leading-relaxed">
                "Activity level low. I've automatically pushed a <strong>Quick Cardio</strong> session to your calendar for 4 PM."
              </div>
            )}
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl text-sm text-indigo-200 leading-relaxed">
              "Rescheduling is automated. Tomorrow's high-priority slots are locked for your missed 'Study' tasks."
            </div>
            {integrations.googleCalendar && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl text-sm text-blue-200 leading-relaxed">
                "changes in your app will reflect in real-time."
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Dashboard;
