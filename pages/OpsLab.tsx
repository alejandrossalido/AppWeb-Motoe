
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { supabase } from '../services/supabase';
import { WorkSession, Branch } from '../types';
import { useLocation } from 'react-router-dom';

const OpsLab: React.FC = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Form State
  const [newSession, setNewSession] = useState({
    branch: currentUser?.branch || 'General',
    subteam: currentUser?.subteam || '',
    duration: 60,
    description: ''
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  // Deep Linking
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetId = params.get('id');
    if (targetId && !loading && sessions.length > 0) {
      setHighlightedId(targetId);
      const el = document.getElementById(`session-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedId(null), 3000);
      }
    }
  }, [location.search, loading, sessions]);

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_sessions')
      .select(`
        *,
        profiles:user_id ( full_name, avatar_url, role )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching sessions:", error);
    else if (data) setSessions(data as unknown as WorkSession[]);
    setLoading(false);
  };

  const handleSaveSession = async () => {
    if (!newSession.description.trim()) return alert("La descripción es obligatoria.");

    const { error } = await supabase
      .from('work_sessions')
      .insert({
        user_id: currentUser?.id,
        branch: newSession.branch,
        subteam: newSession.subteam,
        description: newSession.description,
        duration_minutes: newSession.duration
      });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setShowModal(false);
      setNewSession({ ...newSession, description: '' });
      fetchSessions();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Bitácora de Trabajo" subtitle="Registro de actividad del equipo" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scroll relative">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            <h3 className="text-xl font-bold text-white">Sesiones Recientes</h3>
            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs font-bold text-gray-400 flex items-center">{sessions.length}</span>
          </div>
          {currentUser?.role !== 'partner' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-black px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-glow hover:scale-105 transition-transform flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nueva Sesión
            </button>
          )}
        </div>

        {/* Sessions Feed */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {loading ? (
            <p className="text-center text-gray-500 animate-pulse">Cargando bitácora...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl">
              <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">history_edu</span>
              <p className="text-gray-500">No hay sesiones registradas.</p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                id={`session-${session.id}`}
                className={`bg-card-dark border rounded-2xl p-6 transition-all ${highlightedId === session.id ? 'border-primary shadow-[0_0_15px_rgba(0,204,136,0.3)] bg-primary/5' : 'border-white/5 hover:border-white/10'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={session.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.profiles?.full_name || 'User'}`}
                      className="w-10 h-10 rounded-full border border-white/10 object-cover"
                      alt="Avatar"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{session.profiles?.full_name || 'Usuario'}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                        {new Date(session.created_at).toLocaleDateString()} • {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${session.branch === 'Eléctrica' ? 'text-brand-elec border-brand-elec/20 bg-brand-elec/5' :
                      session.branch === 'Mecánica' ? 'text-brand-mech border-brand-mech/20 bg-brand-mech/5' :
                        'text-gray-400 border-gray-500/20 bg-gray-500/5'
                      }`}>
                      {session.branch}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold mt-1">{session.duration_minutes} min</span>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap pl-13 border-l-2 border-white/5 pl-4 ml-4">
                  {session.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card-dark w-full max-w-lg rounded-[32px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-white mb-6">Registrar Sesión</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 block">Rama</label>
                  <select
                    value={newSession.branch}
                    onChange={e => setNewSession({ ...newSession, branch: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                  >
                    <option className="bg-[#1a1a1a]" value="General">General</option>
                    <option className="bg-[#1a1a1a]" value="Mecánica">Mecánica</option>
                    <option className="bg-[#1a1a1a]" value="Eléctrica">Eléctrica</option>
                    <option className="bg-[#1a1a1a]" value="Administración">Administración</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 block">Duración (min)</label>
                  <input
                    type="number"
                    value={newSession.duration}
                    onChange={e => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 block">Subequipo</label>
                <input
                  value={newSession.subteam}
                  onChange={e => setNewSession({ ...newSession, subteam: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 block">Descripción del Trabajo</label>
                <textarea
                  value={newSession.description}
                  onChange={e => setNewSession({ ...newSession, description: e.target.value })}
                  placeholder="Ej: He soldado los conectores del BMS y verificado continuidad..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveSession} className="flex-1 py-4 bg-primary text-black font-black rounded-xl uppercase text-xs tracking-widest hover:bg-primary-hover shadow-glow transition-all">Guardar Sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsLab;
