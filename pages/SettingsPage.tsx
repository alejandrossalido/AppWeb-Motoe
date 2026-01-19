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

  // Notification State (Sending)
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [targetScope, setTargetScope] = useState<'global' | 'branch' | 'subteam'>('branch');
  const [targetValue, setTargetValue] = useState<string>('Eléctrica');
  const [sending, setSending] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Manual Notification Toggle State (Receiving)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  // Check initial notification state
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

  // Handle Toggle (ON/OFF)
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

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

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

  // Notification Sending Logic
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
      if (isBranchLead) return ORGANIGRAMA[currentUser?.branch as Branch] || [];
      if (isSubteamLead) return [currentUser?.subteam];
    }
    return [];
  };

  const handleSendNotification = async () => {
    setSending(true);
    let finalValue = targetValue;
    if (finalValue.includes('(')) finalValue = finalValue.split(' (')[0];

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
      setIsNotifOpen(false);
    }
    setSending(false);
  };

  // Password Reset
  const handlePasswordReset = async () => {
    if (!currentUser?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) alert(`Error: ${error.message}`);
    else alert(`Se ha enviado un correo de recuperación a ${currentUser.email}.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      <Header title="Configuración" />

      {/* Main Content Area - Mobile First Centered Layout */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4 pb-32">
        <div className="max-w-md mx-auto space-y-6">

          {/* 1. Profile Card */}
          <div className="bg-[#141414] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>

            <div className="relative w-24 h-24 mb-4 z-10">
              <img
                src={currentUser?.avatar}
                className="w-full h-full rounded-full object-cover border-4 border-[#141414] ring-2 ring-primary ring-opacity-50 shadow-2xl"
                alt="Profile"
              />
              <label className="absolute bottom-0 right-0 bg-white text-black p-2 rounded-full cursor-pointer hover:bg-primary transition-colors shadow-lg">
                <span className="material-symbols-outlined text-[16px] block">photo_camera</span>
                <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>
              {uploading && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center animate-pulse"><span className="material-symbols-outlined text-white">upload</span></div>}
            </div>

            <h2 className="text-xl font-bold text-white z-10">{currentUser?.name}</h2>
            <div className="flex items-center gap-2 mt-2 z-10">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-black tracking-widest text-gray-400">
                {currentUser?.role.replace('_', ' ')}
              </span>
              <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] uppercase font-black tracking-widest text-primary">
                {currentUser?.branch}
              </span>
            </div>
          </div>

          {/* 2. Preferences (Notifications) */}
          <div className="bg-[#141414] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">General</h3>
            </div>

            {/* Notification Toggle Row */}
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notificationsEnabled ? 'bg-primary/20 text-primary' : 'bg-gray-800 text-gray-500'}`}>
                  <span className="material-symbols-outlined">{notificationsEnabled ? 'notifications_active' : 'notifications_off'}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Notificaciones Push</p>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                    {notificationsEnabled ? 'Activas en este dispositivo' : 'Desactivadas'}
                  </p>
                </div>
              </div>

              {/* Custom Switch Component */}
              <button
                onClick={handleToggleNotifications}
                disabled={isLoadingNotifs}
                className={`relative w-12 h-7 rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-[#141414] ${notificationsEnabled ? 'bg-primary' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ease-out flex items-center justify-center ${notificationsEnabled ? 'translate-x-[20px]' : 'translate-x-0'}`}>
                  {isLoadingNotifs && <div className="w-3 h-3 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>}
                </div>
              </button>
            </div>
          </div>

          {/* 3. Comms Center (Accordion for Leaders) */}
          {['owner', 'coordinator', 'team_lead'].includes(currentUser?.role || '') && (
            <div className="bg-[#141414] border border-white/5 rounded-3xl overflow-hidden shadow-lg transition-all">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-full p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <span className="material-symbols-outlined text-sm">campaign</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Enviar Comunicado</p>
                    <p className="text-[10px] text-gray-500">Herramienta de liderazgo</p>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-gray-500 transition-transform ${isNotifOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isNotifOpen && (
                <div className="p-4 space-y-4 border-t border-white/5 animate-in slide-in-from-top-2">
                  <input
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none placeholder-gray-600"
                    placeholder="Título del anuncio..."
                  />

                  {!isSubteamLead ? (
                    <div className="flex gap-2">
                      <select
                        value={targetScope}
                        onChange={e => setTargetScope(e.target.value as any)}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:border-orange-500/50 outline-none flex-1"
                      >
                        {availableScopes.map(s => <option key={s.value} value={s.value} className="bg-[#1a1a1a]">{s.label}</option>)}
                      </select>
                      {targetScope !== 'global' && (
                        <select
                          value={targetValue}
                          onChange={e => setTargetValue(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:border-orange-500/50 outline-none flex-1"
                        >
                          {getTargetOptions().map(o => <option key={o} value={o} className="bg-[#1a1a1a]">{o}</option>)}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-xs text-orange-400 font-bold text-center">
                      Destino: {currentUser?.subteam}
                    </div>
                  )}

                  <textarea
                    value={notifBody}
                    onChange={e => setNotifBody(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500/50 outline-none h-24 resize-none placeholder-gray-600"
                    placeholder="Escribe el mensaje aquí..."
                  />

                  <button
                    onClick={handleSendNotification}
                    disabled={sending || !notifTitle || !notifBody}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-black font-bold uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Enviando...' : 'Enviar Ahora'}
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Security & Logout */}
          <div className="bg-[#141414] border border-white/5 rounded-3xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Seguridad</h3>
            </div>

            <button onClick={handlePasswordReset} className="w-full p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors border-b border-white/5 text-left">
              <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center">
                <span className="material-symbols-outlined">lock_reset</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Cambiar Contraseña</p>
                <p className="text-[10px] text-gray-500">Recibir enlace por correo</p>
              </div>
            </button>

            <button onClick={logout} className="w-full p-4 flex items-center gap-4 bg-red-600 hover:bg-red-700 transition-colors text-left group">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
                <span className="material-symbols-outlined">logout</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Cerrar Sesión</p>
                <p className="text-[10px] text-white/70">Salir de la aplicación</p>
              </div>
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-700 font-mono pt-4">App Version 1.0.5 • Build 2026</p>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
