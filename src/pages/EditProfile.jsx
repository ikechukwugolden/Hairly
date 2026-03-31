import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    phoneNumber: '',
    address: '',
    bio: '',
    specialties: '',
    serviceType: '',
    workingHours: '',
    profileImage: '',
    bookingLimitPerDay: 10,
    acceptingBookings: true,
  });

  const isStylist = (formData.role || 'stylist') === 'stylist';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFormData(prev => ({ ...prev, ...userDoc.data() }));
        }
        setLoading(false);
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handle Image Selection (UI only for now, or upload to Storage)
  const handleImageClick = () => fileInputRef.current.click();
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For a quick preview/demo, we use a local URL
      // Ideally, you'd upload this to Firebase Storage here
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const user = auth.currentUser;
      const safeDailyLimit = Math.max(1, Math.min(100, Number.parseInt(formData.bookingLimitPerDay, 10) || 10));
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        bookingLimitPerDay: safeDailyLimit,
        acceptingBookings: formData.acceptingBookings !== false,
      });
      setSaveSuccess(true);
      // Brief delay so user sees the "Success" state
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      console.error("Update Error:", error);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-[#7c3aed] mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Loading Profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Dynamic Header */}
      <div className="bg-white/80 backdrop-blur-md p-6 pt-12 flex items-center justify-between border-b border-zinc-100 sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-50 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-zinc-800" />
        </button>
        <h1 className="font-black italic uppercase text-sm tracking-tighter text-zinc-800">Edit Profile</h1>
        <div className="w-10" /> {/* Spacer for symmetry */}
      </div>

      <form className="max-w-md mx-auto p-6 space-y-8" onSubmit={handleSave}>
        
        {/* Profile Image Section */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer" onClick={handleImageClick}>
            <div className="w-28 h-28 rounded-full overflow-hidden border-[6px] border-white shadow-xl shadow-purple-100/50">
              <img 
                src={formData.profileImage || `https://ui-avatars.com/api/?name=${formData.fullName}&background=7c3aed&color=fff`} 
                className="w-full h-full object-cover" 
                alt="Profile"
              />
            </div>
            <div className="absolute bottom-0 right-0 p-2.5 bg-[#7c3aed] text-white rounded-full border-4 border-white shadow-lg transition-transform group-hover:scale-110">
              <Camera size={16} fill="white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
          <p className="text-[9px] text-[#7c3aed] mt-4 font-black uppercase tracking-widest">Tap photo to change</p>
        </div>

        {/* Form Grid */}
        <div className="grid gap-5">
          <CustomInput 
            label="Business Name" 
            value={formData.businessName} 
            onChange={(val) => setFormData({...formData, businessName: val})}
            placeholder="e.g., The Fade Master"
          />

          <CustomTextArea 
            label="Bio / Experience" 
            value={formData.bio} 
            onChange={(val) => setFormData({...formData, bio: val})}
            placeholder="Specializing in textured hair and modern fades..."
          />

          <div className="grid grid-cols-2 gap-4">
            <CustomInput 
              label="Specialties" 
              value={formData.specialties} 
              onChange={(val) => setFormData({...formData, specialties: val})}
              placeholder="Braids, Fades..."
            />
            <CustomInput 
              label="Hours" 
              value={formData.workingHours} 
              onChange={(val) => setFormData({...formData, workingHours: val})}
              placeholder="9AM - 8PM"
            />
          </div>

          {isStylist && (
            <div className="grid grid-cols-2 gap-4">
              <CustomInput
                label="Bookings / Day"
                value={formData.bookingLimitPerDay}
                onChange={(val) => setFormData({ ...formData, bookingLimitPerDay: val })}
                placeholder="10"
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-tighter">Availability</label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, acceptingBookings: !(prev.acceptingBookings !== false) }))}
                  className={`w-full px-5 py-4 border rounded-2xl text-sm font-bold transition-all ${
                    formData.acceptingBookings !== false
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}
                >
                  {formData.acceptingBookings !== false ? 'Accepting Bookings' : 'Not Accepting'}
                </button>
              </div>
            </div>
          )}

          <CustomInput 
            label="Shop Address" 
            value={formData.address} 
            onChange={(val) => setFormData({...formData, address: val})}
            placeholder="Street name or landmark"
          />

          <CustomInput 
            label="WhatsApp / Phone" 
            value={formData.phoneNumber} 
            onChange={(val) => setFormData({...formData, phoneNumber: val})}
            placeholder="080..."
          />
        </div>

        {/* Floating Action Button */}
        <button 
          type="submit"
          disabled={saving || saveSuccess}
          className={`w-full py-5 rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all flex justify-center items-center gap-3
            ${saveSuccess ? 'bg-green-500 text-white shadow-green-100' : 'bg-[#7c3aed] text-white shadow-purple-100 hover:scale-[1.02] active:scale-95'}
          `}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : saveSuccess ? (
            <CheckCircle2 size={20} className="animate-bounce" />
          ) : null}
          {saving ? 'Syncing...' : saveSuccess ? 'Profile Updated' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}

// Reusable UI Sub-components for cleaner code
const CustomInput = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-tighter">{label}</label>
    <input 
      className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-800 placeholder:text-zinc-300 focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-50 outline-none transition-all"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const CustomTextArea = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 tracking-tighter">{label}</label>
    <textarea 
      rows="3"
      className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-800 placeholder:text-zinc-300 focus:border-[#7c3aed] focus:ring-4 focus:ring-purple-50 outline-none transition-all resize-none"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);
