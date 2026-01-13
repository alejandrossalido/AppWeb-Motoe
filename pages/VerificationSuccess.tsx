
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const VerificationSuccess: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to dashboard after 3 seconds
        const timer = setTimeout(() => {
            navigate('/');
        }, 4000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background-dark p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] animate-pulse"></div>

            <div className="text-center z-10 flex flex-col items-center animate-in zoom-in-95 duration-500">
                <img src={logo} alt="MotoE" className="h-20 mb-8 object-contain" />

                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-full mb-6 relative">
                    <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse"></div>
                    <span className="material-symbols-outlined text-5xl text-green-500 relative z-10">verified</span>
                </div>

                <h1 className="text-3xl font-black text-white mb-2">¡Verificación Completada!</h1>
                <p className="text-gray-400 text-sm max-w-sm mb-8">
                    Tu correo ha sido confirmado exitosamente. Ya eres parte oficial de la plataforma.
                </p>

                <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-xl border border-white/5">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Entrando al Portal...</span>
                </div>
            </div>
        </div>
    );
};

export default VerificationSuccess;
