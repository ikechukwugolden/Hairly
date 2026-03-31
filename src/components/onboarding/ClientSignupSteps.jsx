import React, { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../../../firebaseconfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ChevronLeft, Check, Loader2, Apple } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { BiometricScanner } from './BiometricScanner';

export const ClientSignupSteps = ({ onSwitchToLogin, onFinish }) => {
  const [subStep, setSubStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', 
    email: '', 
    password: '',
    interests: [],
    role: 'client'
  });

  const interests = ["Braids", "Natural Hair", "Wigs", "Kids", "Treatments", "Extensions"];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleInterest = (item) => {
    const updated = formData.interests.includes(item)
      ? formData.interests.filter(i => i !== item)
      : [...formData.interests, item];
    setFormData({ ...formData, interests: updated });
  };

  // --- FIREBASE LOGIC ---
  const handleComplete = async () => {
    if (formData.interests.length === 0) {
      alert("Please select at least one interest!");
      return;
    }

    setLoading(true);
    try {
      // 1. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const user = userCredential.user;

      // 2. Create User Document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        role: 'client',
        interests: formData.interests,
        setupComplete: true,
        createdAt: new Date().toISOString(),
        profileImage: "", // Placeholder for later
        phoneNumber: ""   // Placeholder for later
      });

      // 3. Final Callback
      onFinish();
      
    } catch (error) {
      console.error("Signup Error:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (subStep === 1 && (!formData.email || !formData.password)) {
      alert("Please fill in your credentials");
      return;
    }
    setSubStep(prev => prev + 1);
  };

  // --- STEP 1: AUTHENTICATION ---
  const AuthStep = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="p-8 pt-20">
      <h1 className="text-4xl font-black text-[#7c3aed] italic mb-2 tracking-tighter">Hairly</h1>
      <h2 className="text-2xl font-bold text-zinc-800 mb-8">Sign up</h2>

      <div className="space-y-4">
        <input
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Full Name"
          className="w-full p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-[#7c3aed] transition-all outline-none text-black"
        />
        <input
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-[#7c3aed] transition-all outline-none text-black"
        />
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
          className="w-full p-4 bg-zinc-50 rounded-2xl border border-transparent focus:border-[#7c3aed] transition-all outline-none text-black"
        />

        <button
          onClick={handleNext}
          className="w-full py-4 bg-[#7c3aed] text-white rounded-2xl font-bold shadow-lg shadow-purple-100 mt-4 active:scale-95 transition-all"
        >
          Continue
        </button>
      </div>

      <div className="mt-10 flex flex-col items-center">
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-6">Or sign up with</p>
        <div className="flex gap-4">
          <button type="button" className="w-14 h-14 border border-zinc-100 rounded-full flex items-center justify-center bg-white shadow-sm hover:bg-zinc-50 transition-all">
            <FcGoogle size={24} />
          </button>
          <button type="button" className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-sm">
            <Apple size={24} className="text-white" />
          </button>
        </div>
        <p className="mt-10 text-sm text-zinc-500 font-medium">
          Already have an account? <button onClick={onSwitchToLogin} className="text-[#7c3aed] font-bold">Login</button>
        </p>
      </div>
    </motion.div>
  );

  // --- STEP 2: SECURITY ---
  const SecurityStep = () => (
    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="p-8 flex flex-col h-full text-center">
      <div className="flex items-center mb-8">
        <ChevronLeft onClick={() => setSubStep(1)} className="cursor-pointer text-zinc-400" />
        <h2 className="flex-1 text-xl font-bold text-zinc-800 italic">Secure Your Account</h2>
      </div>
      <p className="text-zinc-400 text-sm mb-12">Add a layer of security to your bookings</p>

      <BiometricScanner onComplete={() => setSubStep(3)} />

      <p className="mt-auto text-center text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
        Encrypted & Secure 256-Bit
      </p>
    </motion.div>
  );

  // --- STEP 3: INTERESTS ---
  const InterestStep = () => (
    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="p-8 h-full flex flex-col">
      <div className="flex items-center mb-8">
        <ChevronLeft onClick={() => setSubStep(2)} className="cursor-pointer text-zinc-400" />
        <h2 className="flex-1 text-xl font-bold text-zinc-800">Interests</h2>
      </div>

      <p className="text-zinc-400 text-sm mb-6">Select your favorite styles to personalize your feed.</p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {interests.map(item => (
          <button
            key={item}
            onClick={() => toggleInterest(item)}
            className={`p-4 rounded-2xl border-2 transition-all text-left font-bold text-sm flex items-center justify-between ${
              formData.interests.includes(item) 
              ? 'border-[#7c3aed] bg-purple-50 text-[#7c3aed]' 
              : 'border-transparent bg-zinc-50 text-zinc-600'
            }`}
          >
            {item}
            {formData.interests.includes(item) && <Check size={14} />}
          </button>
        ))}
      </div>

      <button
        disabled={loading}
        onClick={handleComplete}
        className="mt-auto w-full py-4 bg-[#7c3aed] text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all flex justify-center items-center"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
      </button>
    </motion.div>
  );

  return (
    <div className="h-full bg-white flex flex-col overflow-y-auto no-scrollbar">
      <AnimatePresence mode="wait">
        {subStep === 1 && <AuthStep key="auth" />}
        {subStep === 2 && <SecurityStep key="security" />}
        {subStep === 3 && <InterestStep key="interest" />}
      </AnimatePresence>
    </div>
  );
};
