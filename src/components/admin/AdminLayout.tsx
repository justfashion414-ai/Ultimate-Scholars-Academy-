import { useState, useEffect } from 'react';
import { 
  Shield, UserPlus, Award, Camera, Video, Calendar, Quote, Lock, Settings, 
  Loader2, AlertTriangle, RefreshCw, LogOut, Menu, CheckCircle2 
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { checkIsAdmin, fetchPendingSubmissions } from '../../lib/firebaseService';

// Import panel components
import ModerationQueue from './ModerationQueue';
import StudentsPanel from './StudentsPanel';
import SuperlativesPanel from './SuperlativesPanel';
import PhotosPanel from './PhotosPanel';
import VideosPanel from './VideosPanel';
import TimelinePanel from './TimelinePanel';
import TeacherTributesPanel from './TeacherTributesPanel';
import AdminUsersPanel from './AdminUsersPanel';
import SettingsPanel from './SettingsPanel';

interface AdminLayoutProps {
  onDataChange: () => void;
  refreshKey?: number;
  cleanUpMode?: boolean;
  setCleanUpMode?: (val: boolean) => void;
  onClose?: () => void;
}

type TabType = 'queue' | 'students' | 'superlatives' | 'photos' | 'videos' | 'timeline' | 'tributes' | 'admins' | 'settings';

export default function AdminLayout({ 
  onDataChange, 
  refreshKey = 0,
  cleanUpMode = false,
  setCleanUpMode = () => {},
  onClose
}: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('scholars_admin_session') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [mobileShowSidebar, setMobileShowSidebar] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync Firebase authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        setIsAuthenticated(false);
        localStorage.removeItem('scholars_admin_session');
        localStorage.removeItem('scholars_admin_email');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load pending submissions count for the badge
  const updatePendingCount = async () => {
    if (!isAuthenticated || !currentUser) {
      setPendingCount(0);
      return;
    }
    try {
      const pending = await fetchPendingSubmissions();
      setPendingCount(pending.length);
    } catch (err) {
      console.error("Error fetching pending count:", err);
    }
  };

  useEffect(() => {
    updatePendingCount();
  }, [isAuthenticated, currentUser, refreshKey, localRefreshKey]);

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setLoginError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        const isAdminUser = await checkIsAdmin(result.user.email);
        if (isAdminUser) {
          setIsAuthenticated(true);
          localStorage.setItem('scholars_admin_session', 'true');
          localStorage.setItem('scholars_admin_email', result.user.email || '');
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('scholars_admin_session');
          localStorage.removeItem('scholars_admin_email');
          await signOut(auth);
          setLoginError(`Access Denied: ${result.user.email} is not authorized as an administrator.`);
        }
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setLoginError('Sign-in popup was blocked. Please enable popups in your browser.');
      } else {
        setLoginError(err.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Log out
  const handleLogout = async () => {
    localStorage.removeItem('scholars_admin_session');
    localStorage.removeItem('scholars_admin_email');
    await signOut(auth);
    setIsAuthenticated(false);
    setPendingCount(0);
  };

  const triggerRefresh = () => {
    setLocalRefreshKey(prev => prev + 1);
    onDataChange();
  };

  // Render correct panel
  const renderPanel = () => {
    const props = { onDataChange: triggerRefresh, refreshKey: refreshKey + localRefreshKey };
    switch (activeTab) {
      case 'queue':
        return <ModerationQueue {...props} />;
      case 'students':
        return <StudentsPanel {...props} />;
      case 'superlatives':
        return <SuperlativesPanel {...props} />;
      case 'photos':
        return <PhotosPanel {...props} />;
      case 'videos':
        return <VideosPanel {...props} />;
      case 'timeline':
        return <TimelinePanel {...props} />;
      case 'tributes':
        return <TeacherTributesPanel {...props} />;
      case 'admins':
        return <AdminUsersPanel {...props} />;
      case 'settings':
        return <SettingsPanel {...props} />;
      default:
        return <ModerationQueue {...props} />;
    }
  };

  if (isAuthenticated && authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[350px] text-center bg-[#030914] text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#D4A017] mb-4" />
        <p className="text-white/60 font-mono text-xs">Authenticating gatekeeper session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#030914] text-white overflow-hidden">
      {/* AUTHENTICATION VIEW */}
      {!isAuthenticated ? (
        <div className="p-8 max-w-md mx-auto w-full text-center py-16 flex flex-col items-center overflow-y-auto">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-[#D4A017]" />
          </div>
          <h3 className="text-xl font-serif font-bold mb-2">Gatekeeper Authentication</h3>
          <p className="text-white/60 text-xs mb-8 leading-relaxed max-w-sm">
            Access the Yearbook moderation panel. Please authenticate using the designated administrator Google account.
          </p>

          <div className="w-full space-y-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 ring-2 ring-white/20 hover:scale-[1.01]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google (Admin)</span>
                </>
              )}
            </button>

            {loginError && (
              <p className="text-red-400 text-xs font-mono font-bold flex items-center gap-1.5 justify-center bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {loginError}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* AUTHENTICATED PANEL WRAPPER */
        <div className="flex-grow min-h-0 flex flex-col md:flex-row overflow-hidden md:h-full">
          
          {/* SIDEBAR TABS NAV */}
          <div className={`w-full md:w-64 bg-[#050E22]/60 border-r border-white/5 p-4 flex flex-col justify-between shrink-0 overflow-y-auto ${mobileShowSidebar ? 'flex h-full min-h-0' : 'hidden md:flex'}`}>
            <div className="space-y-6">
              {/* Mobile Title for Sidebar */}
              <div className="md:hidden flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[#D4A017] font-serif font-bold text-sm">Select Admin Tab</span>
                <button
                  onClick={() => setMobileShowSidebar(false)}
                  className="px-2.5 py-1 text-[10px] font-mono text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 cursor-pointer"
                >
                  Show Active
                </button>
              </div>

              <div className="px-2 text-left">
                <span className="text-white/45 font-mono text-[9px] uppercase tracking-wider block mb-1">Administrative Role</span>
                <div className="text-xs font-bold text-[#D4A017] truncate">{auth.currentUser?.email}</div>
              </div>

              {/* VERTICAL NAV LIST */}
              <div className="space-y-1">
                {[
                  { id: 'queue', label: 'Mod Queue', icon: Shield, count: pendingCount },
                  { id: 'students', label: 'Graduand Wall', icon: UserPlus },
                  { id: 'superlatives', label: 'Medal Superlatives', icon: Award },
                  { id: 'photos', label: 'Photo Album', icon: Camera },
                  { id: 'videos', label: 'Video Vault', icon: Video },
                  { id: 'timeline', label: 'Milestones', icon: Calendar },
                  { id: 'tributes', label: 'Teacher Tributes', icon: Quote },
                  { id: 'admins', label: 'Brand & Admins', icon: Lock },
                  { id: 'settings', label: 'Settings & Layout', icon: Settings }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as TabType);
                        setMobileShowSidebar(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-[#D4A017] text-[#0F2557] font-bold shadow-md' 
                          : 'hover:bg-white/5 text-white/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${isActive ? 'bg-[#0F2557]/25 text-[#0F2557]' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2 pb-12">
              {/* Clean Up Mode Toggle */}
              <button
                onClick={() => setCleanUpMode(!cleanUpMode)}
                className={`w-full py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  cleanUpMode 
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/35 hover:bg-rose-500/30' 
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
                title={cleanUpMode ? "Turn Off Clean Up Mode" : "Turn On Clean Up Mode"}
              >
                <Trash2Icon className="w-3.5 h-3.5" />
                <span>{cleanUpMode ? "Clean Up: ACTIVE" : "Clean Up Mode"}</span>
              </button>

              <button
                onClick={triggerRefresh}
                className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Data</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-300 rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Lock Console</span>
              </button>
              {/* Extra blank space at the very bottom of the sidebar to allow scrolling beyond Lock Console on mobile */}
              <div className="h-16 md:hidden shrink-0" />
            </div>
          </div>

          {/* MAIN PANEL CONTENT VIEWS */}
          <div className={`flex-grow min-h-0 h-full p-6 md:p-8 overflow-y-auto bg-[#040c1e] ${mobileShowSidebar ? 'hidden md:block' : 'block'}`}>
            {/* MOBILE TOP NAVIGATION BAR */}
            <div className="md:hidden flex items-center justify-between bg-[#050E22]/60 border-b border-white/5 p-4 -mx-6 -mt-6 mb-6">
              <button
                onClick={() => setMobileShowSidebar(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono font-bold flex items-center gap-1.5 text-[#D4A017] cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                <span>Admin Menu</span>
              </button>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#D4A017] font-serif tracking-wider uppercase">
                  {activeTab.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Render the actual panel contents */}
            {renderPanel()}
          </div>
        </div>
      )}
    </div>
  );
}

function Trash2Icon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
