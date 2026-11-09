import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface ForcePasswordSetupProps {
  email: string;
  onDone: () => void | Promise<void>;
  embedded?: boolean;
}

/**
 * SECURITY GATE shown to any administrator who signed in with a temporary password.
 * They must choose a permanent password of their own before they can reach the
 * coding interface or the admin dashboard.
 */
export default function ForcePasswordSetup({ email, onDone, embedded = false }: ForcePasswordSetupProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNew, setConfirmNew] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Include at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmNew) {
      setError('The two passwords do not match.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError('Your session expired. Please sign in again and set your password.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      try {
        await updateDoc(doc(db, 'admins', email), { mustSetPassword: false });
      } catch {
        // The token may not carry the admin claim yet; refresh it and retry once.
        await user.getIdToken(true);
        await updateDoc(doc(db, 'admins', email), { mustSetPassword: false });
      }
      setDone(true);
      setTimeout(() => { onDone(); }, 1200);
    } catch (err: any) {
      console.error('Permanent password setup failed:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign in again, then set your password.');
      } else if (err.code === 'auth/weak-password') {
        setError('That password is too weak. Use at least 8 characters with letters and numbers.');
      } else {
        setError(err.message || 'Could not save your password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-[#050E22] text-white flex items-center justify-center font-sans ${
        embedded ? 'w-full h-full' : 'min-h-[100dvh] px-4'
      }`}
    >
      <div className="w-full max-w-md bg-[#0F2557]/60 border border-[#D4A017]/30 rounded-3xl p-8 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#D4A017]/15 border border-[#D4A017]/40 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-[#D4A017]" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-[#D4A017]">Set Your Permanent Password</h2>
            <p className="text-white/50 text-[10px] uppercase font-mono tracking-wider">{email}</p>
          </div>
        </div>

        {done ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-200 font-semibold">Password saved. Loading your workspace...</p>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#D4A017]/5 border border-[#D4A017]/15">
              <ShieldCheck className="w-5 h-5 text-[#D4A017] shrink-0 mt-0.5" />
              <p className="text-xs text-white/70 leading-relaxed">
                You signed in with a temporary password. For your security, choose a permanent password of your own
                before you can continue to the coding lab or the admin dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">New Permanent Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters, letters and numbers"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017] pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                    title={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">Confirm New Password *</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmNew}
                  onChange={(e) => setConfirmNew(e.target.value)}
                  placeholder="Re-enter your permanent password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017]"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>{loading ? 'Saving...' : 'Save Permanent Password & Continue'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
