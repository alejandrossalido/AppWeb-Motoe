
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { CalendarEvent, Branch, Task } from '../types';

const CalendarPage: React.FC = () => {
  const { events, tasks, setEvents, currentUser } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newEvent, setNewEvent] = useState({ title: '', branch: (currentUser?.branch || 'Global') as Branch | 'Global', type: 'meeting' as any });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    // 28 días (4 semanas exactas)
    for (let i = 0; i < 28; i++) {
      const d = new Date(year, month, i - offset + 1);
      days.push(d);
    }
    return days;
  }, [currentMonth]);

  const handleCreate = () => {
    if (!newEvent.title.trim()) return;
    const ev: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title,
      start: (selectedDate || new Date()).toISOString(),
      branch: newEvent.branch,
      type: newEvent.type
    };
    setEvents([...events, ev]);
    setShowCreateModal(false);
    setNewEvent({ title: '', branch: (currentUser?.branch || 'Global'), type: 'meeting' });
    setSelectedDate(null);
  };

  const getDayItems = (date: Date) => {
    const dStr = date.toDateString();
    const todayStr = new Date().toDateString();

    const dayEvents = events.filter(e => new Date(e.start).toDateString() === dStr);
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === dStr);
    const publishedTasks = tasks.filter(t => new Date(t.createdAt).toDateString() === dStr && t.status !== 'completed');
    const pendingTasks = dStr === todayStr ? tasks.filter(t => t.status === 'available' || t.status === 'in_progress') : [];

    return { events: dayEvents, completed: completedTasks, published: publishedTasks, pending: pendingTasks };
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Calendario" subtitle="Eventos y Tareas del Equipo" />
      
      <div className="p-4 lg:p-8 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar Estilo Google */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-white capitalize hidden sm:block">
              {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
               <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-white/5 rounded-full text-gray-400"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
               <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary border-x border-white/10">Hoy</button>
               <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-white/5 rounded-full text-gray-400"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
            </div>
          </div>
          <button onClick={() => { setSelectedDate(new Date()); setShowCreateModal(true); }} className="bg-primary text-black font-black px-4 py-3 rounded-full shadow-glow flex items-center gap-2 text-[10px] uppercase tracking-widest transition-transform active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden sm:inline">Nuevo Evento</span>
          </button>
        </div>

        {/* Grid Calendario 28 Días */}
        <div className="flex-1 grid grid-cols-7 border-t border-l border-white/5 rounded-2xl overflow-hidden shadow-2xl bg-card-dark/30">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
            <div key={d} className="bg-white/[0.02] p-2 text-center text-[8px] font-black text-gray-500 tracking-[0.2em] border-r border-b border-white/5">{d}</div>
          ))}
          
          {calendarDays.map((date, i) => {
             const { events: dayEvents, completed, published, pending } = getDayItems(date);
             const isToday = date.toDateString() === new Date().toDateString();
             const totalItems = dayEvents.length + completed.length + published.length + pending.length;

             return (
               <div 
                 key={i} 
                 onClick={() => setSelectedDate(date)}
                 className="min-h-[80px] lg:min-h-[120px] p-1 border-r border-b border-white/5 group cursor-pointer hover:bg-white/[0.03] transition-colors relative"
               >
                 <div className={`w-6 h-6 mx-auto lg:mx-0 flex items-center justify-center rounded-full text-[10px] font-black mb-1 ${isToday ? 'bg-primary text-black' : 'text-gray-500'}`}>
                   {date.getDate()}
                 </div>
                 
                 <div className="flex flex-col gap-0.5 px-0.5 overflow-hidden">
                    {dayEvents.map(e => (
                      <div key={e.id} className={`h-1 lg:h-auto lg:px-1.5 lg:py-0.5 rounded text-[8px] font-black uppercase truncate border border-transparent ${
                        e.type === 'meeting' ? 'bg-primary/20 text-primary border-primary/10' : 'bg-brand-elec/20 text-brand-elec border-brand-elec/10'
                      }`}>
                        <span className="hidden lg:inline">{e.title}</span>
                      </div>
                    ))}
                    {totalItems > (dayEvents.length) && (
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mx-auto lg:mx-0 mt-1"></div>
                    )}
                 </div>
               </div>
             );
          })}
        </div>
      </div>

      {/* Modal Detalle / Selector Crear */}
      {selectedDate && !showCreateModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card-dark border border-white/10 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Detalle del día</h4>
                <h3 className="text-xl font-black capitalize text-white">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-white/5 rounded-full text-gray-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Eventos</h5>
                {getDayItems(selectedDate).events.map(e => (
                  <div key={e.id} className={`p-3 rounded-xl flex items-center justify-between border ${e.type === 'meeting' ? 'bg-primary/5 border-primary/20' : 'bg-brand-elec/5 border-brand-elec/20'}`}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm">{e.type === 'meeting' ? 'groups' : 'festival'}</span>
                      <span className="text-sm font-bold">{e.title}</span>
                    </div>
                    <span className="text-[8px] font-black uppercase">{e.branch}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">Tareas</h5>
                {getDayItems(selectedDate).pending.map(t => (
                  <div key={t.id} className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-orange-400">{t.title}</span>
                    <span className="text-[8px] font-black text-orange-500 uppercase">Activa</span>
                  </div>
                ))}
                {getDayItems(selectedDate).completed.map(t => (
                  <div key={t.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between opacity-50">
                    <span className="text-sm font-bold text-gray-400 line-through">{t.title}</span>
                    <span className="text-[8px] font-black text-gray-500 uppercase">Hecha por {t.completedBy?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowCreateModal(true)} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-glow">Añadir Evento</button>
              <button onClick={() => setSelectedDate(null)} className="flex-1 py-4 bg-white/5 text-gray-400 font-bold rounded-2xl uppercase text-[10px] tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Evento - Opciones Actualizadas y Estilizadas */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card-dark border border-white/10 w-full max-w-sm rounded-[40px] p-8 lg:p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8 text-center uppercase tracking-tighter">Nuevo Evento</h3>
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Nombre del evento</label>
                <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none text-white" placeholder="Ej: Reunión Telemetría" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Dirigido a</label>
                  <select 
                    value={newEvent.branch} 
                    onChange={e => setNewEvent({...newEvent, branch: e.target.value as any})} 
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none text-white focus:border-primary"
                  >
                    <option value="Global" className="bg-[#1a1a1a]">Global</option>
                    <option value="Eléctrica" className="bg-[#1a1a1a]">Eléctrica</option>
                    <option value="Mecánica" className="bg-[#1a1a1a]">Mecánica</option>
                    <option value="Administración" className="bg-[#1a1a1a]">Administración</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Tipo de evento</label>
                  <select 
                    value={newEvent.type} 
                    onChange={e => setNewEvent({...newEvent, type: e.target.value as any})} 
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-black uppercase outline-none text-white focus:border-primary"
                  >
                    <option value="meeting" className="bg-[#1a1a1a]">Reunión</option>
                    <option value="feria" className="bg-[#1a1a1a]">Feria</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-gray-500 text-[10px] font-black uppercase">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl shadow-glow text-[10px] uppercase tracking-widest">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
