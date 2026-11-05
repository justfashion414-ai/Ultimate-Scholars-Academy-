import { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  User, 
  LogIn, 
  LogOut, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  KeyRound,
  ShieldCheck,
  Hash,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { 
  loginStudentWithIdPin, 
  registerStudentWithIdPin, 
  saveStudentProfile, 
  fetchStudentProfile 
} from '../../lib/firebaseService';
import { CodingStudentProfile } from '../../types';

interface StudentAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: CodingStudentProfile | null;
  onSaveProfile: (profile: CodingStudentProfile | null) => void;
}

type AuthMode = 'email_password' | 'student_id_pin';
type SubAction = 'signin' | 'register';

export default function StudentAccountModal({
  isOpen,
  onClose,
  currentStudent,
  onSaveProfile
}: StudentAccountModalProps) {
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

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Helper to completely clear sensitive input fields so subsequent users on shared computers cannot see them
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

  // Clear inputs when modal is closed or opened
  useEffect(() => {
    if (!isOpen) {
      clearSensitiveInputs();
      setSuccessNotice('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModalClose = () => {
    clearSensitiveInputs();
    setSuccessNotice('');
    onClose();
  };

  // -------------------------------------------------------------
  // HANDLERS: EMAIL & PASSWORD
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
        // Register new student account
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

        // Update display name
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
        onSaveProfile(newProfile);
        setSuccessNotice('Account created successfully! Welcome to the Coding Lab.');
        
        // Immediately wipe entered sign up info so others cannot see it
        clearSensitiveInputs();

        setTimeout(() => {
          handleModalClose();
        }, 800);

      } else {
        // Sign in existing student account
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        const user = userCredential.user;

        // Fetch existing profile if available
        let profile = await fetchStudentProfile(user.uid);
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

        onSaveProfile(profile);
        setSuccessNotice(`Welcome back, ${profile.studentName}!`);

        // Immediately wipe entered sign in info so others cannot see it
        clearSensitiveInputs();

        setTimeout(() => {
          handleModalClose();
        }, 600);
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
  // HANDLERS: STUDENT ID & PIN (NO EMAIL REQUIRED)
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

        onSaveProfile(profile);
        setSuccessNotice(`Student ID ${cleanId} registered! Permanent storage is ready.`);

        // Wipe entered registration info so others cannot see it
        clearSensitiveInputs();

        setTimeout(() => {
          handleModalClose();
        }, 800);

      } else {
        const profile = await loginStudentWithIdPin(cleanId, cleanPin);
        onSaveProfile(profile);
        setSuccessNotice(`Welcome back, ${profile.studentName}!`);

        // Wipe entered sign in info so others cannot see it
        clearSensitiveInputs();

        setTimeout(() => {
          handleModalClose();
        }, 600);
      }
    } catch (err: any) {
      console.error('Student ID & PIN error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your Student ID and PIN.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SIGN OUT
  // -------------------------------------------------------------
  const handleSignOut = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn("Sign out notice:", e);
    }
    clearSensitiveInputs();
    onSaveProfile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0b1739] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0F2557]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4A017] rounded-xl text-[#0F2557]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Student Workspace Login</h2>
              <p className="text-xs text-white/60">
                Sign in to save your coding projects permanently across any lab computer
              </p>
            </div>
          </div>
          <button 
            onClick={handleModalClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {currentStudent ? (
            /* CURRENTLY LOGGED IN */
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#D4A017]/20 border-2 border-[#D4A017] flex items-center justify-center text-lg font-bold text-[#D4A017]">
                  {currentStudent.studentName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base truncate">{currentStudent.studentName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Student
                    </span>
                  </div>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    {currentStudent.authMethod === 'student_id_pin' 
                      ? `Student ID: ${currentStudent.loginIdentifier || currentStudent.studentId}` 
                      : `Email: ${currentStudent.studentEmail || currentStudent.loginIdentifier}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#D4A017] font-medium">{currentStudent.studentName}</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-white/70">
                      {currentStudent.authMethod === 'student_id_pin' ? 'ID & PIN Login' : 'Email & Password Login'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Permanent Cloud Storage Enabled
                </div>
                <p>
                  All projects saved under this profile are synced to the cloud. You can switch to any computer in the lab, log in, and continue coding right where you left off.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all border border-rose-500/30 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Switch / Sign Out</span>
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] text-xs font-bold transition-all cursor-pointer"
                >
                  Back to Workspace
                </button>
              </div>
            </div>
          ) : (
            /* NOT LOGGED IN: TWO TIER AUTH SYSTEM */
            <div className="space-y-5">
              {/* PRIMARY METHOD TABS */}
              <div className="grid grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMethod('email_password'); 
                    clearSensitiveInputs();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMethod === 'email_password'
                      ? 'bg-[#D4A017] text-[#0F2557] shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>1. Email & Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMethod('student_id_pin'); 
                    clearSensitiveInputs();
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMethod === 'student_id_pin'
                      ? 'bg-[#D4A017] text-[#0F2557] shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span>2. Student ID & PIN</span>
                </button>
              </div>

              {/* TAB 1: EMAIL & PASSWORD (PRIMARY) */}
              {authMethod === 'email_password' && (
                <div className="space-y-4">
                  {/* Sign In vs Register Toggle */}
                  <div className="flex border-b border-white/10 pb-1">
                    <button
                      type="button"
                      onClick={() => { 
                        setSubAction('signin'); 
                        clearSensitiveInputs();
                      }}
                      className={`pb-2 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
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
                      className={`pb-2 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        subAction === 'register'
                          ? 'border-[#D4A017] text-[#D4A017]'
                          : 'border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-3.5" autoComplete="off">
                    {subAction === 'register' && (
                      <div>
                        <label className="block text-xs font-semibold text-white/80 mb-1">
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
                      <label className="block text-xs font-semibold text-white/80 mb-1">
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
                      <label className="block text-xs font-semibold text-white/80 mb-1">
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
                        <label className="block text-xs font-semibold text-white/80 mb-1">
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
                      className="w-full py-3 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                      {subAction === 'signin' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{loading ? 'Signing In...' : 'Sign In with Email'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{loading ? 'Creating Account...' : 'Register Student Account'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: STUDENT ID & PIN (SECOND OPTION - NO EMAIL REQUIRED) */}
              {authMethod === 'student_id_pin' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                    <KeyRound className="w-4 h-4 flex-shrink-0 text-[#D4A017]" />
                    <span>Designed for students without an email address. Use your school ID & a secret PIN.</span>
                  </div>

                  {/* Sign In vs Register Toggle */}
                  <div className="flex border-b border-white/10 pb-1">
                    <button
                      type="button"
                      onClick={() => { 
                        setSubAction('signin'); 
                        clearSensitiveInputs();
                      }}
                      className={`pb-2 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
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
                      className={`pb-2 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        subAction === 'register'
                          ? 'border-[#D4A017] text-[#D4A017]'
                          : 'border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      Register New Student ID
                    </button>
                  </div>

                  <form onSubmit={handleStudentIdAuth} className="space-y-3.5" autoComplete="off">
                    <div>
                      <label className="block text-xs font-semibold text-white/80 mb-1">
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
                        <label className="block text-xs font-semibold text-white/80 mb-1">
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
                      <label className="block text-xs font-semibold text-white/80 mb-1">
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
                        <label className="block text-xs font-semibold text-white/80 mb-1">
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
                      className="w-full py-3 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                      {subAction === 'signin' ? (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>{loading ? 'Authenticating...' : 'Sign In with Student ID'}</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>{loading ? 'Registering ID...' : 'Register ID & Start Coding'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
