import { useState, useEffect } from 'react';
import { Shield, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AdminLayout from './admin/AdminLayout';
import { fetchPendingSubmissions } from '../lib/firebaseService';
import { auth } from '../lib/firebase';

interface AdminPortalProps {
  onDataChange: () => void;
  refreshKey?: number;
  cleanUpMode?: boolean;
  setCleanUpMode?: (val: boolean) => void;
}

export default function AdminPortal({
  onDataChange,
  refreshKey = 0,
  cleanUpMode = false,
  setCleanUpMode = () => {}
}: AdminPortalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('scholars_admin_session') === 'true';
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sync Firebase authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Read current authentication status regularly
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem('scholars_admin_session') === 'true');
    };
    checkAuth();
    // Add event listener to capture login state changes across the app
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [isOpen]);

  // Read pending submissions for floating badge
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
        console.error("Error reading pending submissions in AdminPortal:", err);
      }
    };
    
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [refreshKey, isOpen, isAuthenticated, currentUser]);

  return (
    <>
      {/* FLOATING ACTION GATEKEEPER BADGE/TRIGGER */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-1.5">
        {isAuthenticated && !cleanUpMode && (
          <div className="bg-emerald-950/90 backdrop-blur text-emerald-300 border border-emerald-500/30 text-[9px] font-mono px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Admin Active</span>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 font-semibold text-xs px-4 py-3 rounded-full shadow-2xl border cursor-pointer relative font-mono tracking-wider transition-all ${
            cleanUpMode
              ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-600/50'
              : 'bg-[#0F2557] hover:bg-[#15347a] text-[#D4A017] border-[#D4A017]/30 shadow-[#D4A017]/25'
          }`}
          id="btn-trigger-admin-portal"
        >
          {cleanUpMode ? (
            <Trash2 className="w-4 h-4 text-white animate-bounce" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          <span>{cleanUpMode ? 'Admin Clean Up' : 'Admin Control Panel'}</span>
          {!cleanUpMode && pendingCount > 0 && (
            <span className="absolute -top-2 -right-1 bg-red-500 text-white font-sans text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse shadow-md border border-white">
              {pendingCount}
            </span>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10">
            {/* OVERLAY BACKDROP */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#050E22]/95 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
            />

            {/* MODAL PORTAL CONTAINER */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative bg-[#0F2557] rounded-3xl overflow-hidden shadow-2xl max-w-7xl md:w-[95vw] w-full z-10 border border-[#D4A017]/30 flex flex-col h-[90vh] max-h-[90vh] text-white scrollbar-thin scrollbar-thumb-white/10 [WebkitOverflowScrolling:touch]"
            >
              {/* HEADER */}
              <div className="p-6 md:p-8 bg-[#050E22]/80 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A017]/15 border border-[#D4A017]/40 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#D4A017]" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-[#D4A017] flex items-center gap-2">
                      {isAuthenticated ? "Administrative Control Panel" : "Gatekeeper Authorization"}
                    </h2>
                    <p className="text-white/50 text-[10px] uppercase font-mono tracking-wider">
                      Database Editor & Year-Book Custodian
                    </p>
                  </div>
                </div>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setCleanUpMode(!cleanUpMode);
                      if (!cleanUpMode) {
                        setIsOpen(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer border transition-all shadow-lg animate-pulse ${
                      cleanUpMode
                        ? 'bg-rose-600 text-white border-rose-400 hover:bg-rose-700 shadow-rose-600/40'
                        : 'bg-rose-500/25 text-rose-200 border-rose-500/45 hover:bg-rose-500/35 shadow-rose-950/50'
                    }`}
                    title={cleanUpMode ? "Turn Off Clean Up Mode" : "Turn On Clean Up Mode"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{cleanUpMode ? "Clean Up: ACTIVE" : "Clean Up Mode"}</span>
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer self-end md:self-auto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* RENDER THE LAYOUT AND ALL ITS TABS */}
              <div className="flex-grow min-h-0 flex flex-col overflow-hidden">
                <AdminLayout 
                  onDataChange={() => {
                    // Refresh status in parent components
                    onDataChange();
                    setIsAuthenticated(localStorage.getItem('scholars_admin_session') === 'true');
                  }}
                  refreshKey={refreshKey}
                  cleanUpMode={cleanUpMode}
                  setCleanUpMode={setCleanUpMode}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
