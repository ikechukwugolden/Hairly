import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebaseconfig';

import { LandingHero } from './components/onboarding/LandingHero';
import { SelectionScreen } from './components/onboarding/SelectionScreen';
import { OnboardingFlow } from './components/onboarding/InfoSlides';
import { SignupSteps } from './components/onboarding/SignupSteps';
import { Login } from './components/onboarding/Login';
import { Loader2, Home as HomeIcon, Users, Calendar, Image as PortfolioIcon, User } from 'lucide-react';

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
            // If they are logged in but didn't finish setup, jump them to setup
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

  // THIS IS THE TRIGGER: Called by SignupSteps.jsx when finished
  const completeAuth = () => {
    setIsSetupComplete(true);
    setIsAuthenticated(true);
    // Router will now automatically pick up isSetupComplete and show /home
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f071e]">
      <Loader2 className="animate-spin text-[#7c3aed]" size={40} />
    </div>
  );

  return (
    <Router>
      <main className="bg-white min-h-screen text-black overflow-x-hidden max-w-md mx-auto shadow-2xl relative">
        <Routes>
          {/* ONBOARDING ROUTE */}
          <Route path="/" element={
            isSetupComplete ? (
              <Navigate to="/home" replace />
            ) : (
              <div className="bg-[#0f071e] min-h-screen">
                <AnimatePresence mode="wait">
                  {step === 'landing' && <LandingHero key="landing" onStart={() => setStep('selection')} />}
                  {step === 'selection' && <SelectionScreen key="selection" onChoice={() => setStep('info')} />}
                  {step === 'info' && <OnboardingFlow key="info" onComplete={() => setStep('signup')} />}
                  
                  {step === 'signup' && (
                    <motion.div key="signup-wrapper" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-white">
                      <SignupSteps
                        onSwitchToLogin={() => setStep('login')}
                        onFinish={completeAuth}
                      />
                    </motion.div>
                  )}

                  {step === 'login' && (
                    <Login key="login" onSwitchToSignup={() => setStep('signup')} onLoginSuccess={completeAuth} />
                  )}
                </AnimatePresence>
              </div>
            )
          } />

          {/* PROTECTED ROUTES */}
          <Route path="/home" element={isSetupComplete ? <Home /> : <Navigate to="/" />} />
          <Route path="/explore" element={isSetupComplete ? <Explore /> : <Navigate to="/" />} />
          <Route path="/portfolio" element={isSetupComplete ? <Portfolio /> : <Navigate to="/" />} />
          <Route path="/profile" element={isSetupComplete ? <Profile /> : <Navigate to="/" />} />
          <Route path="/calendar" element={isSetupComplete ? <CalendarPage /> : <Navigate to="/" />} />
          <Route path="/edit-profile" element={isSetupComplete ? <EditProfile /> : <Navigate to="/" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* BOTTOM NAV - Only shows when setup is done */}
        {isSetupComplete && (
          <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-100 px-6 py-4 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
            <NavItem to="/home" icon={<HomeIcon size={22} />} label="Home" />
            <NavItem to="/explore" icon={<Users size={22} />} label="Clients" />
            <NavItem to="/calendar" icon={<Calendar size={22} />} label="Calendar" />
            <NavItem to="/portfolio" icon={<PortfolioIcon size={22} />} label="Portfolio" />
            <NavItem to="/profile" icon={<User size={22} />} label="Profile" />
          </nav>
        )}
      </main>
    </Router>
  );
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-all duration-300 ${
          isActive ? 'text-[#7c3aed] scale-110' : 'text-zinc-300 hover:text-zinc-400'
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </NavLink>
  );
}