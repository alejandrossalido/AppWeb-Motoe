import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useApp } from '../App';
import { Branch, Role, UserStatus, User } from '../types';

const ORGANIGRAMA: Record<Branch, string[]> = {
  'Eléctrica': ['Powertrain', 'Diseño (MS1/Diagramas)', 'Telemetría'],
  'Mecánica': ['Parte Ciclo (Dinámica)', 'Chasis (Dinámica)', 'Anclajes (Dinámica)', 'Carenado (Aero)'],
  'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E (Convocatorias/Facturas)', 'Media']
};

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
    subteam: 'Chasis (Dinámica)'
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, subteam: ORGANIGRAMA[prev.branch][0] }));
  }, [formData.branch]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Se ha enviado un enlace de recuperación a tu correo.");
      }
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } else {
      const validAdminEmails = ['alejandrosalidojimenez@gmail.com', 'alejandrosalidoijmenez@gmail.com'];
      const isSpecAdmin = validAdminEmails.includes(formData.email.toLowerCase());
      const isAutoName = formData.name.toLowerCase().includes('hugo') || formData.name.toLowerCase().includes('admin');

      const shouldAutoApprove = isSpecAdmin || isAutoName;

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            branch: formData.branch,
            subteam: formData.subteam,
            role: shouldAutoApprove ? 'owner' : 'member',
            status: shouldAutoApprove ? 'active' : 'pending',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`
          }
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
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-grid-pattern relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>

      <div className="absolute top-12 lg:top-20 left-1/2 -translate-x-1/2 flex items-center justify-center animate-in slide-in-from-top-4 duration-700 z-10">
        <img src={logo} alt="UPV MOTOE" className="h-24 w-auto object-contain" />
      </div>

      <div className="w-full max-w-md bg-card-dark/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative z-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black mb-2 text-white">
            {isReset ? 'Recuperar Cuenta' : isLogin ? 'Bienvenido' : 'Nuevo Miembro'}
          </h2>
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black">Portal de Operaciones v2.6 (Check)</p>
        </div>

        {errorMsg && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ${errorMsg.includes('enviado') ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
            <span className="material-symbols-outlined text-base">
              {errorMsg.includes('enviado') ? 'check_circle' : 'warning'}
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
            <div className="grid grid-cols-1 gap-5">
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
            </div>
          )}

          <button type="submit" className="w-full py-5 bg-primary text-black font-black rounded-2xl shadow-glow hover:bg-primary-hover hover:scale-[1.02] transition-all active:scale-95 mt-4 uppercase tracking-widest text-xs">
            {isReset ? 'Enviar Enlace de Recuperación' : isLogin ? 'Acceder al Portal' : 'Enviar Solicitud'}
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
      </div>
    </div>
  );
};

export default Auth;
