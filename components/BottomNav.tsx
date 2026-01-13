import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../App';

const BottomNav: React.FC = () => {
    const { currentUser } = useApp();
    const location = useLocation();

    if (!currentUser) return null;

    const navItems = [
        { id: 'dash', icon: 'dashboard', path: '/' },
        { id: 'tasks', icon: 'assignment', path: '/tareas' },
        { id: 'specs', icon: 'dataset', path: '/datos-tecnicos' },
        { id: 'lab', icon: 'history_edu', path: '/lab' },
        { id: 'settings', icon: 'settings', path: '/configuracion' },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-white/10 z-[100] md:hidden pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    // Special case for Settings/Profile: Show Avatar
                    if (item.id === 'settings') {
                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${isActive ? 'scale-110' : 'opacity-70'}`}
                            >
                                <img
                                    src={currentUser.avatar}
                                    alt="Profile"
                                    className={`w-7 h-7 rounded-full object-cover border-2 ${isActive ? 'border-primary' : 'border-gray-500'}`}
                                />
                                {isActive && (
                                    <span className="w-1 h-1 bg-primary rounded-full absolute bottom-2"></span>
                                )}
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-500 hover:text-white'}`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isActive ? 'fill-current' : ''}`}>
                                {item.icon}
                            </span>
                            {isActive && (
                                <span className="w-1 h-1 bg-primary rounded-full absolute bottom-2"></span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
