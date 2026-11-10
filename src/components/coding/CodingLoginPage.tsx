import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Code2,
  Sparkles,
  CloudCheck,
  User,
  School,
  Palette
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ForcePasswordSetup from '../ForcePasswordSetup';
import { saveStudentProfile, fetchStudentProfile } from '../../lib/firebaseService';
import { CodingStudentProfile } from '../../types';

interface CodingLoginPageProps {
  onLoginSuccess: (profile: CodingStudentProfile) => void;
}

type SubAction = 'signin' | 'register';

export default function CodingLoginPage({ onLoginSuccess }: CodingLoginPageProps) {
  // Track selection at registration: coding or graphics
  const [track, setTrack] = useState<'coding' | 'graphics'>('coding');
  const [forgotPw, setForgotPw] = useState(false);
  const [subAction, setSubAction] = useState<SubAction>('signin');

  // Form fields: Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  // SECURITY GATE: set when an administrator signs in with a temporary password
  const [forcedPwEmail, setForcedPwEmail] = useState<string | null>(null);

  // Helper to completely clear sensitive input fields so subsequent students on shared lab computers cannot view them
  const clearSensitiveInputs = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMsg('');
  };

  // Shared continuation after a successful email sign-in
  const continueEmailSignIn = async (cleanEmail: string) => {
    const user = auth.currentUser;
    if (!user) {
      setErrorMsg('Your session expired. Please sign in again.');
      return;
    }
    let profile: CodingStudentProfile | null = await fetchStudentProfile(user.uid);
    if (!profile) {
      profile = {
        studentId: user.uid,
        studentName: user.displayName || cleanEmail.split('@')[0],
        studentEmail: cleanEmail,
        className: 'Student',
        authMethod: 'email_password',
        loginIdentifier: cleanEmail,
        track,
        lastActive: new Date().toISOString()
      };
      await saveStudentProfile(profile);
    }

    setSuccessNotice(`Welcome back, ${profile.studentName}! Opening your workspace...`);
    clearSensitiveInputs();

    setTimeout(() => {
      if (profile) onLoginSuccess(profile);
    }, 400);
  };

  // FORGOT PASSWORD: send a Firebase password reset email
  const sendResetLink = async () => {
    const resetEmail = email.trim().toLowerCase();
    if (!resetEmail) {
      setErrorMsg('Enter the email address you registered with, then tap Send Password Reset Link.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccessNotice(`Password reset email sent to ${resetEmail}. Open it (check spam too) and follow the link to set a new password.`);
      setForgotPw(false);
      clearSensitiveInputs();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') setErrorMsg('No account found with that email address.');
      else if (code === 'auth/invalid-email') setErrorMsg('That email address does not look valid.');
      else if (code === 'auth/too-many-requests') setErrorMsg('Too many attempts. Please wait a few minutes and try again.');
      else setErrorMsg('Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: EMAIL & PASSWORD (PRIMARY)
  // -------------------------------------------------------------
  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    if (forgotPw && subAction === 'signin') {
      await sendResetLink();
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      if (subAction === 'register') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (cleanPass.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (cleanPass !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        const user = userCredential.user;

        try {
          await updateProfile(user, { displayName: fullName.trim() });
        } catch (e) {
          console.warn("Could not set display name:", e);
        }

        const newProfile: CodingStudentProfile = {
          studentId: user.uid,
          studentName: fullName.trim(),
          studentEmail: cleanEmail,
          className: 'Student',
          authMethod: 'email_password',
          loginIdentifier: cleanEmail,
          track,
          lastActive: new Date().toISOString()
        };

        await saveStudentProfile(newProfile);
        setSuccessNotice(`Account created successfully! Opening your ${track === 'graphics' ? 'graphics studio' : 'coding lab'}...`);
        
        // Wipe sensitive inputs
        clearSensitiveInputs();

        setTimeout(() => {
          onLoginSuccess(newProfile);
        }, 500);

      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);

        // SECURITY GATE: administrators flagged for a mandatory password change
        // must set a permanent password before entering any interface.
        const adminSnap = await getDoc(doc(db, 'admins', cleanEmail));
        if (adminSnap.exists() && (adminSnap.data() as any).mustSetPassword === true) {
          clearSensitiveInputs();
          setForcedPwEmail(cleanEmail);
          return;
        }

        await continueEmailSignIn(cleanEmail);
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please switch to "Sign In".';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. Please verify and try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (forcedPwEmail) {
    return (
      <ForcePasswordSetup
        email={forcedPwEmail}
        onDone={async () => {
          const pendingEmail = forcedPwEmail;
          setForcedPwEmail(null);
          if (pendingEmail) await continueEmailSignIn(pendingEmail);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050E22] text-white flex flex-col font-sans selection:bg-[#D4A017] selection:text-[#0F2557] relative">
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#0F2557]/40 via-[#D4A017]/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* TOP NAVIGATION / BRANDING BAR */}
      <header className="border-b border-white/10 bg-[#071126]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white/70 hover:text-[#D4A017] transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Return to School Home</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#D4A017]">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-white tracking-wide">Ultimate Scholars Academy</div>
            <div className="text-[10px] text-white/50 font-mono">Student Learning Studio</div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0b1739] border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative"
        >
          {/* CARD BANNER */}
          <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-white/10 bg-gradient-to-b from-[#0F2557] to-[#0b1739] text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D4A017] text-[#0F2557] shadow-xl shadow-[#D4A017]/20 mb-3 mx-auto">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Student Learning Portal
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Log in to open your class workspace. Coding students get the code lab; graphics students get the design studio, and your work syncs across any lab computer.
            </p>
          </div>

          {/* CARD BODY */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* ALERTS */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span className="leading-relaxed">{successNotice}</span>
              </div>
            )}

            {/* TRACK SELECTOR (REGISTRATION ONLY) */}
            {subAction === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                  Select Your Class Track
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrack('coding')}
                    className={`flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      track === 'coding'
                        ? 'bg-[#D4A017]/15 border-[#D4A017] shadow-md'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <Code2 className={`w-5 h-5 ${track === 'coding' ? 'text-[#D4A017]' : 'text-white/50'}`} />
                    <span className={`text-xs font-bold ${track === 'coding' ? 'text-[#D4A017]' : 'text-white/70'}`}>Coding Track</span>
                    <span className="text-[10px] text-white/45 leading-tight">Web design with HTML, CSS & JavaScript</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrack('graphics')}
                    className={`flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      track === 'graphics'
                        ? 'bg-[#D4A017]/15 border-[#D4A017] shadow-md'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <Palette className={`w-5 h-5 ${track === 'graphics' ? 'text-[#D4A017]' : 'text-white/50'}`} />
                    <span className={`text-xs font-bold ${track === 'graphics' ? 'text-[#D4A017]' : 'text-white/70'}`}>Graphics Track</span>
                    <span className="text-[10px] text-white/45 leading-tight">Design logos, posters & flyers; submit as images</span>
                  </button>
                </div>
              </div>
            )}

            {/* EMAIL & PASSWORD */}
            <div className="space-y-4">
                {/* Sign In vs Create Account Toggle */}
                <div className="flex border-b border-white/10 pb-1">
                  <button
                    type="button"
                    onClick={() => { 
                      setSubAction('signin'); 
                      clearSensitiveInputs();
                    }}
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                      subAction === 'signin'
                        ? 'border-[#D4A017] text-[#D4A017]'
                        : 'border-transparent text-white/50 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setSubAction('register'); 
                      clearSensitiveInputs();
                    }}
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                      subAction === 'register'
                        ? 'border-[#D4A017] text-[#D4A017]'
                        : 'border-transparent text-white/50 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4" autoComplete="off">
                  {subAction === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Full Name <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. David Adeleke"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017] pl-10"
                          required
                          autoComplete="off"
                        />
                        <User className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      Student Email Address <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. student@school.edu or personal email"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017] pl-10"
                        required
                        autoComplete="off"
                      />
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white/80">
                        {subAction === 'register' ? 'Create Password' : 'Password'} <span className="text-amber-400">*</span>
                      </label>
                      {subAction === 'signin' && (
                        <button
                          type="button"
                          onClick={() => { setForgotPw(!forgotPw); setErrorMsg(''); setSuccessNotice(''); }}
                          className="text-[11px] font-semibold text-[#D4A017] hover:text-amber-300 cursor-pointer"
                        >
                          {forgotPw ? 'Back to sign in' : 'Forgot password?'}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017] pr-10"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {subAction === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Confirm Password <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4A017] pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

{subAction === 'signin' && forgotPw && (
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Enter the email you registered with above, then tap Send Password Reset Link. A reset email will arrive in your inbox.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-5"
                  >
                    {subAction === 'signin' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{loading ? (forgotPw ? 'Sending...' : 'Authenticating...') : forgotPw ? 'Send Password Reset Link' : 'Sign In to Coding Lab'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{loading ? 'Creating Account...' : 'Create Account & Enter Lab'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            {/* CLOUD STORAGE PERSISTENCE NOTICE */}
            <div className="pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Permanent Cloud Sync Enabled</span>
                </div>
                <p className="leading-relaxed text-[11px] text-white/60">
                  Projects saved in your coding workspace are synced to Cloud Firestore. You can sign in from any computer in the lab and all your files will load instantly.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#071126] px-6 py-4 text-center text-xs text-white/40 font-mono">
        Ultimate Scholars Academy • Student Learning Studio
      </footer>
    </div>
  );
}
