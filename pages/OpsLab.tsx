
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useApp } from '../App';
import { analyzeComponent } from '../services/geminiService';

const OpsLab: React.FC = () => {
  const { currentUser, setCurrentUser, setEntries } = useApp();
  const [activeTab, setActiveTab] = useState<'fichaje' | 'vision'>('fichaje');
  
  const [elapsed, setElapsed] = useState('00:00:00');
  const [summary, setSummary] = useState('');
  const [img, setImg] = useState<string | null>(null);
  const [visionRes, setVisionRes] = useState('');
  const [loadingVision, setLoadingVision] = useState(false);

  useEffect(() => {
    let interval: any;
    if (currentUser.currentClockIn) {
      interval = setInterval(() => {
        const start = new Date(currentUser.currentClockIn!).getTime();
        const diff = new Date().getTime() - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setElapsed(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentUser.currentClockIn]);

  const handleClockIn = () => {
    setCurrentUser({ ...currentUser, currentClockIn: new Date().toISOString() });
  };

  const handleClockOut = () => {
    if (!summary.trim()) {
      alert("Debes escribir un breve resumen del trabajo realizado para poder salir.");
      return;
    }

    const start = new Date(currentUser.currentClockIn!).getTime();
    const end = new Date().getTime();
    const durationMin = Math.floor((end - start) / 60000);
    const credits = Math.floor(durationMin / 30); // 1 CR cada 30 min

    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      clockIn: currentUser.currentClockIn!,
      clockOut: new Date().toISOString(),
      durationMinutes: durationMin,
      summary: summary,
      creditsEarned: credits,
      status: 'completed' as const
    };

    setEntries((prev: any) => [newEntry, ...prev]);
    setCurrentUser({ 
      ...currentUser, 
      currentClockIn: undefined,
      totalHours: currentUser.totalHours + (durationMin / 60),
      totalCredits: currentUser.totalCredits + credits
    });
    setSummary('');
    setElapsed('00:00:00');
    alert(`Sesión finalizada. Has ganado ${credits} créditos.`);
  };

  const handleVisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImg(base64);
        setLoadingVision(true);
        setVisionRes('Analizando pieza con Gemini 3 Pro...');
        try {
          const res = await analyzeComponent(base64, "Actúa como un ingeniero jefe de Formula Student. Analiza este componente y detecta posibles fallos estructurales, fatiga o falta de optimización aerodinámica. Devuelve un informe técnico estructurado en español.");
          setVisionRes(res);
        } catch (err) {
          setVisionRes('Error conectando con el motor de IA.');
        } finally {
          setLoadingVision(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <Header title="Laboratorio de Operaciones" subtitle="Control de fichaje e IA avanzada" />
      
      <div className="p-8 space-y-8 overflow-y-auto h-full custom-scroll">
        <div className="flex gap-6 border-b border-white/5 pb-px">
          <TabButton active={activeTab === 'fichaje'} onClick={() => setActiveTab('fichaje')} label="Fichaje y Créditos" icon="timer" />
          <TabButton active={activeTab === 'vision'} onClick={() => setActiveTab('vision')} label="Visión Artificial IA" icon="camera" />
        </div>

        {activeTab === 'fichaje' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface-dark border border-white/5 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Registro de Tiempo</h3>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{currentUser.branch} • {currentUser.subteam}</p>
                  </div>
                  {currentUser.currentClockIn && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 animate-pulse">SESIÓN ACTIVA</span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4 mb-12">
                  <div className="font-mono text-7xl font-bold tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,204,136,0.3)] tabular-nums">
                    {elapsed}
                  </div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">HH : MM : SS</div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-500 uppercase">Resumen de actividad (Obligatorio para salir)</label>
                  <textarea 
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Escribe qué estás haciendo en esta sesión..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                    disabled={!currentUser.currentClockIn}
                  />
                </div>
              </div>

              {currentUser.currentClockIn ? (
                <button onClick={handleClockOut} className="mt-8 w-full py-5 rounded-2xl font-bold text-lg bg-red-500 text-white hover:bg-red-600 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-3xl">stop_circle</span>
                  Finalizar Fichaje
                </button>
              ) : (
                <button onClick={handleClockIn} className="mt-8 w-full py-5 rounded-2xl font-bold text-lg bg-primary text-black hover:bg-primary-hover shadow-glow transition-all active:scale-95 flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-3xl">play_circle</span>
                  Iniciar Fichaje
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-card-dark rounded-3xl p-6 border border-white/5">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-6 tracking-widest">Información de Créditos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ratio Actual</p>
                    <p className="text-xl font-bold text-white">1 CR <span className="text-xs text-gray-600">/ 30 min</span></p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Créditos Sesión</p>
                    <p className="text-xl font-bold text-primary">{currentUser.currentClockIn ? Math.floor((new Date().getTime() - new Date(currentUser.currentClockIn).getTime()) / 1800000) : 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card-dark rounded-3xl p-6 border border-white/5 flex-1">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-6 tracking-widest">Reglas de Fichaje</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-3"><span className="material-symbols-outlined text-primary text-sm">check_circle</span> El resumen es obligatorio para registrar la sesión.</li>
                  <li className="flex gap-3"><span className="material-symbols-outlined text-primary text-sm">check_circle</span> Las sesiones de menos de 15 min no generan créditos.</li>
                  <li className="flex gap-3"><span className="material-symbols-outlined text-primary text-sm">check_circle</span> Un Team Lead debe validar tus sesiones cada semana.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col gap-6">
              <div onClick={() => document.getElementById('ai-img')?.click()} className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 group transition-all">
                {img ? <img src={img} className="w-full h-full object-contain rounded-3xl" alt="Componente" /> : (
                  <div className="flex flex-col items-center text-center p-8">
                    <span className="material-symbols-outlined text-6xl text-gray-700 group-hover:text-primary transition-colors">upload_file</span>
                    <p className="mt-4 text-sm font-bold text-gray-500">Sube una pieza para análisis estructural IA</p>
                    <p className="text-[10px] text-gray-600 mt-2 font-mono">JPG, PNG, WebP soportados</p>
                  </div>
                )}
                <input type="file" id="ai-img" hidden onChange={handleVisionUpload} />
              </div>
              <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl flex gap-4">
                <span className="material-symbols-outlined text-primary text-2xl">science</span>
                <p className="text-xs text-primary/80 leading-relaxed font-medium">
                  Este laboratorio utiliza modelos de visión multimodal de Gemini para auditar componentes críticos de competición, detectando anomalías de diseño y optimizaciones posibles.
                </p>
              </div>
            </div>
            <div className="bg-surface-dark border border-white/5 rounded-3xl p-8 flex flex-col h-[500px]">
              <h3 className="text-sm font-bold text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined">description</span> Informe de Diagnóstico Gemini
              </h3>
              <div className="flex-1 text-sm text-gray-300 leading-relaxed overflow-y-auto pr-4 custom-scroll font-body whitespace-pre-wrap">
                {loadingVision ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-primary font-bold animate-pulse">Procesando imagen técnica...</p>
                  </div>
                ) : visionRes || "Sube una imagen técnica para generar un informe pericial mediante IA."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] transition-all border-b-2 ${active ? 'text-primary border-primary' : 'text-gray-600 border-transparent hover:text-gray-300'}`}>
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    {label}
  </button>
);

export default OpsLab;
