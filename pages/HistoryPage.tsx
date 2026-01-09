
import React from 'react';
import Header from '../components/Header';
import { useApp } from '../App';

const HistoryPage: React.FC = () => {
  const { entries, currentUser } = useApp();
  const myEntries = entries.filter(e => e.userId === currentUser.id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Historial de Fichajes" subtitle="Tus registros de tiempo y créditos" />
      
      <div className="p-8 space-y-8 overflow-y-auto h-full custom-scroll">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl flex flex-col items-center">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Sesiones</span>
            <span className="text-4xl font-black text-white">{myEntries.length}</span>
          </div>
          <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl flex flex-col items-center">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Horas Acumuladas</span>
            <span className="text-4xl font-black text-primary">{currentUser.totalHours.toFixed(1)}h</span>
          </div>
          <div className="bg-surface-dark border border-white/5 p-6 rounded-3xl flex flex-col items-center">
            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Créditos Ganados</span>
            <span className="text-4xl font-black text-brand-elec">{currentUser.totalCredits}</span>
          </div>
        </div>

        <div className="bg-surface-dark border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Duración</th>
                <th className="px-6 py-4">Resumen de Actividad</th>
                <th className="px-6 py-4 text-right">Créditos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {myEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">Todavía no has registrado ninguna sesión de trabajo.</td>
                </tr>
              ) : myEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white">{new Date(entry.clockIn).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(entry.clockIn).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '...'}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary">{entry.durationMinutes} min</td>
                  <td className="px-6 py-4 text-xs text-gray-400 leading-relaxed max-w-md">"{entry.summary}"</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-brand-elec font-black">
                      <span className="material-symbols-outlined text-[14px]">stars</span>
                      {entry.creditsEarned}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
