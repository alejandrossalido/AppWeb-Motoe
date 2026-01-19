
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { User, Branch, Request, Role } from '../types';
import { supabase } from '../services/supabase';
import { ORGANIGRAMA } from '../constants';

const TeamMgmt: React.FC = () => {
  const { users, requests, setUsers, setRequests, currentUser, addNotification } = useApp();
  const [filter, setFilter] = useState<Branch | 'Todos'>('Todos');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // State for Edit Logic
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [pendingBranch, setPendingBranch] = useState<Branch>('Mecánica');
  const [pendingSubteam, setPendingSubteam] = useState<string>('');

  const [showVerify, setShowVerify] = useState(false);

  // Init edit state when opening modal
  useEffect(() => {
    if (editingUser) {
      setPendingRole(editingUser.role);
      setPendingBranch(editingUser.branch);
      setPendingSubteam(editingUser.subteam);
    }
  }, [editingUser]);

  // Update subteam options when branch changes or role changes
  useEffect(() => {
    if (pendingBranch && pendingRole === 'team_lead') {
      // If not 'General' subteam already selected, default to first option or General
      if (pendingSubteam !== 'General' && !ORGANIGRAMA[pendingBranch]?.includes(pendingSubteam)) {
        setPendingSubteam('General');
      }
    } else if (pendingBranch && pendingSubteam !== '' && !ORGANIGRAMA[pendingBranch]?.includes(pendingSubteam) && pendingSubteam !== 'General') {
      // Fallback for member: reset to first valid subteam
      const validSubteams = ORGANIGRAMA[pendingBranch];
      if (validSubteams && validSubteams.length > 0) {
        setPendingSubteam(validSubteams[0]);
      }
    }
  }, [pendingBranch, pendingRole]);


  const handleApprove = async (req: Request) => {
    // If request has a role (e.g. partner), use it. Otherwise default to member.
    // Also check if the user object in 'users' list (which contains pending users) has a role set.
    const pendingUser = users.find(u => u.id === req.uid);
    let roleToAssign = req.role || pendingUser?.role || 'member';

    // Fallback: If subteam is 'Partner', force role to 'partner' (fixes DB default issues)
    if (req.subteam === 'Partner') roleToAssign = 'partner';

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active', role: roleToAssign })
      .eq('id', req.uid);

    if (error) {
      console.error('Error approving user:', error);
      alert('Error al aprobar usuario en la base de datos.');
      return;
    }

    const newUser: User = {
      id: req.uid,
      name: req.fullName,
      email: `${req.uid}`,
      role: roleToAssign,
      branch: req.branch,
      subteam: req.subteam,
      status: 'active',
      totalHours: 0,
      totalCredits: 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fullName}`
    };

    setUsers(prev => [...prev, newUser]);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    addNotification('all', 'Nuevo Miembro', `${req.fullName} se ha unido al equipo ${req.branch}.`);
  };

  const confirmAction = async () => {
    if (editingUser && pendingRole) {
      const isGlobalRole = pendingRole === 'coordinator' || pendingRole === 'owner';
      const isPartner = pendingRole === 'partner';

      const updates = {
        role: pendingRole,
        branch: (isGlobalRole || isPartner) ? 'General' : pendingBranch,
        subteam: isGlobalRole ? 'Coordinación' : (isPartner ? 'Partner' : pendingSubteam)
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id);

      if (error) {
        console.error('Error updating role:', error);
        alert('Error al actualizar rol en la base de datos.');
        return;
      }

      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
      addNotification(editingUser.id, 'Cambio de Rango', `Tu rol ha sido actualizado a ${pendingRole}.`);
      setEditingUser(null);
      setPendingRole(null);
      setShowVerify(false);
      alert("Rol actualizado correctamente.");
    }
  };

  const handleExpel = (user: User) => {
    if (confirm(`¿Estás seguro de que deseas expulsar a ${user.name}?`)) {
      // Logic specific for expel could reuse confirmAction or be separate
      // For simplicity reusing editingUser flow but setting status would be better.
      // Assuming expel just removes/deactivates. 
      // Keeping previous logic hook (which just opened modal in original code, but seemed to want verification)
      // Correcting: original code opened verify modal. I will follow similar pattern but set pendingRole to role to avoid crash.
      setEditingUser(user);
      setPendingRole(user.role);
      // Note: Expel usually means deleting or status change. Original code was simpler.
      // I'll stick to 'Edit' flow as requested for Hierarchy. Expel is secondary.
    }
  };

  const filteredTeam = users.filter(m => {
    if (currentUser?.role === 'team_lead') {
      return m.status === 'active' && m.branch === currentUser.branch;
    }
    return m.status === 'active' && (filter === 'Todos' || m.branch === filter);
  });

  const canFilter = currentUser?.role === 'owner' || currentUser?.role === 'coordinator';

  // Helper for Role Label
  const getRoleLabel = (u: User) => {
    if (u.role === 'team_lead') {
      if (u.subteam === 'General') return `TL ${u.branch}`; // TL Mecánica
      return `TL ${u.subteam}`; // TL Chasis
    }
    return u.role.replace('_', ' ');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Gestión del Roster" subtitle="Miembros y Roles" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scroll">

        {/* Solicitudes */}
        {requests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              Solicitudes Pendientes ({requests.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {requests.map(req => (
                <div key={req.id} className="bg-card-dark border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fullName}`} className="w-10 h-10 rounded-full border border-white/10" alt="avatar" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{req.fullName}</p>
                      <p className="text-[9px] text-gray-500 font-bold">{req.branch} • {req.subteam}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(req)} className="flex-1 bg-primary text-black py-2 rounded-lg text-[9px] font-black uppercase">Aprobar</button>
                    <button onClick={() => setRequests(prev => prev.filter(r => r.id !== req.id))} className="flex-1 bg-white/5 text-white py-2 rounded-lg text-[9px] font-black uppercase">Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Miembros del Equipo */}
        <div className="bg-card-dark border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-6 border-b border-white/5 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Miembros Activos</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  {filteredTeam.length} usuarios {canFilter ? `en ${filter}` : `en ${currentUser?.branch}`}
                </p>
              </div>
            </div>

            {canFilter && (
              <div className="flex flex-wrap gap-1.5 bg-black/20 p-1 rounded-xl w-full lg:w-fit">
                {['Todos', 'Eléctrica', 'Mecánica', 'Administración'].map(b => (
                  <button
                    key={b}
                    onClick={() => setFilter(b as any)}
                    className={`flex-1 lg:flex-none px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${filter === b ? 'bg-primary text-black shadow-glow' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block overflow-x-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-8 py-4">Miembro</th>
                  <th className="px-8 py-4">Rama / Subgrupo</th>
                  <th className="px-8 py-4">Rol</th>
                  <th className="px-8 py-4 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTeam.map(member => (
                  <tr key={member.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={member.avatar} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt="avatar" />
                        <div>
                          <p className="text-sm font-black text-white">{member.name} {member.id === currentUser?.id && <span className="text-primary text-[10px] font-bold ml-1">(TÚ)</span>}</p>
                          <p className="text-[10px] text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase">{member.role === 'partner' ? 'GENERAL' : member.branch}</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase">{member.role === 'partner' ? 'PARTNER' : member.subteam}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-wide ${member.role === 'team_lead' ? 'bg-primary/10 text-primary border-primary/20' :
                          member.role === 'coordinator' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            member.role === 'owner' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                              member.role === 'partner' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                'text-gray-400 bg-white/5 border-white/5'
                        }`}>
                        {getRoleLabel(member)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {(member.id !== currentUser?.id || currentUser.role === 'owner') && (
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingUser(member)} className="p-2 text-gray-500 hover:text-white"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          {/* <button onClick={() => handleExpel(member)} className="p-2 text-red-500"><span className="material-symbols-outlined text-[18px]">person_remove</span></button> */}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View Omitted for Brevity but using same filteredTeam */}
          <div className="block lg:hidden p-4 space-y-3">
            {filteredTeam.map(member => (
              <div key={member.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={member.avatar} className="w-10 h-10 rounded-full border border-primary/20 object-cover" alt="p" />
                    <div>
                      <p className="text-xs font-black text-white">{member.name}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase">{getRoleLabel(member)}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingUser(member)} className="p-2 bg-white/5 rounded-lg text-gray-400">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && !showVerify && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-card-dark border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] custom-scroll">
            <div className="text-center mb-6">
              <img src={editingUser.avatar} className="w-16 h-16 rounded-full border-2 border-primary mx-auto mb-3 object-cover" alt="p" />
              <h3 className="text-xl font-black text-white">{editingUser.name}</h3>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{getRoleLabel(editingUser)}</p>
            </div>

            <div className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Asignar Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  {['member', 'team_lead', 'coordinator', 'owner', 'partner']
                    .filter(r => {
                      if (currentUser?.role === 'owner' || currentUser?.role === 'coordinator') return true;
                      // Team Leads can't assign global roles or partner
                      return ['member', 'team_lead'].includes(r);
                    })
                    .map(r => (
                      <button key={r} onClick={() => setPendingRole(r as Role)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${pendingRole === r ? 'bg-primary text-black border-primary shadow-glow' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
                        {r === 'team_lead' ? 'Team Lead' : r.replace('_', ' ')}
                      </button>
                    ))}
                </div>
              </div>

              {/* Hierarchy Selectors (Only for Team Lead & Member) */}
              {['team_lead', 'member'].includes(pendingRole || '') && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Rama Asignada</label>
                    <select
                      value={pendingBranch}
                      onChange={e => setPendingBranch(e.target.value as Branch)}
                      className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                    >
                      {['Mecánica', 'Eléctrica', 'Administración'].map(b => <option className="bg-[#1a1a1a]" key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
                      {pendingRole === 'team_lead' ? 'Alcance de Mando (Subequipo)' : 'Subequipo'}
                    </label>
                    <select
                      value={pendingSubteam}
                      onChange={e => setPendingSubteam(e.target.value)}
                      className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:border-primary outline-none"
                    >
                      {/* Special Option for TL */}
                      {pendingRole === 'team_lead' && (
                        <option className="bg-[#1a1a1a] text-primary font-bold" value="General">◈ Toda la Rama (General)</option>
                      )}
                      {ORGANIGRAMA[pendingBranch].map(sub => (
                        <option className="bg-[#1a1a1a]" key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-white/5 text-gray-500 font-bold rounded-2xl hover:text-white transition-all text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={() => setShowVerify(true)} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-glow">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showVerify && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card-dark border border-primary/20 w-full max-w-sm rounded-[40px] p-10 shadow-glow animate-in zoom-in-95">
            <div className="text-center mb-8">
              <span className="material-symbols-outlined text-primary text-4xl mb-4">admin_panel_settings</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirmar Jerarquía</h3>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-2 px-4">
                {pendingRole === 'team_lead' && pendingSubteam === 'General' ?
                  `Estás nombrando a este usuario como LÍDER SUPREMO de ${pendingBranch}.` :
                  `Aplicandorol ${pendingRole} en ${pendingSubteam}.`}
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={confirmAction} className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-glow">Confirmar Cambios</button>
              <button onClick={() => setShowVerify(false)} className="w-full py-3 text-gray-500 font-bold uppercase text-[9px]">Volver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMgmt;
