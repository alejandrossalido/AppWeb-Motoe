import React, { useState } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { Task, TaskStatus, Branch, TimeEntry } from '../types';
import { supabase } from '../services/supabase';
import { ORGANIGRAMA } from '../constants';

const SUPABASE_FUNCTIONS_URL = 'https://qijzycmrtiwqvvrfoahx.supabase.co/functions/v1';

const TasksPage: React.FC = () => {
  const { tasks, setTasks, currentUser, setEntries, entries, users } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

  // Default filter: 'Todas' for global roles (Owner, Coordinator, Partner), else User's branch
  const isGlobal = currentUser?.role === 'coordinator' || currentUser?.role === 'owner' || currentUser?.role === 'partner';
  const [filter, setFilter] = useState<Branch | 'Todas'>(isGlobal ? 'Todas' : (currentUser?.branch || 'Todas'));

  // Role helpers
  const role = currentUser?.role;
  const userBranch = currentUser?.branch as Branch | undefined;
  const userSubteam = currentUser?.subteam;
  const isAdmin = role === 'owner' || role === 'coordinator';
  const isBranchLead = role === 'team_lead' && (userSubteam === 'General' || userSubteam === 'Coordinación');
  const isSubteamLead = role === 'team_lead' && userSubteam && userSubteam !== 'General' && userSubteam !== 'Coordinación';
  const isPartner = role === 'partner';
  const isLeader = isAdmin || role === 'team_lead';
  const canPublish = isLeader;

  // Available branches/subteams in modal based on role
  const availableBranches: Branch[] = isAdmin
    ? ['Eléctrica', 'Mecánica', 'Administración']
    : userBranch ? [userBranch] : [];

  const getAvailableSubteams = (branch: Branch): string[] => {
    if (isAdmin) return ORGANIGRAMA[branch] || [];
    if (isBranchLead && userBranch === branch) return ORGANIGRAMA[userBranch] || [];
    if (isSubteamLead) return userSubteam ? [userSubteam] : [];
    return [];
  };

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Media' as 'Baja' | 'Media' | 'Alta',
    branch: (isAdmin ? 'Eléctrica' : userBranch) as Branch,
    subteam: isSubteamLead ? (userSubteam ?? '') : '',
  });

  const handleBranchChange = (branch: Branch) => {
    const subs = getAvailableSubteams(branch);
    setNewTask(prev => ({ ...prev, branch, subteam: subs[0] ?? '' }));
  };

  const sendEmailNotification = async (title: string, body: string, scope: string, value: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/gmail-sender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, target_scope: scope, target_value: value }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn('[gmail-sender] non-blocking error:', err);
      } else {
        const data = await res.json();
        console.log(`[gmail-sender] ✅ sent to ${data.sentTo} recipients`);
      }
    } catch (err) {
      console.warn('[gmail-sender] fetch error:', err);
    }
  };

  const handleCreateTask = async () => {
    const task: Task = {
      id: crypto.randomUUID(),
      ...newTask,
      status: targetStatus,
      icon: 'assignment',
      createdBy: currentUser?.id || 'u0',
      createdAt: new Date().toISOString()
    };

    setTasks([...tasks, task]);
    setShowModal(false);
    setNewTask({
      title: '',
      description: '',
      priority: 'Media',
      branch: (isAdmin ? 'Eléctrica' : userBranch) as Branch,
      subteam: isSubteamLead ? (userSubteam ?? '') : '',
    });

    const { error: insertError } = await supabase.from('tasks').insert([{
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      branch: task.branch,
      subteam: task.subteam,
      icon: task.icon,
      created_by: task.createdBy,
      created_at: task.createdAt
    }]);

    if (!insertError) {
      const notifScope = task.subteam ? 'subteam' : 'branch';
      const notifTarget = task.subteam || task.branch;

      if (notifTarget) {
        const notifTitle = `NUEVA TAREA: ${task.title}`;
        const notifBody = `Se ha publicado una nueva tarea para ${notifTarget}:\n"${task.description}"\n\nEntra en la app para más detalles y para unirte a ella.`;

        await supabase.rpc('send_broadcast_notification', {
          title: notifTitle,
          body: notifBody,
          target_scope: notifScope,
          target_value: notifTarget,
        });

        sendEmailNotification(notifTitle, notifBody, notifScope, notifTarget);
      }
    } else {
      console.error('Error inserting task:', insertError);
    }
  };

  const handleAction = async (tid: string, nextStatus: TaskStatus) => {
    const taskIndex = tasks.findIndex(t => t.id === tid);
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];

    const updatedTasks = [...tasks];
    const update: Partial<Task> = { status: nextStatus };

    if (nextStatus === 'in_progress') {
      update.assignedTo = currentUser?.id;
    }

    if (nextStatus === 'completed') {
      update.completedAt = new Date().toISOString();
      update.completedBy = currentUser?.name;

      if (currentUser) {
        const newEntry: TimeEntry = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          clockIn: task.createdAt,
          clockOut: new Date().toISOString(),
          durationMinutes: 60,
          summary: `Tarea Finalizada: ${task.title}`,
          status: 'validated'
        };
        setEntries([...entries, newEntry]);
      }
    }

    updatedTasks[taskIndex] = { ...task, ...update };
    setTasks(updatedTasks);

    await supabase.from('tasks').update({
      status: nextStatus,
      assigned_to: update.assignedTo,
      completed_at: update.completedAt
    }).eq('id', tid);
  };

  const openCreateModal = (status: TaskStatus = 'available') => {
    setTargetStatus(status);
    setShowModal(true);
  };

  const getBranchBadgeStyle = (branch: Branch | string) => {
    switch (branch) {
      case 'Eléctrica':
        return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
      case 'Mecánica':
        return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
      case 'Administración':
        return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
      default:
        return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  const getUserName = (uid?: string) => {
    if (!uid) return null;
    const u = users.find(usr => usr.id === uid);
    return u ? u.name : null;
  };

  const renderColumn = (status: TaskStatus, title: string, colorClass: string) => {
    const filtered = tasks.filter(t => {
      const matchStatus = t.status === status;
      const matchBranch = filter === 'Todas' || t.branch === filter;
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.subteam && t.subteam.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchBranch && matchSearch;
    });

    const canAdd = status === 'available' && canPublish;

    return (
      <div className="flex flex-col w-full h-full bg-[#111111]/80 border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden min-w-0">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`}></span>
            {title}
          </h3>
          <span className="text-[11px] font-black bg-white/10 px-2.5 py-0.5 rounded-full text-white">
            {filtered.length}
          </span>
        </div>

        {/* Scrollable Column Cards List */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1.5 flex flex-col gap-3.5 pb-28 min-h-0">
          {filtered.map(task => {
            const assignedName = getUserName(task.assignedTo);
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskDetail(task)}
                className="bg-card-dark border border-white/5 hover:border-white/20 rounded-2xl p-4 shadow-xl transition-all cursor-pointer group hover:bg-[#1f1f1f]"
              >
                {/* Badges & Meta */}
                <div className="flex justify-between items-start mb-2.5">
                  <div className="p-1.5 bg-white/5 rounded-lg text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{task.icon || 'assignment'}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${getBranchBadgeStyle(task.branch)}`}>
                      {task.branch}
                    </span>
                    {task.subteam && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase bg-white/5 text-gray-400">
                        {task.subteam}
                      </span>
                    )}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                      task.priority === 'Alta' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h4 className="text-sm font-bold text-white mb-1.5 leading-snug group-hover:text-primary transition-colors">
                  {task.title}
                </h4>
                <p className="text-xs text-gray-400 mb-3.5 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                {/* Footer: User & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] text-gray-500 font-bold" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    {assignedName ? (
                      <span className="truncate text-gray-300">👤 {assignedName.split(' ')[0]}</span>
                    ) : task.completedBy ? (
                      <span className="truncate text-emerald-400">✓ {task.completedBy.split(' ')[0]}</span>
                    ) : (
                      <span className="text-gray-600">Sin asignar</span>
                    )}
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex gap-1 shrink-0">
                    {status === 'available' && !isPartner && (
                      <button
                        onClick={() => handleAction(task.id, 'in_progress')}
                        className="px-2.5 py-1 bg-primary text-black font-black rounded-lg hover:bg-primary-hover transition-all flex items-center gap-1 text-[10px]"
                        title="Empezar Tarea"
                      >
                        <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                        <span>Tomar</span>
                      </button>
                    )}
                    {status === 'in_progress' && (task.assignedTo === currentUser?.id || canPublish) && !isPartner && (
                      <button
                        onClick={() => handleAction(task.id, 'completed')}
                        className="px-2.5 py-1 bg-primary text-black font-black rounded-lg hover:bg-primary-hover transition-all flex items-center gap-1 text-[10px]"
                        title="Finalizar Tarea"
                      >
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                        <span>Completar</span>
                      </button>
                    )}
                    {status === 'completed' && (
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>Lista</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {canAdd && (
            <button
              onClick={() => openCreateModal('available')}
              className="w-full py-3.5 border-2 border-dashed border-white/10 hover:border-primary/40 rounded-2xl text-gray-500 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-1"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Añadir Tarea</span>
            </button>
          )}

          {filtered.length === 0 && !canAdd && (
            <div className="py-12 text-center text-gray-600 text-xs font-bold">
              No hay tareas en esta columna
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Tablero de Tareas" subtitle="Gestión ágil de ingeniería UPV Moto-E" />

      {/* Top Filter, Search & Create Bar */}
      <div className="p-4 lg:px-6 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 bg-[#0d0d0d] gap-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['Todas', 'Eléctrica', 'Mecánica', 'Administración'] as const).map(b => (
            <button
              key={b}
              onClick={() => setFilter(b)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                filter === b
                  ? 'bg-primary text-black border-primary shadow-glow'
                  : 'bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/10'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input for fast task lookup */}
          <div className="relative min-w-[220px] max-w-sm flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar tarea, subequipo..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-primary outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {canPublish && (
            <button
              onClick={() => openCreateModal('available')}
              className="bg-primary text-black font-black px-4 py-2 rounded-2xl flex items-center gap-1.5 text-xs shadow-glow active:scale-95 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Nueva Tarea</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Balanced Columns (Disponibles, En Curso, Finalizadas) filling 100% width cleanly */}
      <div className="flex-1 overflow-hidden p-4 lg:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 h-full min-h-0">
        {renderColumn('available', 'Disponibles', 'bg-blue-500')}
        {renderColumn('in_progress', 'En Curso', 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]')}
        {renderColumn('completed', 'Finalizadas', 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]')}
      </div>

      {/* Modal Detalle Completo de Tarea */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card-dark border border-white/10 w-full max-w-lg rounded-[32px] p-6 lg:p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${getBranchBadgeStyle(selectedTaskDetail.branch)}`}>
                  {selectedTaskDetail.branch}
                </span>
                {selectedTaskDetail.subteam && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-lg uppercase bg-white/5 text-gray-300">
                    {selectedTaskDetail.subteam}
                  </span>
                )}
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg uppercase ${
                  selectedTaskDetail.priority === 'Alta' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  Prioridad {selectedTaskDetail.priority}
                </span>
              </div>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <h3 className="text-xl font-bold text-white mb-3">{selectedTaskDetail.title}</h3>
            <p className="text-sm text-gray-300 leading-relaxed bg-white/[0.02] p-4 rounded-2xl border border-white/5 mb-6">
              {selectedTaskDetail.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-gray-400">
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Estado</span>
                <span className="text-white font-bold capitalize">{selectedTaskDetail.status}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Fecha de Apertura</span>
                <span className="text-white font-bold">
                  {new Date(selectedTaskDetail.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="py-3 px-6 bg-primary text-black font-black rounded-xl text-xs uppercase tracking-wider"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Tarea */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card-dark border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-8 text-center text-white">
              Publicar Tarea
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest pl-2">Título de la Tarea</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none"
                  placeholder="Ej: Calibrar acelerómetro"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest pl-2">Descripción</label>
                <textarea
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-primary outline-none h-24 resize-none"
                  placeholder="Describe la tarea y objetivos..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest pl-2">Rama</label>
                  <select
                    value={newTask.branch}
                    onChange={e => handleBranchChange(e.target.value as Branch)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary"
                  >
                    {availableBranches.map(b => (
                      <option key={b} value={b} className="bg-[#1a1a1a]">{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest pl-2">Subequipo</label>
                  <select
                    value={newTask.subteam}
                    onChange={e => setNewTask({ ...newTask, subteam: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-primary"
                  >
                    {getAvailableSubteams(newTask.branch).map(s => (
                      <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest pl-2">Prioridad</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['Baja', 'Media', 'Alta'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, priority: p })}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        newTask.priority === p
                          ? 'bg-primary text-black border-primary shadow-glow'
                          : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 text-gray-500 text-xs font-black uppercase hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTask}
                className="flex-1 py-4 bg-primary text-black font-black rounded-2xl shadow-glow text-xs uppercase tracking-widest"
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

export default TasksPage;
