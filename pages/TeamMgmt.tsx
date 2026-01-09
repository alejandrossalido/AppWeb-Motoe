
import React, { useState } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { User, Branch, Request, Role } from '../types';

const TeamMgmt: React.FC = () => {
  const { users, requests, setUsers, setRequests, currentUser, addNotification } = useApp();
  const [filter, setFilter] = useState<Branch | 'Todos'>('Todos');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');

  const handleApprove = (req: Request) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: req.fullName,
      email: `${req.uid}@epsamoto.es`,
      password: '123',
      role: 'member',
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
    alert(`Usuario ${req.fullName} aprobado con éxito.`);
  };

  const requestRoleUpdate = (role: Role) => {
    setPendingRole(role);
    setShowVerify(true);
  };

  const confirmAction = () => {
    // Se ha eliminado la comprobación de contraseña por petición del usuario
    if (editingUser && pendingRole) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: pendingRole } : u));
      addNotification(editingUser.id, 'Cambio de Rango', `Tu rol ha sido actualizado a ${pendingRole}.`);
      setEditingUser(null);
      setPendingRole(null);
      setShowVerify(false);
      setVerifyPassword('');
      alert("Rol actualizado correctamente.");
    }
  };

  const handleExpel = (user: User) => {
    if (confirm(`¿Estás seguro de que deseas expulsar a ${user.name}?`)) {
      setEditingUser(user);
      setPendingRole(user.role);
      setShowVerify(true);
    }
  };

  const filteredTeam = users.filter(m => m.status === 'active' && (filter === 'Todos' || m.branch === filter));

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
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{filteredTeam.length} usuarios en {filter}</p>
              </div>
            </div>

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
          </div>

          <div className="block lg:hidden p-4 space-y-3">
            {filteredTeam.map(member => (
              <div key={member.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={member.avatar} className="w-10 h-10 rounded-full border border-primary/20 object-cover" alt="p" />
                    <div>
                      <p className="text-xs font-black text-white">{member.name} {member.id === currentUser?.id && <span className="text-primary text-[8px]">(TÚ)</span>}</p>
                      <p className="text-[9px] text-gray-500 font-bold">{member.email}</p>
                    </div>
                  </div>
                  {member.id !== currentUser?.id && (
                    <button onClick={() => setEditingUser(member)} className="p-2 bg-white/5 rounded-lg text-gray-400">
                      <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                    member.branch === 'Eléctrica' ? 'text-brand-elec border-brand-elec/30' : member.branch === 'Mecánica' ? 'text-brand-mech border-brand-mech/30' : 'text-brand-admin border-brand-admin/30'
                  }`}>{member.branch}</span>
                  <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{member.role.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
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
                        <span className="text-[10px] font-black text-white uppercase">{member.branch}</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase">{member.subteam}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">{member.role.replace('_', ' ')}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      {member.id !== currentUser?.id && (
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingUser(member)} className="p-2 text-gray-500 hover:text-white"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button onClick={() => handleExpel(member)} className="p-2 text-red-500"><span className="material-symbols-outlined text-[18px]">person_remove</span></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && !showVerify && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-card-dark border border-white/10 w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="text-center mb-8">
                 <img src={editingUser.avatar} className="w-16 h-16 rounded-full border-2 border-primary mx-auto mb-3 object-cover" alt="p" />
                 <h3 className="text-xl font-black text-white">{editingUser.name}</h3>
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{editingUser.branch}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Nuevo Rol para el Miembro</label>
                <div className="grid grid-cols-2 gap-2">
                  {['member', 'team_lead', 'coordinator', 'owner'].map(r => (
                    <button key={r} onClick={() => requestRoleUpdate(r as Role)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${editingUser.role === r ? 'bg-primary text-black border-primary shadow-glow' : 'bg-white/5 text-gray-500 border-white/5 hover:text-white'}`}>
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="w-full mt-8 py-4 bg-white/5 text-gray-500 font-bold rounded-2xl hover:text-white transition-all text-xs uppercase tracking-widest">Cancelar</button>
           </div>
        </div>
      )}

      {showVerify && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card-dark border border-primary/20 w-full max-w-sm rounded-[40px] p-10 shadow-glow animate-in zoom-in-95">
             <div className="text-center mb-8">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">security</span>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Confirmar Acción</h3>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-2 px-4">Haz clic en confirmar para aplicar los cambios de rango.</p>
             </div>
             <div className="flex flex-col gap-3 mt-8">
               <button onClick={confirmAction} className="w-full py-4 bg-primary text-black font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-glow">Confirmar</button>
               <button onClick={() => { setShowVerify(false); }} className="w-full py-3 text-gray-500 font-bold uppercase text-[9px]">Cancelar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMgmt;
