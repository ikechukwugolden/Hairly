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
import { Loader2, Home as HomeIcon, Users, Calendar, Image as PortfolioIcon, User, LogOut } from 'lucide-react';

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
  const [step, setStep] = useState('landing');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().setupComplete === true) {
            setIsSetupComplete(true);
          } else {
            setStep('signup');
          }
        } catch (error) {
          console.error("Auth sync error:", error);
        }
      } else {
        setIsAuthenticated(false);
        setIsSetupComplete(false);
        setStep('landing');
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
      <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">

        {/* SIDEBAR - Desktop Only */}
        {isSetupComplete && (
          <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col sticky top-0 h-screen p-6">
            <h1 className="text-3xl font-black text-[#7c3aed] italic mb-10">Hairly</h1>
            <nav className="flex flex-col gap-2 flex-1">
              <DesktopNavItem to="/home" icon={<HomeIcon size={20} />} label="Dashboard" />
              <DesktopNavItem to="/explore" icon={<Users size={20} />} label="Clients" />
              <DesktopNavItem to="/calendar" icon={<Calendar size={20} />} label="Appointments" />
              <DesktopNavItem to="/portfolio" icon={<PortfolioIcon size={20} />} label="Portfolio" />
              <DesktopNavItem to="/profile" icon={<User size={20} />} label="My Profile" />
            </nav>
            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-3 text-zinc-400 hover:text-red-500 font-bold transition-colors p-3 mt-auto"
            >
              <LogOut size={20} /> Logout
            </button>
          </aside>
        )}

        {/* CONTENT AREA */}
        {/* Changed logic: If not setup, use w-full. If setup, use max-6xl. */}
        <main className={`flex-1 bg-white min-h-screen relative transition-all duration-500 ${isSetupComplete
            ? 'max-w-full mx-auto md:w-full shadow-2xl'
            : 'w-full'
          }`}>
          <Routes>
            <Route path="/" element={
              isSetupComplete ? <Navigate to="/home" replace /> : (
                <div className="bg-[#0f071e] min-h-screen w-full">
                  <AnimatePresence mode="wait">
                    {/* Onboarding screens will now take up 100% of the browser width */}
                    {step === 'landing' && <LandingHero key="landing" onStart={() => setStep('selection')} />}
                    {step === 'selection' && <SelectionScreen key="selection" onChoice={() => setStep('info')} />}
                    {step === 'info' && <OnboardingFlow key="info" onComplete={() => setStep('signup')} />}

                    {step === 'signup' && (
                      <motion.div
                        key="signup-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="min-h-screen bg-white flex justify-center items-center"
                      >
                        {/* We constrain the form width inside the full-screen page so it's not too wide */}
                        <div className="w-full max-w-md mx-auto">
                          <SignupSteps onSwitchToLogin={() => setStep('login')} onFinish={completeAuth} />
                        </div>
                      </motion.div>
                    )}

                    {step === 'login' && (
                      <div className="min-h-screen bg-white flex justify-center items-center">
                        <div className="w-full max-w-md mx-auto">
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

          {/* BOTTOM NAV - Mobile Only */}
          {isSetupComplete && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-4 flex justify-between items-center z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
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

// Mobile Nav Item (Icon + Small Text)
function MobileNavItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-[#7c3aed]' : 'text-zinc-300'}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
  );
}

// Desktop Nav Item (Horizontal Icon + Label)
function DesktopNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-[#7c3aed10] text-[#7c3aed]' : 'text-zinc-500 hover:bg-zinc-50'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}