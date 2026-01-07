
import React from 'react';
import { IntegrationStatus } from '../types';

interface IntegrationsProps {
  status: IntegrationStatus;
  toggle: (key: keyof IntegrationStatus) => void;
}

const Integrations: React.FC<IntegrationsProps> = ({ status, toggle }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black mb-2">Integrations</h1>
        <p className="text-slate-400">Connect LifeLoop to your digital ecosystem for autonomous scheduling.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`glass p-8 rounded-[40px] border transition-all ${status.googleCalendar ? 'border-indigo-500/50' : 'border-white/5'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-3xl">📅</div>
            <button 
              onClick={() => toggle('googleCalendar')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${status.googleCalendar ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {status.googleCalendar ? 'Connected' : 'Connect'}
            </button>
          </div>
          <h3 className="text-2xl font-bold mb-2">Google Calendar</h3>
          <p className="text-slate-500 text-sm mb-6">Import meetings, deadlines, and events for automatic conflict resolution.</p>
          {status.googleCalendar && (
            <div className="text-xs text-indigo-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
              Syncing in real-time...
            </div>
          )}
        </div>

        <div className={`glass p-8 rounded-[40px] border transition-all ${status.googleFit ? 'border-rose-500/50' : 'border-white/5'}`}>
          <div className="flex justify-between items-start mb-6">
            <div className="w-16 h-16 bg-rose-600/20 rounded-2xl flex items-center justify-center text-3xl">💪</div>
            <button 
              onClick={() => toggle('googleFit')}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${status.googleFit ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              {status.googleFit ? 'Connected' : 'Connect'}
            </button>
          </div>
          <h3 className="text-2xl font-bold mb-2">Google Fit</h3>
          <p className="text-slate-500 text-sm mb-6">Sync steps, sleep, and heart rate to adjust your productivity schedule based on health.</p>
          {status.googleFit && (
            <div className="text-xs text-rose-400 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              Monitoring biometrics...
            </div>
          )}
        </div>
      </div>

      <div className="glass p-10 rounded-[50px] border border-white/5 bg-slate-900/30">
        <h3 className="text-xl font-bold mb-4">How it works</h3>
        <p className="text-slate-400 leading-relaxed">
          LifeLoop uses these integrations as <strong>tools</strong>. For example, if it detects you didn't sleep well (via Google Fit), 
          it might autonomously shift your morning "Deep Work" session by 1 hour and suggest a lighter morning task. 
          If a new meeting appears on your Calendar, LifeLoop will automatically reschedule overlapping tasks to the next best slot.
        </p>
      </div>
    </div>
  );
};

export default Integrations;
