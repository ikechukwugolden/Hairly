import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, googleProvider, facebookProvider } from '../../../firebaseconfig';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail // Added for real functionality
} from 'firebase/auth';
import { ChevronLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X, Mail } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaFacebook, FaApple } from 'react-icons/fa';

// --- TOAST NOTIFICATION COMPONENT ---
const Toast = ({ message, onClose }) => (
  <motion.div
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 20, opacity: 1 }}
    exit={{ y: -100, opacity: 0 }}
    className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none"
  >
    <div className="bg-white border border-red-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto min-w-[300px]">
      <div className="bg-red-50 p-2 rounded-xl">
        <AlertCircle className="text-red-500" size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-black uppercase tracking-widest text-red-500">Error</p>
        <p className="text-zinc-600 text-xs font-bold leading-tight">{message}</p>
      </div>
      <button onClick={onClose} className="text-zinc-300 hover:text-zinc-500 transition-colors">
        <X size={16} />
      </button>
    </div>
  </motion.div>
);

export const Login = ({ onForgotPassword, onSwitchToSignup, onLoginSuccess }) => {
  const [view, setView] = useState('login'); 

  return (
    <div className="min-h-screen bg-white font-sans antialiased max-w-md mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'login' ? (
          <LoginForm
            key="login"
            onForgotPassword={() => setView('forgot')}
            onSwitchToSignup={onSwitchToSignup}
            onLoginSuccess={onLoginSuccess}
          />
        ) : (
          <ForgotPassword key="forgot" onBackToLogin={() => setView('login')} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- LOGIN FORM COMPONENT ---
const LoginForm = ({ onForgotPassword, onSwitchToSignup, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isReady = email.length > 0 && password.length > 0;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isReady) return;
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err) {
      const errorMap = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'The password you entered is incorrect.',
        'auth/invalid-credential': 'Invalid login details. Please try again.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      };
      setError(errorMap[err.code] || "Something went wrong. Please try again.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider) => {
    try {
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err) {
      setError("Social login failed. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-8 pt-12 flex flex-col min-h-screen bg-white"
    >
      <AnimatePresence>
        {error && <Toast message={error} onClose={() => setError(null)} />}
      </AnimatePresence>

      <h1 className="text-5xl font-black text-[#7C3AED] italic mb-16 text-center tracking-tighter">
        Hairly
      </h1>

      <div className="mb-8">
        <p className="text-zinc-400 text-sm mb-1 font-medium tracking-tight">Welcome back</p>
        <h2 className="text-2xl font-bold text-black tracking-tight">Log in</h2>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 text-black">
        <input
          type="email" placeholder="Email"
          className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-100 outline-none focus:border-[#7C3AED] placeholder:text-zinc-300 transition-all text-sm"
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            type={showPass ? "text" : "password"} placeholder="Password"
            className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-100 outline-none focus:border-[#7C3AED] placeholder:text-zinc-300 transition-all text-sm"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500">
            {showPass ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onForgotPassword} className="text-[10px] text-zinc-400 font-bold hover:text-[#7C3AED] transition-colors uppercase tracking-widest">
            Forgot password?
          </button>
        </div>

        <button
          disabled={loading}
          className={`w-full py-4 rounded-full font-bold transition-all mt-6 flex justify-center items-center shadow-md active:scale-95 ${isReady ? 'bg-[#7C3AED] text-white shadow-purple-100' : 'bg-[#E9D5FF] text-[#7C3AED]'}`}
        >
          {loading ? <Loader2 className="animate-spin" /> : "Log in"}
        </button>
      </form>

      <p className="text-center text-xs text-zinc-400 mt-10 font-medium">
        Don't have an account? 
        <button 
          type="button" 
          onClick={onSwitchToSignup} 
          className="text-[#7C3AED] font-black cursor-pointer ml-1 hover:underline uppercase tracking-tighter"
        >
          Sign up
        </button>
      </p>

      <div className="mt-auto pb-6">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-[1px] flex-1 bg-zinc-100"></div>
          <p className="text-zinc-300 text-[10px] uppercase tracking-[0.2em] font-black">Log in with</p>
          <div className="h-[1px] flex-1 bg-zinc-100"></div>
        </div>
        <div className="flex justify-center gap-10">
          <button type="button" onClick={() => handleSocial(googleProvider)} className="hover:scale-110 transition-transform"><FcGoogle size={28} /></button>
          <button type="button" onClick={() => handleSocial(facebookProvider)} className="text-[#1877F2] hover:scale-110 transition-transform"><FaFacebook size={28} /></button>
          <button type="button" className="text-black hover:scale-110 transition-transform"><FaApple size={28} /></button>
        </div>
      </div>
    </motion.div>
  );
};

// --- REAL FUNCTIONAL FORGOT PASSWORD ---
const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError("We couldn't find an account with that email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}
      className="p-8 pt-12 min-h-screen bg-white flex flex-col"
    >
      <button onClick={onBackToLogin} className="mb-8 w-fit p-1 hover:bg-zinc-50 rounded-full transition-colors group">
        <ChevronLeft className="text-[#7C3AED] group-hover:scale-110 transition-transform" size={28} />
      </button>

      {!sent ? (
        <div className="space-y-8 flex flex-col items-center flex-1">
          <div className="w-52 h-52 bg-purple-50 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden">
            <Mail className="text-[#7C3AED] w-20 h-20 opacity-20" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black mb-2 text-black tracking-tight">Reset Password</h2>
            <p className="text-zinc-400 text-xs px-8 leading-relaxed font-bold tracking-tight">
              Enter your email and we'll send you a secure link to reset your password.
            </p>
          </div>
          <div className="w-full space-y-2">
            <input
              type="email" placeholder="Email address"
              className="w-full bg-zinc-50 p-4 rounded-xl border border-zinc-100 outline-none focus:border-[#7C3AED] text-sm shadow-sm text-black"
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-red-500 text-[10px] font-bold ml-2">{error}</p>}
          </div>
          <button
            onClick={handleReset}
            disabled={loading || !email}
            className={`w-full py-4 rounded-full font-bold transition-all shadow-lg active:scale-95 flex justify-center ${email ? 'bg-[#7C3AED] text-white shadow-purple-100' : 'bg-[#E9D5FF] text-[#7C3AED]'}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#7C3AED]">
            <CheckCircle2 size={80} />
          </motion.div>
          <h2 className="text-2xl font-black text-black tracking-tight">Link Sent!</h2>
          <p className="text-zinc-400 text-xs px-8 font-bold leading-relaxed">
            Check your inbox (and spam) for instructions to create a new password.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full py-4 bg-[#7C3AED] text-white rounded-full font-bold shadow-lg shadow-purple-100"
          >
            Back to Log in
          </button>
        </div>
      )}
    </motion.div>
  );
};