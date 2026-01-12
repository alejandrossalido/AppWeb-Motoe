
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { MotoSpec } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { currentUser, notifications, setNotifications } = useApp();
  const [showNotes, setShowNotes] = useState(false);
  const navigate = useNavigate();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MotoSpec[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read && (n.userId === currentUser?.id || n.userId === 'all')).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 2) {
        setIsSearching(true);
        const { data, error } = await supabase
          .from('moto_specs')
          .select('*')
          .or(`component_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .limit(5);

        if (!error && data) {
          setSearchResults(data as MotoSpec[]);
          setShowResults(true);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (id: string) => {
    setShowResults(false);
    setSearchTerm('');
    navigate(`/datos-tecnicos?id=${id}`);
  };

  return (
    <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b border-white/5 bg-[#141414]/90 backdrop-blur sticky top-0 z-[60]">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-6">

        {/* Search Bar */}
        <div ref={searchRef} className="hidden md:flex flex-col relative">
          <div className="flex items-center bg-white/5 rounded-full px-4 py-2 border border-white/5 focus-within:border-primary/50 transition-colors w-64">
            <span className="material-symbols-outlined text-gray-400 text-[20px]">search</span>
            <input
              className="bg-transparent border-none text-sm text-white placeholder-gray-500 focus:ring-0 w-full ml-2 focus:outline-none"
              placeholder="Buscar registros..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            />
            {isSearching && <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
          </div>

          {/* Search Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-12 left-0 w-80 bg-card-dark border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in slide-in-from-top-2">
              <div className="p-3 bg-[#1a1a1a] border-b border-white/5">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Resultados</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result.id)}
                    className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{result.component_name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{result.category}</p>
                      </div>
                      {result.file_url && <span className="material-symbols-outlined text-[16px] text-emerald-500" title="Archivo adjunto">attach_file</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowNotes(!showNotes)} className="relative p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-black text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-[#141414]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotes && (
            <div className="absolute top-12 right-0 w-80 max-h-[400px] bg-card-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[100] animate-in slide-in-from-top-2 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
                <span className="text-xs font-black uppercase tracking-widest">Bandeja de Entrada</span>
                <button onClick={() => setShowNotes(false)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scroll bg-[#141414]">
                {notifications.filter(n => n.userId === currentUser?.id || n.userId === 'all').length === 0 ? (
                  <p className="text-center py-8 text-gray-500 text-xs italic">No hay mensajes.</p>
                ) : notifications.filter(n => n.userId === currentUser?.id || n.userId === 'all').map(n => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${n.read ? 'bg-white/[0.01] border-white/5 grayscale opacity-50' : 'bg-primary/5 border-primary/20 shadow-glow hover:bg-primary/10'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-black text-white uppercase tracking-tighter">{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-snug">{n.message}</p>
                    {n.title === 'Restablecer Contraseña' && !n.read && (
                      <div className="mt-2 py-1.5 bg-primary text-black text-[9px] font-black uppercase text-center rounded-lg tracking-widest">
                        Click para Validar Enlace
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="relative">
            <img className="w-10 h-10 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-[#141414] object-cover" src={currentUser?.avatar} alt="P" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
