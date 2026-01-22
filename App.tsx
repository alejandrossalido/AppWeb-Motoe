
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TeamMgmt from './pages/TeamMgmt';
import TasksPage from './pages/TasksPage';
import OpsLab from './pages/OpsLab';
import HistoryPage from './pages/HistoryPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import Auth from './pages/Auth';
import TechnicalSpecs from './pages/TechnicalSpecs';
import UpdatePassword from './pages/UpdatePassword';
import VerificationSuccess from './pages/VerificationSuccess';
import AIChatbot from './components/AIChatbot';
import BottomNav from './components/BottomNav';
import UserProfile from './pages/UserProfile';
import { supabase } from './services/supabase';
import logo from './assets/logo.png';
import { User, Task, Request, TimeEntry, CalendarEvent, UserStatus, Role, Branch, MotoSpec } from './types';
import { getRandomAvatar } from './constants';

interface Notification {
  id: string;
  userId: string | 'all';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const AppContext = createContext<{
  currentUser: User | null;
  users: User[];
  tasks: Task[];
  requests: Request[];
  entries: TimeEntry[];
  events: CalendarEvent[];
  notifications: Notification[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setRequests: React.Dispatch<React.SetStateAction<Request[]>>;
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  addNotification: (userId: string | 'all', title: string, message: string) => void;
} | null>(null);

export const useApp = () => useContext(AppContext)!;


const Sidebar = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  if (!currentUser) return null;

  const menuItems = [
    { id: 'dash', label: 'Inicio', icon: 'dashboard', path: '/', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
    { id: 'tasks', label: 'Tablero Tareas', icon: 'assignment', path: '/tareas', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
    { id: 'specs', label: 'Datos Técnicos', icon: 'dataset', path: '/datos-tecnicos', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
    { id: 'lab', label: 'Sesiones', icon: 'history_edu', path: '/lab', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
    { id: 'calendar', label: 'Calendario', icon: 'calendar_month', path: '/calendario', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
    { id: 'team', label: 'Gestión Equipo', icon: 'groups', path: '/equipo', roles: ['owner', 'coordinator', 'team_lead', 'partner'] },
    { id: 'settings', label: 'Configuración', icon: 'settings', path: '/configuracion', roles: ['owner', 'coordinator', 'team_lead', 'member', 'partner'] },
  ];

  return (
    <aside className="w-16 lg:w-64 flex-shrink-0 flex-col bg-[#0f0f0f] border-r border-white/5 z-50 hidden md:flex">
      <div className="h-20 flex items-center px-4 lg:px-6 gap-3 border-b border-white/5">
        <img src={logo} alt="UPV MOTOE" className="h-8 lg:h-9 w-auto object-contain hidden lg:block" />
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-4 overflow-y-auto custom-scroll">
        {menuItems.filter(i => i.roles.includes(currentUser.role)).map((item) => (
          <Link key={item.id} to={item.path} className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl transition-all group ${location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
            <span className="material-symbols-outlined shrink-0">{item.icon}</span>
            <span className="font-semibold text-sm hidden lg:block">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-2 lg:p-4 border-t border-white/5 space-y-2">
        <Link to="/configuracion" className="flex items-center gap-3 rounded-xl bg-white/5 p-2 cursor-pointer hover:bg-white/10 transition-colors">
          <img
            src={currentUser.avatar}
            className="w-10 h-10 rounded-full border-2 border-primary/20 hover:border-primary/50 transition-colors object-cover"
            alt="Profile"
          />
          <div className="hidden lg:flex flex-col overflow-hidden">
            <p className="truncate text-xs font-bold text-white">{currentUser.name}</p>
            <p className="truncate text-[9px] text-gray-500 font-bold uppercase">{currentUser.role}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]); // Initialize empty, fetch from DB later
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      setCurrentUser({
        id: data.id,
        name: data.full_name,
        email: data.email,
        role: data.role as Role,
        branch: data.branch as Branch,
        subteam: data.subteam,
        status: data.status as UserStatus,
        totalHours: data.total_hours,
        totalCredits: data.total_credits,
        avatar: data.avatar_url || getRandomAvatar(),
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      supabase.from('profiles').select('*').then(({ data, error }) => {
        if (!error && data) {
          const mappedUsers = data.map((u: any) => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            password: '',
            role: u.role as Role,
            branch: u.branch as Branch,
            subteam: u.subteam,
            status: u.status as UserStatus,
            totalHours: u.total_hours,
            totalCredits: u.total_credits,
            avatar: u.avatar_url || getRandomAvatar(),
          }));
          setUsers(mappedUsers);

          // Populate requests from pending users
          const pendingRequests = mappedUsers
            .filter((u: User) => u.status === 'pending')
            .map((u: User) => ({
              id: u.id, // Use user ID as request ID for now
              uid: u.id,
              fullName: u.name,
              type: 'join',
              branch: u.branch,
              subteam: u.subteam,
              role: u.role, // Pass the requested role
              status: 'pending',
              createdAt: new Date().toISOString() // We don't have created_at in profile yet, using now
            } as Request));
          setRequests(pendingRequests);
        }
      });
    }
  }, [currentUser]);


  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', title: 'Diseño Telemetría', description: 'Revisión de protocolos CAN.', priority: 'Alta', status: 'available', branch: 'Eléctrica', subteam: 'Telemetría', creditsValue: 50, icon: 'bolt', createdBy: 'u1', createdAt: new Date().toISOString() },
    { id: 't2', title: 'Frenos Prototipo', description: 'Sangrado de frenos delantera.', priority: 'Alta', status: 'completed', branch: 'Mecánica', subteam: 'Parte Ciclo', creditsValue: 80, icon: 'handyman', createdBy: 'u2', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), completedAt: new Date(Date.now() - 86400000).toISOString(), completedBy: 'Marta Sanz' },
  ]);

  const [requests, setRequests] = useState<Request[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([
    { id: 'e1', title: 'Reunión General EPSA', start: new Date().toISOString(), branch: 'Global', type: 'meeting' },
    { id: 'e2', title: 'Test Dinámico Circuit', start: new Date(Date.now() + 86400000 * 2).toISOString(), branch: 'Mecánica', type: 'meeting' },
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 'n1', userId: 'all', title: 'Nuevo Portal', message: 'Optimización móvil y calendario inteligente activados.', read: false, createdAt: new Date().toISOString() }
  ]);

  const addNotification = (userId: string | 'all', title: string, message: string) => {
    const newNote = { id: Math.random().toString(36).substr(2, 9), userId, title, message, read: false, createdAt: new Date().toISOString() };
    setNotifications(prev => [newNote, ...prev]);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    setCurrentUser(null);
    window.location.hash = '/';
  };

  if (isRecovery) {
    return (
      <UpdatePassword onSuccess={() => {
        setIsRecovery(false);
        // Force reload or redirect to ensure clean state
        window.location.hash = '';
      }} />
    );
  }

  if (currentUser && currentUser.status !== 'active') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background-dark p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-primary animate-pulse mb-6">lock_clock</span>
        <h1 className="text-2xl font-black mb-4">Acceso Pendiente</h1>
        <p className="text-gray-400 max-w-xs text-sm">Tu solicitud está siendo revisada por la directiva.</p>
        <button onClick={logout} className="mt-8 text-primary font-bold text-sm">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ currentUser, users, tasks, requests, entries, events, notifications, setUsers, setTasks, setRequests, setEntries, setEvents, setNotifications, setCurrentUser, logout, addNotification }}>
      <Router>
        <div className="flex h-screen w-full bg-background-dark text-white font-display overflow-hidden">
          {currentUser && <Sidebar />}
          {currentUser && <BottomNav />}
          <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative overflow-hidden pb-24 md:pb-0">
            <Routes>
              {!currentUser ? (
                <Route path="*" element={<Auth />} />
              ) : (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/equipo" element={<TeamMgmt />} />
                  <Route path="/tareas" element={<TasksPage />} />
                  <Route path="/lab" element={<OpsLab />} />
                  <Route path="/datos-tecnicos" element={<TechnicalSpecs />} />
                  <Route path="/perfil/:userId" element={<UserProfile />} />
                  <Route path="/historial" element={<HistoryPage />} />
                  <Route path="/calendario" element={<CalendarPage />} />
                  <Route path="/configuracion" element={<SettingsPage />} />
                  <Route path="/verified" element={<VerificationSuccess />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </>
              )}
            </Routes>
            {currentUser && !window.location.hash.includes('configuracion') && !window.location.hash.includes('calendario') && <AIChatbot />}
          </main>
        </div>
      </Router>
    </AppContext.Provider>
  );
};


export default App;
