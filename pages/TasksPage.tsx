
import React, { useState } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { Task, TaskStatus, Branch, TimeEntry } from '../types';
import { supabase } from '../services/supabase';
import { ORGANIGRAMA } from '../constants';

const SUPABASE_FUNCTIONS_URL = 'https://qijzycmrtiwqvvrfoahx.supabase.co/functions/v1';

const TasksPage: React.FC = () => {
  const { tasks, setTasks, currentUser, setEntries, entries } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>('proposed');

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

  // Determine available branches/subteams in modal based on role
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

  // When branch changes in modal, reset subteam
  const handleBranchChange = (branch: Branch) => {
    const subs = getAvailableSubteams(branch);
    setNewTask(prev => ({ ...prev, branch, subteam: subs[0] ?? '' }));
  };

  // ─── Send email helper ────────────────────────────────────────────────────────
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
      id: Math.random().toString(36).substr(2, 9),
      ...newTask,
      status: targetStatus,
      icon: 'assignment',
      createdBy: currentUser?.id || 'u0',
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    setTasks([...tasks, task]);
    setShowModal(false);
    setNewTask({
      title: '',
      description: '',
      priority: 'Media',
      branch: (isAdmin ? 'Eléctrica' : userBranch) as Branch,
      subteam: isSubteamLead ? (userSubteam ?? '') : '',
    });

    // Save task to Supabase
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
      // Determine notification scope
      const notifScope = task.subteam ? 'subteam' : 'branch';
      const notifTarget = task.subteam || task.branch;

      if (notifTarget) {
        const notifTitle = `NUEVA TAREA: ${task.title}`;
        const notifBody = `Se ha publicado una nueva tarea para ${notifTarget}:\n"${task.description}"\n\nEntra en la app para más detalles y para unirte a ella.`;

        // 1. In-app notification
        await supabase.rpc('send_broadcast_notification', {
          title: notifTitle,
          body: notifBody,
          target_scope: notifScope,
          target_value: notifTarget,
        });

        // 2. Email notification (non-blocking)
        sendEmailNotification(notifTitle, notifBody, notifScope, notifTarget);
      }
    } else {
      console.error('Error inserting task:', insertError);
    }
  };

  const handleAction = (tid: string, nextStatus: TaskStatus) => {
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
  };

  const openCreateModal = (status: TaskStatus) => {
    setTargetStatus(status);
    setShowModal(true);
  };

  const renderColumn = (status: TaskStatus, title: string) => {
    const filtered = tasks.filter(t => t.status === status && (filter === 'Todas' || t.branch === filter));

    let canAdd = false;
    if (status === 'proposed' && !isPartner) {
      canAdd = true;
    } else if (status === 'available' && canPublish) {
      canAdd = true;
    }

    return (
      <div className="flex flex-col gap-4 min-w-[280px] lg:min-w-[300px] flex-1">
        <div className="flex items-center justify-between px-2 bg-white/[0.02] p-3 rounded-xl lg:bg-transparent">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'proposed' ? 'bg-orange-500' :
              status === 'available' ? 'bg-blue-500' :
                status === 'in_progress' ? 'bg-primary shadow-[0_0_8px_rgba(0,204,136,0.5)]' :
                  'bg-gray-600'
              }`}></span>
            {title}
          </h3>
          <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded-full text-gray-400">{filtered.length}</span>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map(task => (
            <div key={task.id} className="bg-card-dark border border-white/5 rounded-2xl p-4 shadow-xl hover:border-white/10 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="p-1.5 bg-white/5 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-[18px]">{task.icon}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${task.branch === 'Eléctrica' ? 'text-brand-elec border-brand-elec/30' : task.branch === 'Mecánica' ? 'text-brand-mech border-brand-mech/30' : 'text-brand-admin border-brand-admin/30'
                    }`}>{task.branch}</span>
                  {task.subteam && (
                    <span className="text-[7px] font-bold px-1 rounded uppercase bg-white/5 text-gray-500">{task.subteam}</span>
                  )}
                  <span className={`text-[7px] font-bold px-1 rounded uppercase ${task.priority === 'Alta' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>{task.priority}</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-white mb-1 leading-tight">{task.title}</h4>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed italic">"{task.description}"</p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400"></div>
                <div className="flex gap-1">
                  {status === 'proposed' && canPublish && (
                    <>
                      <button onClick={() => handleAction(task.id, 'available')} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-black transition-all" title="Aprobar y Publicar"><span className="material-symbols-outlined text-[16px]">check</span></button>
                      <button onClick={() => handleAction(task.id, 'rejected')} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Denegar Propuesta"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </>
                  )}
                  {status === 'available' && !isPartner && (
                    <button onClick={() => handleAction(task.id, 'in_progress')} className="p-1.5 bg-primary text-black rounded-lg hover:bg-primary-hover transition-all" title="Empezar Tarea"><span className="material-symbols-outlined text-[16px]">play_arrow</span></button>
                  )}
                  {status === 'in_progress' && (task.assignedTo === currentUser?.id || canPublish) && !isPartner && (
                    <button onClick={() => handleAction(task.id, 'completed')} className="p-1.5 bg-primary text-black rounded-lg hover:bg-primary-hover transition-all" title="Finalizar Tarea"><span className="material-symbols-outlined text-[16px]">done_all</span></button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {canAdd && (
            <button
              onClick={() => openCreateModal(status)}
              className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-gray-600 hover:text-primary hover:border-primary/30 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              {status === 'proposed' ? 'Proponer' : 'Publicar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Tablero de Tareas" subtitle="Gestión ágil de tareas" />

      <div className="p-4 lg:p-6 flex flex-col lg:flex-row lg:items-center justify-between border-b border-white/5 bg-background-dark gap-4">
        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2 lg:pb-0">
          {['Todas', 'Eléctrica', 'Mecánica', 'Administración'].map(b => (
            <button key={b} onClick={() => setFilter(b as any)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filter === b ? 'bg-primary text-black shadow-glow' : 'bg-white/5 text-gray-500 hover:text-white'}`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-x-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-8 custom-scroll">
        {renderColumn('proposed', 'Propuestas')}
        {renderColumn('available', 'Disponibles')}
        {renderColumn('in_progress', 'En Curso')}
        {renderColumn('completed', 'Finalizadas')}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card-dark border border-white/10 w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-8 text-center">
              {targetStatus === 'proposed' ? 'Nueva Propuesta' : 'Publicar Tarea'}
            </h3>
            <div className="space-y-4">
              <input
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                placeholder="Nombre de la tarea"
              />
              <textarea
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-primary outline-none resize-none"
                placeholder="Descripción técnica..."
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                >
                  <option value="Baja" className="bg-[#1a1a1a] text-white">Prioridad Baja</option>
                  <option value="Media" className="bg-[#1a1a1a] text-white">Prioridad Media</option>
                  <option value="Alta" className="bg-[#1a1a1a] text-white">Prioridad Alta</option>
                </select>

                {/* Branch — fixed for branch/subteam leads, selectable for admins */}
                {availableBranches.length > 1 ? (
                  <select
                    value={newTask.branch}
                    onChange={e => handleBranchChange(e.target.value as Branch)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                  >
                    {availableBranches.map(b => (
                      <option key={b} value={b} className="bg-[#1a1a1a] text-white">{b}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-primary font-bold flex items-center">
                    {newTask.branch}
                  </div>
                )}
              </div>

              {/* Subteam selector */}
              {getAvailableSubteams(newTask.branch).length > 1 ? (
                <select
                  value={newTask.subteam}
                  onChange={e => setNewTask({ ...newTask, subteam: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none"
                >
                  <option value="" className="bg-[#1a1a1a] text-gray-400">— Toda la rama (sin subequipo) —</option>
                  {getAvailableSubteams(newTask.branch).map(s => (
                    <option key={s} value={s} className="bg-[#1a1a1a] text-white">{s}</option>
                  ))}
                </select>
              ) : getAvailableSubteams(newTask.branch).length === 1 ? (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4 text-sm text-primary font-bold text-center">
                  Subequipo: {getAvailableSubteams(newTask.branch)[0]}
                </div>
              ) : null}
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={handleCreateTask} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl shadow-glow uppercase text-[10px] tracking-widest">Crear Tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
