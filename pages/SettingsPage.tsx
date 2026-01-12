
import React, { useState, useMemo, useRef } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { supabase } from '../services/supabase';

const SettingsPage: React.FC = () => {
  const { currentUser, setCurrentUser, logout, tasks, entries, setUsers, addNotification, notifications } = useApp();
  const [activeTab, setActiveTab] = useState<'perfil' | 'estadisticas'>('perfil');
  const [resetStep, setResetStep] = useState<'idle' | 'sending' | 'waiting' | 'changing' | 'success'>('idle');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const myTasks = tasks.filter(t => t.createdBy === currentUser?.id);
    const completedByMe = tasks.filter(t => t.completedBy === currentUser?.name);

    return {
      proposed: myTasks.filter(t => t.status === 'proposed').length,
      completed: completedByMe.length,
      totalHours: currentUser?.totalHours.toFixed(1) || 0,
      totalCredits: currentUser?.totalCredits || 0,
      recentEntries: entries.filter(e => e.userId === currentUser?.id).slice(0, 5)
    };
  }, [tasks, entries, currentUser]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      try {
        // 1. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Optimistic UI Update using Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCurrentUser({ ...currentUser, avatar: base64 });
        };
        reader.readAsDataURL(file);

        // Actual Upload
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // 2. Persist to Profiles Table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', currentUser.id);

        if (updateError) throw updateError;

        // Final State Sync
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, avatar: publicUrl } : u));
        addNotification(currentUser.id, "Perfil Actualizado", "Tu nueva foto de perfil se ha guardado correctamente.");

      } catch (error: any) {
        console.error("Error uploading avatar:", error);
        alert("Error al guardar la foto de perfil: " + error.message);
      }
    }
  };

  const handleRequestReset = async () => {
    if (!currentUser?.email) return;

    setResetStep('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      alert("Error al enviar el correo: " + error.message);
      setResetStep('idle');
    } else {
      setResetStep('waiting');
    }
  };

  const confirmPasswordChange = async () => {
    if (newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (currentUser) {
      // Si el usuario ya está autenticado y quiere cambiar la contraseña directamente (flow alternativo)
      // Pero aquí seguimos el flujo de reset.
      // Sin embargo, si hemos llegado a 'changing' es porque tal vez queramos permitir cambio directo
      // si supabase.auth.updateUser funciona.
      // Dado que el usuario pidió "mail al correo" para el reset, el flujo principal termina en el mail.
      // El link del mail llevará a una página donde el usuario define la pass (que sería auth#recovery).

      // Si mantenemos este bloque para testing o cambio directo:
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        alert("Error al actualizar contraseña: " + error.message);
        return;
      }

      setResetStep('success');
      setTimeout(() => {
        setResetStep('idle');
        setNewPassword('');
      }, 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
      <Header title="Configuración" subtitle="Gestión de cuenta y rendimiento" />

      <div className="p-4 lg:p-8 flex flex-col h-full overflow-hidden">
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl w-fit mb-8 mx-auto lg:mx-0">
          <button onClick={() => setActiveTab('perfil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-primary text-black shadow-glow' : 'text-gray-500 hover:text-white'}`}>Perfil</button>
          <button onClick={() => setActiveTab('estadisticas')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'estadisticas' ? 'bg-primary text-black shadow-glow' : 'text-gray-500 hover:text-white'}`}>Estadísticas</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll pr-2">
          {activeTab === 'perfil' ? (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-card-dark border border-white/5 rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8 shadow-xl">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <img src={currentUser?.avatar} className="w-24 h-24 rounded-full border-4 border-primary shadow-glow object-cover transition-transform group-hover:scale-105" alt="Avatar" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">photo_camera</span>
                  </div>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-black text-white">{currentUser?.name}</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{currentUser?.branch} • {currentUser?.subteam}</p>
                  <div className="mt-4 inline-block bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    {currentUser?.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="bg-card-dark border border-white/5 rounded-[32px] p-8 shadow-xl">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">Seguridad</h4>

                {resetStep === 'idle' && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white mb-1">Restablecer Contraseña</p>
                      <p className="text-[10px] text-gray-500 leading-relaxed uppercase font-black">Te enviaremos un enlace seguro a {currentUser?.email}. Solo podrás cambiarla desde allí.</p>
                    </div>
                    <button onClick={handleRequestReset} className="w-full sm:w-auto px-6 py-3 bg-primary/10 text-primary border border-primary/30 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
                      Enviar Email
                    </button>
                  </div>
                )}

                {resetStep === 'sending' && (
                  <div className="py-12 text-center animate-pulse">
                    <span className="material-symbols-outlined text-primary text-5xl mb-4">outgoing_mail</span>
                    <p className="text-sm font-bold uppercase tracking-widest">Enviando correo seguro...</p>
                  </div>
                )}

                {resetStep === 'waiting' && (
                  <div className="bg-primary/5 border border-primary/20 p-8 rounded-3xl text-center animate-in zoom-in-95">
                    <span className="material-symbols-outlined text-primary text-4xl mb-4">mark_email_read</span>
                    <h5 className="text-sm font-bold mb-2">¡Correo enviado!</h5>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6">Hemos enviado un enlace de recuperación a <strong>{currentUser?.email}</strong>. Por favor revisa tu bandeja de entrada (y spam) para continuar.</p>
                    <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                      <button onClick={() => setResetStep('idle')} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Volver</button>
                    </div>
                  </div>
                )}

                {resetStep === 'changing' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-3 text-primary mb-2">
                      <span className="material-symbols-outlined">verified_user</span>
                      <p className="text-xs font-black uppercase tracking-widest">Acceso validado vía Email</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase ml-2 tracking-widest">Nueva Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-white/5 border border-primary/30 rounded-2xl px-5 pr-14 py-4 text-sm text-white focus:border-primary outline-none transition-all"
                          placeholder="Mínimo 4 caracteres"
                          autoFocus
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          <span className="material-symbols-outlined">{showPass ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>
                    <button onClick={confirmPasswordChange} className="w-full py-4 bg-primary text-black font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-glow">Guardar Nueva Contraseña</button>
                  </div>
                )}

                {resetStep === 'success' && (
                  <div className="py-12 text-center text-primary animate-in fade-in">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-4xl">task_alt</span>
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest">Contraseña actualizada</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Ya puedes usar tu nueva clave.</p>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="w-full py-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[32px] font-black text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
                Cerrar Sesión Actual
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="T. Propuestas" value={stats.proposed} icon="campaign" />
                <StatCard label="T. Completadas" value={stats.completed} icon="task_alt" />
                <StatCard label="Horas Totales" value={stats.totalHours} icon="schedule" />
                <StatCard label="Créditos" value={stats.totalCredits} icon="stars" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-card-dark border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </div>
  </div>
);

export default SettingsPage;
