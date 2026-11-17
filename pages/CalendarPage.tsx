import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { CalendarEvent, Branch, Task } from '../types';

type CalendarViewMode = 'grid' | 'timeline';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CalendarPage: React.FC = () => {
  const { events, tasks, setEvents, currentUser } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Start on November 2026 (current month of project)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 10, 1));
  const [viewMode, setViewMode] = useState<CalendarViewMode>('grid');
  const [branchFilter, setBranchFilter] = useState<Branch | 'Todas'>('Todas');

  const [newEvent, setNewEvent] = useState({
    title: '',
    branch: (currentUser?.branch || 'General') as Branch,
    type: 'meeting' as any
  });

  // Filter tasks based on branch filter
  const filteredTasks = useMemo(() => {
    if (branchFilter === 'Todas') return tasks;
    return tasks.filter(t => t.branch === branchFilter);
  }, [tasks, branchFilter]);

  // Calendar grid calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: Date[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = paddingDays; i > 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i + 1));
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Next month padding to fill grid
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentMonth]);

  // Task & Event mapping for a given date
  const getDayItems = (date: Date) => {
    const dStr = date.toDateString();

    const dayEvents = events.filter(e => {
      const matchDate = new Date(e.start).toDateString() === dStr;
      const matchBranch = branchFilter === 'Todas' || e.branch === 'Global' || e.branch === branchFilter;
      return matchDate && matchBranch;
    });

    // Tasks opened/started on this date (Lunes / Martes)
    const openedTasks = filteredTasks.filter(t => new Date(t.createdAt).toDateString() === dStr);

    // Tasks completed on this date (Viernes / Entrega)
    const completedTasks = filteredTasks.filter(t => 
      t.status === 'completed' && t.completedAt && new Date(t.completedAt).toDateString() === dStr &&
      new Date(t.createdAt).toDateString() !== dStr // Don't duplicate if same day
    );

    return { events: dayEvents, opened: openedTasks, completed: completedTasks };
  };

  // Branch badge color helper
  const getBranchBadgeStyle = (branch: Branch | string) => {
    switch (branch) {
      case 'Eléctrica':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Mecánica':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'Administración':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

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
    setNewEvent({ title: '', branch: (currentUser?.branch || 'General'), type: 'meeting' });
    setSelectedDate(null);
  };

  // Quick navigation helper
  const changeMonth = (delta: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + delta);
    setCurrentMonth(next);
  };

  const setSpecificMonth = (monthIndex: number) => {
    const next = new Date(currentMonth);
    next.setMonth(monthIndex);
    setCurrentMonth(next);
  };

  // Stats for the active month
  const monthStats = useMemo(() => {
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    const inMonthTasks = filteredTasks.filter(t => {
      const c = new Date(t.createdAt);
      return c.getFullYear() === curYear && c.getMonth() === curMonth;
    });
    return {
      total: inMonthTasks.length,
      completed: inMonthTasks.filter(t => t.status === 'completed').length,
      active: inMonthTasks.filter(t => t.status !== 'completed').length
    };
  }, [filteredTasks, currentMonth]);

  // Chronological timeline items for Timeline View
  const timelineDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const daysWithContent = [];

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      const items = getDayItems(d);
      if (items.events.length > 0 || items.opened.length > 0 || items.completed.length > 0) {
        daysWithContent.push({ date: d, ...items });
      }
    }
    return daysWithContent;
  }, [currentMonth, filteredTasks, events, branchFilter]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Calendario Oficial" subtitle="Planificación y Cronograma UPV Moto-E" />

      {/* Control Bar: Filters, Month Selector & Views */}
      <div className="bg-[#0d0d0d] border-b border-white/5 p-4 lg:px-6 space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Month Selector with quick jump */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                title="Mes anterior"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>

              <div className="px-3 text-center min-w-[140px]">
                <h3 className="text-base font-black text-white capitalize leading-tight">
                  {MONTH_NAMES[currentMonth.getMonth()]}
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">{currentMonth.getFullYear()}</span>
              </div>

              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                title="Mes siguiente"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>

            {/* Quick Season Jump Pills (Feb to Nov) */}
            <div className="hidden xl:flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(mIdx => (
                <button
                  key={mIdx}
                  onClick={() => setSpecificMonth(mIdx)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    currentMonth.getMonth() === mIdx
                      ? 'bg-primary text-black font-black shadow-glow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {MONTH_NAMES[mIdx].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle & Add Button */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-primary text-black shadow-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span className="hidden sm:inline">Mes</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-primary text-black shadow-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_timeline</span>
                <span className="hidden sm:inline">Cronograma</span>
              </button>
            </div>

            {/* New Event Button */}
            <button
              onClick={() => { setSelectedDate(new Date()); setShowCreateModal(true); }}
              className="bg-primary/20 hover:bg-primary text-primary hover:text-black border border-primary/30 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all shadow-glow active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden md:inline">Nuevo Evento</span>
            </button>
          </div>
        </div>

        {/* Branch Filter & Month Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['Todas', 'Mecánica', 'Eléctrica', 'Administración'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBranchFilter(b)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  branchFilter === b
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {monthStats.total} tareas en {MONTH_NAMES[currentMonth.getMonth()]}
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-emerald-400">✓ {monthStats.completed} completadas</span>
            {monthStats.active > 0 && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-amber-400">⏳ {monthStats.active} activas</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 lg:p-6 pb-24">
        {viewMode === 'grid' ? (
          /* ── 1. VISTA CUADRÍCULA (MES) ── */
          <div className="flex flex-col bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-[#141414] border-b border-white/10 text-center py-3">
              {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d, idx) => (
                <div
                  key={d}
                  className={`text-[11px] font-black uppercase tracking-widest ${
                    idx >= 5 ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 auto-rows-fr gap-[1px] bg-white/5">
              {calendarDays.map((date, i) => {
                const { events: dayEvents, opened, completed } = getDayItems(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                // Total items for this day
                const totalCount = dayEvents.length + opened.length + completed.length;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[115px] lg:min-h-[135px] flex flex-col p-2 cursor-pointer transition-all hover:bg-white/[0.04] border border-transparent hover:border-primary/20 ${
                      !isCurrentMonth
                        ? 'bg-[#0a0a0a] opacity-30'
                        : isWeekend
                        ? 'bg-[#0c0c0c]/80'
                        : 'bg-[#121212]'
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between mb-1.5 shrink-0">
                      <span
                        className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-primary text-black font-black shadow-[0_0_10px_rgba(0,204,136,0.6)]'
                            : !isCurrentMonth || isWeekend
                            ? 'text-gray-600'
                            : 'text-gray-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {totalCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white/10 text-gray-400">
                          {totalCount}
                        </span>
                      )}
                    </div>

                    {/* Task & Event Badges List */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                      {/* Events */}
                      {dayEvents.map(e => (
                        <div
                          key={e.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 truncate shadow-sm"
                          title={`Evento: ${e.title}`}
                        >
                          <span className="material-symbols-outlined text-[12px] shrink-0">event</span>
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}

                      {/* Tasks Started/Opened (Monday / Tuesday) */}
                      {opened.map(t => (
                        <div
                          key={`op-${t.id}`}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center justify-between gap-1 shadow-sm transition-all hover:brightness-125 ${getBranchBadgeStyle(
                            t.branch
                          )}`}
                          title={`[Inicio] ${t.title} (${t.subteam || t.branch})`}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[8px] font-black uppercase shrink-0 opacity-80">
                              [{t.branch.slice(0, 3)}]
                            </span>
                            <span className="truncate">{t.title}</span>
                          </div>
                          {t.status === 'completed' ? (
                            <span className="text-emerald-400 font-bold shrink-0 text-[10px]" title="Completada">✓</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="En curso"></span>
                          )}
                        </div>
                      ))}

                      {/* Tasks Completed (Friday / Deadline) */}
                      {completed.map(t => (
                        <div
                          key={`cp-${t.id}`}
                          className="px-2 py-0.5 rounded-lg text-[9px] font-medium bg-emerald-500/10 text-emerald-400/90 border border-emerald-500/20 flex items-center gap-1 truncate"
                          title={`[Entrega realizada] ${t.title}`}
                        >
                          <span className="text-[9px] font-bold">✓</span>
                          <span className="truncate">Fin: {t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── 2. VISTA CRONOGRAMA / TIMELINE (IDEAL MS1 CAPTURAS) ── */
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-card-dark/60 border border-white/10 p-4 rounded-3xl mb-6">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Cronograma de Actividad · {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Registro cronológico de tareas abiertas, finalizadas e hitos departamentales del mes.
              </p>
            </div>

            {timelineDays.length === 0 ? (
              <div className="bg-[#121212] border border-white/5 rounded-3xl p-12 text-center text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-40">event_busy</span>
                <p className="text-sm font-bold">No hay tareas ni eventos programados en este mes.</p>
              </div>
            ) : (
              timelineDays.map(({ date, events: dayEvents, opened, completed }, idx) => (
                <div
                  key={idx}
                  className="bg-[#121212] border border-white/5 hover:border-white/15 rounded-3xl p-4 lg:p-5 transition-all shadow-lg"
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] uppercase font-black text-primary leading-none">
                          {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </span>
                        <span className="text-base font-black text-white leading-none mt-0.5">
                          {date.getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white capitalize">
                          {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-bold">
                          {opened.length + completed.length} tareas · {dayEvents.length} eventos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className="space-y-2.5">
                    {/* Events */}
                    {dayEvents.map(e => (
                      <div
                        key={e.id}
                        className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                            <span className="material-symbols-outlined text-sm">groups</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{e.title}</span>
                            <span className="block text-[10px] text-indigo-300 font-bold uppercase">{e.type}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                          {e.branch}
                        </span>
                      </div>
                    ))}

                    {/* Opened Tasks */}
                    {opened.map(t => (
                      <div
                        key={`tl-op-${t.id}`}
                        className="p-3 bg-card-dark border border-white/5 hover:border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${getBranchBadgeStyle(t.branch)}`}>
                            <span className="material-symbols-outlined text-sm">
                              {t.status === 'completed' ? 'task_alt' : 'hourglass_top'}
                            </span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getBranchBadgeStyle(t.branch)}`}>
                                {t.branch}
                              </span>
                              {t.subteam && (
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                                  {t.subteam}
                                </span>
                              )}
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                t.priority === 'Alta' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {t.priority}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-white">{t.title}</h5>
                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{t.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {t.status === 'completed' ? (
                            <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase">
                              ✓ Completada
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-black uppercase animate-pulse">
                              En Curso
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Completed Tasks Delivery */}
                    {completed.map(t => (
                      <div
                        key={`tl-cp-${t.id}`}
                        className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold text-sm">✓</span>
                          <span className="text-xs font-semibold text-emerald-300">
                            Cierre de tarea: <span className="text-white font-bold">{t.title}</span>
                          </span>
                        </div>
                        <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                          Entregado
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Detalle del Día */}
      {selectedDate && !showCreateModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card-dark border border-white/10 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Detalle de Planificación</h4>
                <h3 className="text-xl font-black capitalize text-white">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
              {/* Eventos */}
              {getDayItems(selectedDate).events.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                    Eventos Oficiales
                  </h5>
                  {getDayItems(selectedDate).events.map(e => (
                    <div
                      key={e.id}
                      className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm text-indigo-400">
                          {e.type === 'meeting' ? 'groups' : 'festival'}
                        </span>
                        <span className="text-sm font-bold text-white">{e.title}</span>
                      </div>
                      <span className="text-[8px] font-black uppercase text-indigo-300">{e.branch}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tareas que inician */}
              {getDayItems(selectedDate).opened.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                    Tareas Iniciadas este día
                  </h5>
                  {getDayItems(selectedDate).opened.map(t => (
                    <div key={t.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getBranchBadgeStyle(t.branch)}`}>
                            {t.branch}
                          </span>
                          {t.subteam && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                              {t.subteam}
                            </span>
                          )}
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          t.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {t.status === 'completed' ? '✓ Completada' : 'En Curso'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{t.title}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tareas que finalizan */}
              {getDayItems(selectedDate).completed.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                    Tareas Entregadas este día
                  </h5>
                  {getDayItems(selectedDate).completed.map(t => (
                    <div key={t.id} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="text-xs font-bold text-white">{t.title}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-emerald-400">{t.branch}</span>
                    </div>
                  ))}
                </div>
              )}

              {getDayItems(selectedDate).events.length === 0 &&
                getDayItems(selectedDate).opened.length === 0 &&
                getDayItems(selectedDate).completed.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-6">No hay registros programados para este día.</p>
                )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 py-3.5 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-glow"
              >
                Añadir Evento
              </button>
              <button
                onClick={() => setSelectedDate(null)}
                className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-2xl uppercase text-[10px] tracking-widest"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Evento */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card-dark border border-white/10 w-full max-w-sm rounded-[40px] p-8 lg:p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-6 text-center uppercase tracking-tighter">Nuevo Evento</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">
                  Nombre del evento / hito
                </label>
                <input
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:border-primary outline-none text-white"
                  placeholder="Ej: Hito MS1 / Reunión de Área"
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">
                    Dirigido a
                  </label>
                  <select
                    value={newEvent.branch}
                    onChange={e => setNewEvent({ ...newEvent, branch: e.target.value as any })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3.5 text-[11px] font-black uppercase outline-none text-white focus:border-primary"
                  >
                    <option value="General">General (Todo el equipo)</option>
                    <option value="Eléctrica">Eléctrica</option>
                    <option value="Mecánica">Mecánica</option>
                    <option value="Administración">Administración</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">
                    Tipo de evento
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3.5 text-[11px] font-black uppercase outline-none text-white focus:border-primary"
                  >
                    <option value="meeting">Reunión de coordinación</option>
                    <option value="feria">Feria / Hito oficial</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3.5 text-gray-500 text-[10px] font-black uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-3.5 bg-primary text-black font-black rounded-2xl shadow-glow text-[10px] uppercase tracking-widest"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
