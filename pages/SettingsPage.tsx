
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { supabase } from '../services/supabase';
import { ORGANIGRAMA } from '../constants';
import { Branch } from '../types';
import { messaging, VAPID_KEY } from '../services/firebase';
import { getToken } from 'firebase/messaging';

const SettingsPage: React.FC = () => {
  const { currentUser, logout } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Notification State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [targetScope, setTargetScope] = useState<'global' | 'branch' | 'subteam'>('branch');
  const [targetValue, setTargetValue] = useState<string>('Eléctrica');
  const [sending, setSending] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false); // Accordion state

  // Manual Notification Toggle State
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  // Check initial state
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!currentUser) return;

      const { data } = await supabase
        .from('user_fcm_tokens')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (data) {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    };

    checkNotificationStatus();
  }, [currentUser]);

  const handleToggleNotifications = async () => {
    setIsLoadingNotifs(true);

    if (!notificationsEnabled) {
      // Turn ON
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (token && currentUser) {
            await supabase.from('user_fcm_tokens').upsert({
              user_id: currentUser.id,
              token: token,
              platform: 'web'
            });
            setNotificationsEnabled(true);
            console.log('FCM Token registered manually:', token);
          }
        } else {
          alert("Las notificaciones están bloqueadas en tu navegador. Por favor, habilítalas en la configuración del sitio (candado url).");
          setNotificationsEnabled(false);
        }
      } catch (err) {
        console.error('Error enabling notifications:', err);
        alert('Error al activar notificaciones.');
      }
    } else {
      // Turn OFF
      try {
        if (currentUser) {
          // Remove from DB (Primary action)
          await supabase.from('user_fcm_tokens').delete().eq('user_id', currentUser.id);
          setNotificationsEnabled(false);
        }
      } catch (err) {
        console.error('Error disabling notifications:', err);
      }
    }

    setIsLoadingNotifs(false);
  };

  // Profile Image Logic
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploading(true);

      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentUser?.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', currentUser?.id);

        if (dbError) throw dbError;

        alert('Foto de perfil actualizada. Recarga para ver cambios.');

      } catch (error: any) {
        console.error('Error uploading avatar:', error);
        alert('Error al subir la imagen.');
      } finally {
        setUploading(false);
      }
    }
  };

  // Notification Logic
  const canSendGlobal = currentUser?.role === 'owner' || currentUser?.role === 'coordinator';
  const isBranchLead = currentUser?.role === 'team_lead' && currentUser?.subteam === 'General';
  const isSubteamLead = currentUser?.role === 'team_lead' && currentUser?.subteam !== 'General';

  const availableScopes = [
    ...(canSendGlobal ? [{ value: 'global', label: 'Toda la Escudería' }] : []),
    ...((canSendGlobal || isBranchLead) ? [{ value: 'branch', label: 'Por Rama' }] : []),
    { value: 'subteam', label: 'Por Subequipo' }
  ];

  const getTargetOptions = () => {
    if (targetScope === 'global') return [];

    if (targetScope === 'branch') {
      if (canSendGlobal) return ['Eléctrica', 'Mecánica', 'Administración'];
      if (isBranchLead) return [currentUser?.branch];
      return [];
    }

    if (targetScope === 'subteam') {
      if (canSendGlobal) {
        const allOptions: string[] = [];
        Object.keys(ORGANIGRAMA).forEach(b => {
          ORGANIGRAMA[b as Branch].forEach(s => allOptions.push(`${s} (${b})`));
        });
        return allOptions;
      }
      if (isBranchLead) {
        return ORGANIGRAMA[currentUser?.branch as Branch] || [];
      }
      if (isSubteamLead) {
        return [currentUser?.subteam];
      }
    }
    return [];
  };

  const handleSendNotification = async () => {
    setSending(true);

    let finalValue = targetValue;
    if (finalValue.includes('(')) {
      finalValue = finalValue.split(' (')[0];
    }

    const { error } = await supabase.rpc('send_broadcast_notification', {
      title: notifTitle,
      body: notifBody,
      target_scope: isSubteamLead ? 'subteam' : targetScope,
      target_value: isSubteamLead ? currentUser?.subteam : finalValue
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Notificación enviada con éxito.');
      setNotifTitle('');
      setNotifBody('');
      setIsNotifOpen(false); // Close after sending
    }
    setSending(false);
  };

  // Password Reset Logic (Email)
  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;

    // Using Supabase standard reset flow
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: `${window.location.origin}/update-password`, // Ensure this route exists if you want a custom flow, or let Supabase handle the link
    });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert(`Se ha enviado un correo de recuperación a ${currentUser.email}.`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-dark">
      <Header title="Configuración" subtitle="Preferencias y Seguridad" />

      <div className="p-8 space-y-8 overflow-y-auto custom-scroll">

        {/* Perfil */}
        <div className="bg-card-dark border border-white/5 rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative group cursor-pointer">
              <img src={currentUser?.avatar} className="w-20 h-20 rounded-full border-2 border-primary object-cover" alt="me" />
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white">edit</span>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={uploading} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{currentUser?.name}</h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">{currentUser?.role.replace('_', ' ')} • {currentUser?.branch}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] uppercase text-gray-500 font-black mb-1">ID de Usuario</p>
              <code className="text-xs text-primary font-mono">{currentUser?.id}</code>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] uppercase text-gray-500 font-black mb-1">Estado</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-white font-bold">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notificaciones - Accordion */}
        {['owner', 'coordinator', 'team_lead'].includes(currentUser?.role || '') && (
          <div className="bg-card-dark border border-primary/20 rounded-[32px] shadow-glow overflow-hidden transition-all duration-300">
            {/* Cabecera Clicable */}
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="w-full flex items-center justify-between p-8 bg-black/20 hover:bg-white/5 transition-colors text-left outline-none"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                <h3 className="text-xl font-black text-white">Centro de Comunicaciones</h3>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isNotifOpen ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>

            {/* Contenido Plegable */}
            <div className={`transition-all duration-300 ease-in-out ${isNotifOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
              <div className="p-8 pt-0 space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Título del Mensaje</label>
                    <input
                      value={notifTitle}
                      onChange={e => setNotifTitle(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none" placeholder="Ej: Reunión Urgente"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Alcance / Destino</label>
                    {!isSubteamLead ? (
                      <div className="flex gap-2">
                        <select
                          value={targetScope}
                          onChange={e => setTargetScope(e.target.value as any)}
                          className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none flex-1"
                        >
                          {availableScopes.map(s => <option key={s.value} value={s.value} className="bg-background-dark">{s.label}</option>)}
                        </select>

                        {targetScope !== 'global' && (
                          <select
                            value={targetValue}
                            onChange={e => setTargetValue(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none flex-1"
                          >
                            {getTargetOptions().map(o => <option key={o} value={o} className="bg-background-dark">{o}</option>)}
                          </select>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-400 font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">lock</span>
                        Solo a: {currentUser?.subteam}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cuerpo del Mensaje</label>
                  <textarea
                    value={notifBody}
                    onChange={e => setNotifBody(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none h-24 resize-none" placeholder="Escribe aquí los detalles..."
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSendNotification}
                    disabled={sending || !notifTitle || !notifBody}
                    className="bg-primary text-black font-black uppercase text-xs py-3 px-8 rounded-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? 'Enviando...' : 'Enviar Comunicado'}
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferencias de Notificación */}
        <div className="bg-card-dark border border-white/5 rounded-[32px] p-8 shadow-2xl">
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">notifications_active</span>
            Preferencias
          </h3>

          <div className="bg-white/5 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white mb-1">Notificaciones Push</p>
              <p className="text-xs text-gray-500">Recibe avisos sobre nuevas tareas y mensajes urgentes.</p>
            </div>

            <button
              onClick={handleToggleNotifications}
              disabled={isLoadingNotifs}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationsEnabled ? 'bg-primary' : 'bg-gray-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                {isLoadingNotifs ? (
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                ) : null}
              </div>
            </button>
          </div>
        </div>

        {/* Seguridad - Restaurado */}
        <div className="bg-card-dark border border-white/5 rounded-[32px] p-8 shadow-2xl">
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">lock_reset</span>
            Seguridad
          </h3>

          <div className="bg-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white mb-1">Restablecer Contraseña</p>
              <p className="text-xs text-gray-500">Te enviaremos un enlace a tu correo para cambiar la clave de forma segura.</p>
            </div>
            <button
              onClick={handlePasswordReset}
              className="whitespace-nowrap px-6 py-3 bg-white text-black font-black rounded-xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2"
            >
              📧 Enviar Correo de Restablecimiento
            </button>
          </div>
        </div>

        <button onClick={logout} className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all text-xs uppercase tracking-widest">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
