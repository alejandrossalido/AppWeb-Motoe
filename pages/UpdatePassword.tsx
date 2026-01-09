
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import logo from '../assets/logo.png';

interface Props {
    onSuccess: () => void;
}

const UpdatePassword: React.FC<Props> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setLoading(false);
            onSuccess();
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center p-6 bg-grid-pattern relative overflow-hidden bg-background-dark">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>

            <div className="w-full max-w-md bg-card-dark/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl relative z-20">
                <div className="text-center mb-8">
                    <img src={logo} alt="UPV MOTOE" className="h-16 w-auto mx-auto mb-6 object-contain" />
                    <h2 className="text-2xl font-black mb-2 text-white">Actualizar Contraseña</h2>
                    <p className="text-gray-500 text-xs">Introduce tu nueva contraseña segura</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-3 tracking-widest">Nueva Contraseña</label>
                        <input
                            required
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-primary outline-none transition-all placeholder:text-gray-600"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-black font-black rounded-2xl shadow-glow hover:bg-primary-hover hover:scale-[1.02] transition-all active:scale-95 mt-4 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Actualizando...' : 'Confirmar Nueva Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UpdatePassword;
