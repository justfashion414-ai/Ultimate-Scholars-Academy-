import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, ArrowLeft } from 'lucide-react';
import AdminLayout from './admin/AdminLayout';
import { fetchPendingSubmissions } from '../lib/firebaseService';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ForcePasswordSetup from './ForcePasswordSetup';

interface AdminPortalProps {
  onDataChange: () => void;
  refreshKey?: number;
  cleanUpMode?: boolean;
  setCleanUpMode?: (val: boolean) => void;
}

/** The admin control panel as a NORMAL PAGE at /admin (no floating button, no overlay). */
export default function AdminPortal({
  onDataChange,
  refreshKey = 0,
  cleanUpMode = false,
  setCleanUpMode = () => {}
}: AdminPortalProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('scholars_admin_session') === 'true';
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  // SECURITY GATE: set when the signed-in admin still has a mandatory password change
  const [forcedPw, setForcedPw] = useState(false);

  // Sync Firebase authentication state + local session flag
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem('scholars_admin_session') === 'true');
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // SECURITY GATE: a flagged admin must set a permanent password before entering
  useEffect(() => {
    if (!currentUser?.email) {
      setForcedPw(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'admins', currentUser.email.toLowerCase()));
        if (!cancelled) setForcedPw(snap.exists() && (snap.data() as any).mustSetPassword === true);
      } catch {
        if (!cancelled) setForcedPw(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Pending submissions badge
  useEffect(() => {
    const updatePendingCount = async () => {
      if (!isAuthenticated || !currentUser) {
        setPendingCount(0);
        return;
      }
      try {
        const pending = await fetchPendingSubmissions();
        setPendingCount(pending.length);
      } catch (err) {
        console.error('Error reading pending submissions in AdminPortal:', err);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 15000);
    return () => clearInterval(interval);
  }, [refreshKey, isAuthenticated, currentUser]);

  return (
    <div className="min-h-[100dvh] bg-[#050E22] text-white flex flex-col font-sans selection:bg-[#D4A017] selection:text-[#0F2557]">
      {/* PAGE HEADER */}
      <header className="border-b border-white/10 bg-[#071126] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#D4A017]/15 border border-[#D4A017]/40 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-[#D4A017]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-serif font-bold text-[#D4A017] truncate">
              {isAuthenticated ? 'Administrative Control Panel' : 'Gatekeeper Authorization'}
            </h1>
            <p className="text-white/50 text-[9px] uppercase font-mono tracking-wider">
              Database Editor & Year-Book Custodian
            </p>
          </div>
          {isAuthenticated && (
            <span className="hidden md:flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Admin Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated && (
            <button
              onClick={() => setCleanUpMode(!cleanUpMode)}
              className={`hidden sm:flex px-3 py-2 rounded-xl text-[11px] font-mono font-bold items-center gap-1.5 cursor-pointer border transition-all ${
                cleanUpMode
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                  : 'bg-rose-500/25 text-rose-200 border-rose-500/45 hover:bg-rose-500/35'
              }`}
              title={cleanUpMode ? 'Turn Off Clean Up Mode' : 'Turn On Clean Up Mode'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cleanUpMode ? 'Clean Up: ACTIVE' : 'Clean Up Mode'}</span>
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Site</span>
          </button>
        </div>
      </header>

      {/* FULL-PAGE CONSOLE */}
      <div className="flex-1 min-h-0 flex flex-col">
        {forcedPw && currentUser?.email ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <ForcePasswordSetup
              email={currentUser.email.toLowerCase()}
              embedded
              onDone={() => setForcedPw(false)}
            />
          </div>
        ) : (
          <AdminLayout
            onDataChange={() => {
              onDataChange();
              setIsAuthenticated(localStorage.getItem('scholars_admin_session') === 'true');
            }}
            refreshKey={refreshKey}
            cleanUpMode={cleanUpMode}
            setCleanUpMode={setCleanUpMode}
            onClose={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
}
