
import React, { useState, useEffect, useRef } from 'react';
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

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("El archivo es demasiado grande (Máx 5MB)");
        e.target.value = "";
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `sessions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('technical-files') // Reusing technical-files bucket
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('technical-files').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error(error);
      alert('Error subiendo archivo.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSession = async () => {
    if (!newSession.description.trim()) return alert("La descripción es obligatoria.");

    let fileUrl = undefined;
    if (file) {
      const uploadedUrl = await uploadFile(file);
      if (!uploadedUrl) return;
      fileUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from('work_sessions')
      .insert({
        user_id: currentUser?.id,
        branch: newSession.branch,
        subteam: newSession.subteam,
        description: newSession.description,
        duration_minutes: newSession.duration,
        file_url: fileUrl
      });

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setShowModal(false);
      setNewSession({ ...newSession, description: '' });
      setFile(null);
      fetchSessions();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Sesiones de Trabajo" subtitle="Registro de actividad del equipo" />

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
            <p className="text-center text-gray-500 animate-pulse">Cargando sesiones...</p>
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
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${session.branch === 'Eléctrica' ? 'text-brand-elec border-brand-elec/20 bg-brand-elec/5' :
                        session.branch === 'Mecánica' ? 'text-brand-mech border-brand-mech/20 bg-brand-mech/5' :
                          'text-gray-400 border-gray-500/20 bg-gray-500/5'
                        }`}>
                        {session.branch}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold mt-1">{session.duration_minutes} min</span>
                    </div>
                    {session.file_url && (
                      <a href={session.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-primary transition-colors">
                        <span className="material-symbols-outlined text-[14px]">attach_file</span>
                        Archivo
                      </a>
                    )}
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
          <div className="bg-card-dark w-full max-w-lg rounded-[32px] p-8 border border-white/10 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scroll">
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

            <div className="flex items-center justify-between mt-8 border-t border-white/5 pt-6">
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${file ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-white/10'}`}>
                  <span className="material-symbols-outlined text-[18px]">{file ? 'check_circle' : 'attach_file'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{file ? 'Listo' : 'Adjuntar'}</span>
                  <input type="file" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-6 py-3 bg-[#1a1a1a] hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">Cancelar</button>
                <button
                  onClick={handleSaveSession}
                  disabled={uploading}
                  className={`px-8 py-3 bg-primary text-black font-black rounded-xl uppercase text-xs tracking-widest hover:bg-primary-hover shadow-glow transition-all ${uploading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {uploading ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsLab;
