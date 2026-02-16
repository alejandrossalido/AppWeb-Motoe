
import React, { useState } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { Task, TaskStatus, Branch, TimeEntry } from '../types';

const TasksPage: React.FC = () => {
  const { tasks, setTasks, currentUser, setEntries, entries, setCurrentUser } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>('proposed');

  // Default filter: 'Todas' for global roles (Owner, Coordinator, Partner), else User's branch
  const isGlobal = currentUser?.role === 'coordinator' || currentUser?.role === 'owner' || currentUser?.role === 'partner';
  const [filter, setFilter] = useState<Branch | 'Todas'>(isGlobal ? 'Todas' : (currentUser?.branch || 'Todas'));

  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'Media' as any, branch: currentUser?.branch || 'Mecánica', subteam: currentUser?.subteam || ''
  });

  // Role Helpers
  const isPartner = currentUser?.role === 'partner';
  const isMember = currentUser?.role === 'member';
  const isLeader = currentUser?.role === 'owner' || currentUser?.role === 'coordinator' || currentUser?.role === 'team_lead';
  // "canPublish" is effectively "isLeader" in this context
  const canPublish = isLeader;

  const handleCreateTask = () => {
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      ...newTask,
      status: targetStatus,
      icon: 'assignment',
      createdBy: currentUser?.id || 'u0',
      createdAt: new Date().toISOString()
    };
    setTasks([...tasks, task]);
    setShowModal(false);
    setNewTask({ title: '', description: '', priority: 'Media', branch: currentUser?.branch || 'Mecánica', subteam: currentUser?.subteam || '' });
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
        // 1. Create TimeEntry for History
        const newEntry: TimeEntry = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          clockIn: task.createdAt,
          clockOut: new Date().toISOString(),
          durationMinutes: 60, // Default duration for task completion
          summary: `Tarea Finalizada: ${task.title}`,
          status: 'validated'
        };
        setEntries([...entries, newEntry]);

        // 2. Award Credits - REMOVED
        // const updatedUser = {
        //   ...currentUser,
        //   totalCredits: currentUser.totalCredits + task.creditsValue
        // };
        // setCurrentUser(updatedUser);
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

    // Permission Logic for "Add Task" button
    let canAdd = false;
    if (status === 'proposed' && !isPartner) {
      canAdd = true; // Members+ can propose
    } else if (status === 'available' && canPublish) {
      canAdd = true; // Only Leaders+ can publish directly
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
                  <span className={`text-[7px] font-bold px-1 rounded uppercase ${task.priority === 'Alta' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>{task.priority}</span>
                </div>
              </div>
              <h4 className="text-sm font-bold text-white mb-1 leading-tight">{task.title}</h4>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed italic">"{task.description}"</p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400">
                  {/* Credits Removed */}
                </div>
                <div className="flex gap-1">
                  {/* Proposed -> Available (Publish): Only Leaders */}
                  {status === 'proposed' && canPublish && (
                    <>
                      <button onClick={() => handleAction(task.id, 'available')} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-black transition-all" title="Aprobar y Publicar"><span className="material-symbols-outlined text-[16px]">check</span></button>
                      <button onClick={() => handleAction(task.id, 'rejected')} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Denegar Propuesta"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </>
                  )}

                  {/* Available -> In Progress (Start): Everyone except Partner */}
                  {status === 'available' && !isPartner && (
                    <button onClick={() => handleAction(task.id, 'in_progress')} className="p-1.5 bg-primary text-black rounded-lg hover:bg-primary-hover transition-all" title="Empezar Tarea"><span className="material-symbols-outlined text-[16px]">play_arrow</span></button>
                  )}

                  {/* In Progress -> Completed (Finish): Assigned User OR Leaders */}
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
            <h3 className="text-2xl font-black mb-8 text-center">{targetStatus === 'proposed' ? 'Nueva Propuesta' : 'Publicar Tarea'}</h3>
            <div className="space-y-4">
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none" placeholder="Nombre de la tarea" />
              <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-primary outline-none resize-none" placeholder="Descripción técnica..." />
              <div className="grid grid-cols-2 gap-4">
                <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none">
                  <option value="Baja" className="bg-[#1a1a1a] text-white">Prioridad Baja</option>
                  <option value="Media" className="bg-[#1a1a1a] text-white">Prioridad Media</option>
                  <option value="Alta" className="bg-[#1a1a1a] text-white">Prioridad Alta</option>
                </select>
              </div>
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
