
import React, { useState } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { Branch } from '../types';

const RankingPage: React.FC = () => {
  const { users, currentUser } = useApp();
  const [filter, setFilter] = useState<Branch | 'Global'>('Global');

  const filteredUsers = [...users]
    .filter(u => u.status === 'active' && (filter === 'Global' || u.branch === filter))
    .sort((a, b) => b.totalHours - a.totalHours);

  const top3 = filteredUsers.slice(0, 3);
  const rest = filteredUsers.slice(3);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Tabla de Clasificación" subtitle="Ranking de horas y rendimiento" />

      <div className="p-8 space-y-12 overflow-y-auto h-full custom-scroll">
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit mx-auto">
          {['Global', 'Eléctrica', 'Mecánica', 'Administración'].map(b => (
            <button key={b} onClick={() => setFilter(b as any)} className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === b ? 'bg-primary text-black shadow-glow' : 'text-gray-500 hover:text-white'}`}>
              {b}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-center gap-8 py-10 relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

          {/* Segundo */}
          {top3[1] && (
            <BigPodioItem user={top3[1]} rank={2} height="h-40" color="border-gray-400" bgColor="bg-gray-400/10" />
          )}

          {/* Primero */}
          {top3[0] && (
            <BigPodioItem user={top3[0]} rank={1} height="h-56" color="border-brand-elec" bgColor="bg-brand-elec/10" isMain />
          )}

          {/* Tercero */}
          {top3[2] && (
            <BigPodioItem user={top3[2]} rank={3} height="h-28" color="border-orange-800" bgColor="bg-orange-800/10" />
          )}
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-6">Resto de Clasificación</h3>
          {rest.map((user, index) => (
            <div key={user.id} className={`flex items-center gap-6 p-5 rounded-3xl border transition-all ${user.id === currentUser?.id ? 'bg-primary/10 border-primary/30 shadow-glow' : 'bg-surface-dark border-white/5 hover:border-white/10'}`}>
              <div className="w-10 text-center font-mono text-xl font-black text-gray-700 italic">
                {(index + 4).toString().padStart(2, '0')}
              </div>
              <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-white/10 shrink-0" alt="avatar" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold truncate">{user.name}</p>
                  {user.id === currentUser?.id && <span className="text-[10px] font-black bg-primary text-black px-2 py-0.5 rounded-full uppercase">Tú</span>}
                </div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{user.branch} • {user.subteam}</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-[20px] font-black">schedule</span>
                  <span className="text-2xl font-black tracking-tighter">{user.totalHours.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div >
  );
};

const BigPodioItem = ({ user, rank, height, color, bgColor, isMain }: any) => (
  <div className="flex flex-col items-center group">
    <div className="relative mb-4">
      <img src={user.avatar} className={`rounded-full border-4 object-cover ${isMain ? 'w-24 h-24 shadow-glow' : 'w-20 h-20'} ${color}`} alt="avatar" />
      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-black bg-white ring-4 ring-background-dark shadow-2xl`}>
        {rank}
      </div>
    </div>
    <div className={`w-32 ${height} ${bgColor} border-t-4 ${color} rounded-t-3xl flex flex-col items-center justify-end p-4 transition-all group-hover:bg-white/5`}>
      <span className="text-xs font-black text-white truncate w-full text-center mb-1">{user.name.split(' ')[0]}</span>
      <div className="flex items-center gap-1 text-white">
        <span className="material-symbols-outlined text-[14px]">schedule</span>
        <span className="text-lg font-black tracking-tighter">{user.totalHours.toFixed(1)}h</span>
      </div>
    </div>
  </div>
);

export default RankingPage;
