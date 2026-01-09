
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useApp } from '../App';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DASH_DATA = [
  { name: 'Lun', horas: 12 }, { name: 'Mar', horas: 18 }, { name: 'Mie', horas: 15 },
  { name: 'Jue', horas: 25 }, { name: 'Vie', horas: 22 }, { name: 'Sab', horas: 30 },
  { name: 'Dom', horas: 10 },
];

const Dashboard: React.FC = () => {
  const { users, events, tasks, logout, notifications, setNotifications, currentUser } = useApp();

  const activeTasks = tasks.filter(t => t.status === 'in_progress');
  const myNotifications = notifications.filter(n => n.userId === currentUser?.id || n.userId === 'all').slice(0, 5);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => (n.userId === currentUser?.id || n.userId === 'all') ? { ...n, read: true } : n));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Panel Operativo" subtitle="Gestión de equipo Formula Student" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scroll">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <MetricCard label="Horas Equipo" value={`${users.reduce((acc, u) => acc + u.totalHours, 0).toFixed(0)}h`} trend="+12%" icon="timer" color="text-primary" />
          <MetricCard label="Créditos Acum." value={users.reduce((acc, u) => acc + u.totalCredits, 0).toLocaleString()} trend="+5%" icon="stars" color="text-brand-elec" />
          <MetricCard label="Tasks Activas" value={activeTasks.length.toString()} trend="OK" icon="assignment_late" color="text-blue-400" />
          <MetricCard label="Sesiones Hoy" value="8" trend="+2" icon="bolt" color="text-brand-admin" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card-dark rounded-3xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <h3 className="text-lg font-bold mb-6">Actividad Semanal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={DASH_DATA}>
                    <defs>
                      <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00cc88" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00cc88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="horas" stroke="#00cc88" strokeWidth={3} fillOpacity={1} fill="url(#colorHoras)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card-dark rounded-3xl border border-white/5 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold">Aviso del Sistema</h3>
                <button onClick={markAllRead} className="text-[10px] font-bold text-gray-500 hover:text-primary uppercase tracking-widest transition-colors">Marcar leído</button>
              </div>
              <div className="space-y-3">
                {myNotifications.map(note => (
                  <div key={note.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${note.read ? 'bg-white/[0.01] border-white/5 grayscale' : 'bg-primary/5 border-primary/20 shadow-glow'}`}>
                    <div className={`p-2 rounded-lg shrink-0 ${note.read ? 'bg-white/5 text-gray-600' : 'bg-primary/20 text-primary'}`}>
                      <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{note.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{note.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card-dark rounded-3xl border border-white/5 p-6 shadow-xl flex flex-col">
              <h3 className="text-lg font-bold mb-6">Eventos</h3>
              <div className="space-y-4 flex-1">
                {events.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 cursor-pointer">
                    <div className={`w-1 h-10 rounded-full shrink-0 ${event.branch === 'Eléctrica' ? 'bg-brand-elec' : event.branch === 'Mecánica' ? 'bg-brand-mech' : 'bg-primary'}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{event.title}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(event.start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/calendario" className="w-full mt-6 py-3 bg-white/5 rounded-xl text-center text-xs font-bold uppercase hover:bg-white/10 transition-colors">Calendario</Link>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, trend, icon, color }: any) => (
  <div className="bg-card-dark rounded-2xl p-4 border border-white/5 hover:border-primary/20 transition-all group">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-1.5 bg-white/5 rounded-lg ${color}`}>
        <span className="material-symbols-outlined shrink-0 text-[20px]">{icon}</span>
      </div>
    </div>
    <h4 className="text-gray-500 text-[9px] font-black uppercase tracking-wider">{label}</h4>
    <p className="text-xl font-bold text-white mt-1">{value}</p>
  </div>
);

export default Dashboard;
