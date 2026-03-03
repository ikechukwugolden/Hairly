import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseconfig';

// --- Components & Pages ---
import { LandingHero } from './components/onboarding/LandingHero';
import { SelectionScreen } from './components/onboarding/SelectionScreen';
import { OnboardingFlow } from './components/onboarding/InfoSlides';
import { SignupSteps } from './components/onboarding/SignupSteps';
import { Login } from './components/onboarding/Login';
import { Loader2, Home as HomeIcon, Users, Calendar, Image as PortfolioIcon, User, LogOut, WifiOff } from 'lucide-react';

import Home from './pages/Home';
import Explore from './pages/Explore';
import Portfolio from './pages/Portfolio';
import Profile from './pages/Profile';
import CalendarPage from './pages/Calendar';
import EditProfile from './pages/EditProfile';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [step, setStep] = useState('landing');

  useEffect(() => {
    // Network listener for the whole app
    const handleStatus = () => setIsOnline(window.navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          // If offline, we can't fetch the doc, so we check local storage or assume setup if cached
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().setupComplete === true) {
            setIsSetupComplete(true);
          } else {
            setStep('signup');
          }
        } catch (error) {
          console.error("Auth sync error:", error);
          // If connection fails, don't block the user if they were already logged in
          if (!window.navigator.onLine) setIsSetupComplete(true); 
        }
      } else {
        setIsAuthenticated(false);
        setIsSetupComplete(false);
        setStep('landing');
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const completeAuth = () => {
    setIsSetupComplete(true);
    setIsAuthenticated(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f071e]">
      <Loader2 className="animate-spin text-[#7c3aed]" size={40} />
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col lg:flex-row">
        
        {/* SIDEBAR - Desktop (lg) Only. Hidden on Tablets (md) to allow full-screen width */}
        {isSetupComplete && (
          <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-100 flex-col sticky top-0 h-screen p-8 transition-all">
            <h1 className="text-3xl font-black text-[#7c3aed] italic mb-12 tracking-tighter">Hairly</h1>
            <nav className="flex flex-col gap-3 flex-1">
              <DesktopNavItem to="/home" icon={<HomeIcon size={20} />} label="Dashboard" />
              <DesktopNavItem to="/explore" icon={<Users size={20} />} label="Clients" />
              <DesktopNavItem to="/calendar" icon={<Calendar size={20} />} label="Appointments" />
              <DesktopNavItem to="/portfolio" icon={<PortfolioIcon size={20} />} label="Portfolio" />
              <DesktopNavItem to="/profile" icon={<User size={20} />} label="My Profile" />
            </nav>
            
            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-3 text-zinc-400 hover:text-red-500 font-bold transition-all p-4 mt-auto rounded-xl hover:bg-red-50"
            >
              <LogOut size={20} /> Logout
            </button>
          </aside>
        )}

        {/* MAIN CONTENT AREA */}
        <main className={`flex-1 min-h-screen relative bg-[#050505]`}>
          
          {/* Global Offline Banner */}
          {!isOnline && (
            <div className="bg-red-500 text-white text-[10px] py-1 font-bold text-center flex items-center justify-center gap-2 uppercase tracking-widest sticky top-0 z-[100]">
              <WifiOff size={12} /> Working Offline
            </div>
          )}

          <Routes>
            <Route path="/" element={
              isSetupComplete ? <Navigate to="/home" replace /> : (
                <div className="bg-[#0f071e] min-h-screen w-full">
                  <AnimatePresence mode="wait">
                    {step === 'landing' && <LandingHero key="landing" onStart={() => setStep('selection')} />}
                    {step === 'selection' && <SelectionScreen key="selection" onChoice={() => setStep('info')} />}
                    {step === 'info' && <OnboardingFlow key="info" onComplete={() => setStep('signup')} />}

                    {step === 'signup' && (
                      <motion.div
                        key="signup-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="min-h-screen bg-white flex justify-center items-center p-6"
                      >
                        <div className="w-full max-w-md">
                          <SignupSteps onSwitchToLogin={() => setStep('login')} onFinish={completeAuth} />
                        </div>
                      </motion.div>
                    )}

                    {step === 'login' && (
                      <div className="min-h-screen bg-white flex justify-center items-center p-6">
                        <div className="w-full max-w-md">
                          <Login key="login" onSwitchToSignup={() => setStep('signup')} onLoginSuccess={completeAuth} />
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )
            } />

            <Route path="/home" element={isSetupComplete ? <Home /> : <Navigate to="/" />} />
            <Route path="/explore" element={isSetupComplete ? <Explore /> : <Navigate to="/" />} />
            <Route path="/portfolio" element={isSetupComplete ? <Portfolio /> : <Navigate to="/" />} />
            <Route path="/profile" element={isSetupComplete ? <Profile /> : <Navigate to="/" />} />
            <Route path="/calendar" element={isSetupComplete ? <CalendarPage /> : <Navigate to="/" />} />
            <Route path="/edit-profile" element={isSetupComplete ? <EditProfile /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

         {/* BOTTOM NAV - Visible on Mobile and Tablet (md) */}
{isSetupComplete && (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-100 px-6 py-4 flex justify-between items-center z-[40] pb-safe shadow-2xl">
    <MobileNavItem to="/home" icon={<HomeIcon size={22} />} label="Home" />
    <MobileNavItem to="/explore" icon={<Users size={22} />} label="Clients" />
    <MobileNavItem to="/calendar" icon={<Calendar size={22} />} label="Calendar" />
    <MobileNavItem to="/portfolio" icon={<PortfolioIcon size={22} />} label="Portfolio" />
    <MobileNavItem to="/profile" icon={<User size={22} />} label="Profile" />
  </nav>
)}
        </main>
      </div>
    </Router>
  );
}

// --- Navigation Sub-components ---

function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[#7c3aed]' : 'text-zinc-300'}`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </NavLink>
  );
}

function DesktopNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
          isActive 
            ? 'bg-[#7c3aed] text-white shadow-lg shadow-purple-100' 
            : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}