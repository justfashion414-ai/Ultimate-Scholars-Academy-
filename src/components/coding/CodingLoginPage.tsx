import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Hash, 
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
  School
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ForcePasswordSetup from '../ForcePasswordSetup';
import { 
  loginStudentWithIdPin, 
  registerStudentWithIdPin, 
  saveStudentProfile, 
  fetchStudentProfile 
} from '../../lib/firebaseService';
import { CodingStudentProfile } from '../../types';

interface CodingLoginPageProps {
  onLoginSuccess: (profile: CodingStudentProfile) => void;
}

type AuthMode = 'email_password' | 'student_id_pin';
type SubAction = 'signin' | 'register';

export default function CodingLoginPage({ onLoginSuccess }: CodingLoginPageProps) {
  // Method selection: Primary is email_password, secondary is student_id_pin
  const [authMethod, setAuthMethod] = useState<AuthMode>('email_password');
  const [subAction, setSubAction] = useState<SubAction>('signin');

  // Form fields: Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form fields: Student ID & PIN
  const [studentIdInput, setStudentIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [idFullName, setIdFullName] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

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
    setStudentIdInput('');
    setPinInput('');
    setConfirmPinInput('');
    setIdFullName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowPin(false);
    setShowConfirmPin(false);
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
        lastActive: new Date().toISOString()
      };
      await saveStudentProfile(profile);
    }

    setSuccessNotice(`Welcome back, ${profile.studentName}! Entering coding workspace...`);
    clearSensitiveInputs();

    setTimeout(() => {
      if (profile) onLoginSuccess(profile);
    }, 400);
  };

  // -------------------------------------------------------------
  // HANDLERS: EMAIL & PASSWORD (PRIMARY)
  // -------------------------------------------------------------
  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

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
          lastActive: new Date().toISOString()
        };

        await saveStudentProfile(newProfile);
        setSuccessNotice('Account created successfully! Loading your coding workspace...');
        
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

  // -------------------------------------------------------------
  // HANDLERS: STUDENT ID & PIN (SECONDARY - NO EMAIL REQUIRED)
  // -------------------------------------------------------------
  const handleStudentIdAuth = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice('');

    const cleanId = studentIdInput.trim().toUpperCase();
    const cleanPin = pinInput.trim();

    if (!cleanId) {
      setErrorMsg('Please enter your Student ID or Admission Number.');
      return;
    }
    if (!cleanPin) {
      setErrorMsg('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);

    try {
      if (subAction === 'register') {
        if (!idFullName.trim()) {
          throw new Error('Please enter your full student name.');
        }
        if (cleanPin.length < 4) {
          throw new Error('PIN must be at least 4 digits.');
        }
        if (cleanPin !== confirmPinInput.trim()) {
          throw new Error('PINs do not match. Please verify.');
        }

        const profile = await registerStudentWithIdPin(
          cleanId,
          idFullName.trim(),
          cleanPin,
          'Student'
        );

        setSuccessNotice(`Student ID ${cleanId} registered! Loading your coding workspace...`);
        clearSensitiveInputs();

        setTimeout(() => {
          onLoginSuccess(profile);
        }, 500);

      } else {
        const profile = await loginStudentWithIdPin(cleanId, cleanPin);
        setSuccessNotice(`Welcome back, ${profile.studentName}! Entering coding workspace...`);
        clearSensitiveInputs();

        setTimeout(() => {
          onLoginSuccess(profile);
        }, 400);
      }
    } catch (err: any) {
      console.error('Student ID & PIN error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your Student ID and PIN.');
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
            <div className="text-[10px] text-white/50 font-mono">Student Web Coding Studio</div>
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
              Student Coding Portal
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1.5 max-w-sm mx-auto leading-relaxed">
              Log in to access your coding interface and automatically sync your HTML, CSS & JS projects across any lab computer.
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

            {/* PRIMARY METHOD SELECTOR (EMAIL & PASSWORD vs STUDENT ID & PIN) */}
            <div>
              <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                Choose Authentication Option
              </label>
              <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMethod('email_password'); 
                    clearSensitiveInputs();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    authMethod === 'email_password'
                      ? 'bg-[#D4A017] text-[#0F2557] shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email & Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMethod('student_id_pin'); 
                    clearSensitiveInputs();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    authMethod === 'student_id_pin'
                      ? 'bg-[#D4A017] text-[#0F2557] shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>Student ID & PIN</span>
                </button>
              </div>
            </div>

            {/* TAB 1: EMAIL & PASSWORD */}
            {authMethod === 'email_password' && (
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
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      {subAction === 'register' ? 'Create Password' : 'Password'} <span className="text-amber-400">*</span>
                    </label>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-5"
                  >
                    {subAction === 'signin' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{loading ? 'Authenticating...' : 'Sign In to Coding Lab'}</span>
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
            )}

            {/* TAB 2: STUDENT ID & PIN */}
            {authMethod === 'student_id_pin' && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center gap-2.5 leading-relaxed">
                  <KeyRound className="w-4 h-4 flex-shrink-0 text-[#D4A017]" />
                  <span>For students without an email. Log in with your Student ID and secret PIN.</span>
                </div>

                {/* Sign In vs Register Toggle */}
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
                    Sign In with ID
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
                    Register New ID
                  </button>
                </div>

                <form onSubmit={handleStudentIdAuth} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      Student ID / Admission Number <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
                        placeholder="e.g. SCH-042 or 2026-005"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm font-mono uppercase focus:outline-none focus:border-[#D4A017] pl-10"
                        required
                        autoComplete="off"
                      />
                      <Hash className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {subAction === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Student Full Name <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={idFullName}
                          onChange={(e) => setIdFullName(e.target.value)}
                          placeholder="e.g. Grace Okon"
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
                      {subAction === 'register' ? 'Create 4-Digit PIN' : 'Secret PIN'} <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        maxLength={8}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="e.g. 4821"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm font-mono tracking-wider focus:outline-none focus:border-[#D4A017] pr-10"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        title={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {subAction === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1.5">
                        Confirm PIN <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPin ? 'text' : 'password'}
                          maxLength={8}
                          value={confirmPinInput}
                          onChange={(e) => setConfirmPinInput(e.target.value)}
                          placeholder="Re-enter 4-digit PIN"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm font-mono tracking-wider focus:outline-none focus:border-[#D4A017] pr-10"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded transition-colors cursor-pointer"
                          title={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-5"
                  >
                    {subAction === 'signin' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{loading ? 'Authenticating...' : 'Sign In with Student ID'}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{loading ? 'Registering...' : 'Register ID & Enter Lab'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

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
        Ultimate Scholars Academy • Student Web Coding Studio
      </footer>
    </div>
  );
}
