import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useApp } from '../App';
import { Branch, Role, UserStatus, User } from '../types';

import { ORGANIGRAMA, getRandomAvatar } from '../constants';

import logo from '../assets/logo.png';

const Auth: React.FC = () => {
  const { setCurrentUser, users, setUsers, setRequests, addNotification } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branch: 'Mecánica' as Branch,
    subteam: 'Dinámica',
    isPartner: false
  });

  useEffect(() => {
    // Reset subteam when branch changes to the first option of the new branch
    setFormData(prev => ({ ...prev, subteam: ORGANIGRAMA[prev.branch][0] }));
  }, [formData.branch]);

  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setErrorMsg("Se ha enviado un enlace de recuperación a tu correo.");
        }
        return;
      }

      if (isLogin) {
        // Login Logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        // Check Status immediately after login
        if (data.session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.session.user.id)
            .single();

          if (profileError) {
            // Error handling
          } else if (profile && profile.status !== 'active' && profile.status !== 'active_owner') {
            // Status check
          }
        }

      } else {
        const validAdminEmails = ['alejandrosalidojimenez@gmail.com', 'alejandrosalidoijmenez@gmail.com'];
        const isSpecAdmin = validAdminEmails.includes(formData.email.toLowerCase());
        const shouldAutoApprove = isSpecAdmin;

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              branch: formData.isPartner ? 'General' : formData.branch,
              subteam: formData.isPartner ? 'Partner' : formData.subteam,
              role: formData.isPartner ? 'partner' : (shouldAutoApprove ? 'owner' : 'member'),
              status: shouldAutoApprove ? 'active' : 'pending',
              avatar_url: getRandomAvatar()
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          if (data.user && !data.session) {
            setErrorMsg("Registro exitoso. Por favor verifica tu correo si es necesario.");
          }
        }
      }
    } catch (err) {
      setErrorMsg("Ocurrió un error inesperado via cliente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-grid-pattern relative overflow-y-auto overflow-x-hidden">
      <h1 className="sr-only">Acceso al Portal de Ingeniería - UPV MotoE Team</h1>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>

      <div className="relative z-10 mb-8 lg:mb-10 w-full flex justify-center animate-in slide-in-from-top-4 duration-700">
        <img src={logo} alt="UPV MOTOE" className="h-20 lg:h-24 w-auto object-contain" />
      </div>

      <div className="w-full max-w-md bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 rounded-[40px] p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative z-20 mb-8">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-black mb-2 text-white">
            {isReset ? 'Recuperar Cuenta' : isLogin ? 'Bienvenido' : 'Nuevo Miembro'}
          </h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black">Portal de Operaciones v2.6 (Check)</p>
        </div>

        {errorMsg && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ${errorMsg.includes('enviado') || errorMsg.includes('exitoso') ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
            <span className="material-symbols-outlined text-base">
              {errorMsg.includes('enviado') || errorMsg.includes('exitoso') ? 'check_circle' : 'warning'}
            </span>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && !isReset && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Nombre y Apellidos</label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all placeholder:text-gray-600" placeholder="Ej: Hugo Ruiz" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Correo Electrónico</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all placeholder:text-gray-600" placeholder="personal o @epsamoto.es" />
          </div>

          {!isReset && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Contraseña</label>
              <div className="relative group">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 pr-14 py-4 text-sm text-white focus:border-primary outline-none transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[22px] leading-none">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {!isLogin && !isReset && (
            <div className="space-y-4">
              {/* Selector de Tipo (Miembro vs Partner) */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPartner: false })}
                  className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!formData.isPartner ? 'bg-primary text-black shadow-glow' : 'text-gray-500 hover:text-white'}`}
                >
                  Miembro
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPartner: true, branch: 'General', subteam: 'Partner' })}
                  className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${formData.isPartner ? 'bg-indigo-500 text-white shadow-glow' : 'text-gray-500 hover:text-white'}`}
                >
                  Partner
                </button>
              </div>

              {!formData.isPartner && (
                <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Rama Principal</label>
                    <div className="relative">
                      <select
                        value={formData.branch}
                        onChange={e => setFormData({ ...formData, branch: e.target.value as Branch })}
                        className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        <option value="Mecánica">Mecánica</option>
                        <option value="Eléctrica">Eléctrica</option>
                        <option value="Administración">Administración</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Subgrupo</label>
                    <div className="relative">
                      <select
                        value={formData.subteam}
                        onChange={e => setFormData({ ...formData, subteam: e.target.value })}
                        className="w-full bg-background-dark border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer"
                      >
                        {ORGANIGRAMA[formData.branch].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-5 bg-primary text-black font-black rounded-2xl shadow-glow transition-all uppercase tracking-widest text-xs mt-4 flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-primary-hover hover:scale-[1.02] active:scale-95'}`}
          >
            {isLoading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
            {isReset ? 'Enviar Enlace de Recuperación' : isLogin ? (isLoading ? 'Accediendo...' : 'Acceder al Portal') : (isLoading ? 'Enviando...' : 'Enviar Solicitud')}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          {!isReset ? (
            <>
              <button onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); setShowPassword(false); }} className="text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.1em]">
                {isLogin ? '¿Nuevo en el equipo? Crea tu solicitud' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
              {isLogin && (
                <button onClick={() => { setIsReset(true); setErrorMsg(null); }} className="text-[10px] font-bold text-gray-600 hover:text-primary transition-colors uppercase tracking-widest">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </>
          ) : (
            <button onClick={() => { setIsReset(false); setErrorMsg(null); }} className="text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.1em]">
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div >
      <footer className="relative mt-auto py-4 text-center text-[10px] text-gray-400 w-full px-4 z-10">
        <p>
          <strong>&copy; 2026 UPV MotoE Team.</strong> Plataforma oficial de ingeniería del equipo <strong>EPSA MotoE</strong> (Escuela Politécnica Superior de Alcoy) para MotoStudent.
        </p>
      </footer>
    </div>
  );
};

export default Auth;
