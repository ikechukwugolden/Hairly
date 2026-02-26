import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Loader2 } from 'lucide-react';
import { auth, db } from '../../firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    phoneNumber: '',
    address: '',
    bio: '',
    specialties: '',
    serviceType: '',
    workingHours: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFormData({ ...formData, ...userDoc.data() });
        }
        setLoading(false);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, "users", user.uid), formData);
      navigate('/profile'); // Go back to profile after saving
    } catch (error) {
      console.error("Update Error:", error);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-[#7c3aed]" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-10">
      {/* Header */}
      <div className="bg-white p-6 pt-12 flex items-center justify-between border-b border-zinc-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-50 rounded-full">
          <ArrowLeft size={24} className="text-zinc-800" />
        </button>
        <h1 className="font-bold text-lg text-zinc-800">Edit Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="text-[#7c3aed] font-bold text-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <form className="p-6 space-y-6" onSubmit={handleSave}>
        {/* Profile Image Edit */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
              <img 
                src={formData.profileImage || `https://ui-avatars.com/api/?name=${formData.fullName}&background=7c3aed&color=fff`} 
                className="w-full h-full object-cover" 
                alt="Profile"
              />
            </div>
            <button type="button" className="absolute bottom-0 right-0 p-2 bg-[#7c3aed] text-white rounded-full border-2 border-white shadow-sm">
              <Camera size={14} />
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest">Change Photo</p>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Business Name</label>
            <input 
              className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm focus:border-[#7c3aed] outline-none transition-all"
              value={formData.businessName}
              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              placeholder="e.g., Chi-Beauty Hub"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Bio / Description</label>
            <textarea 
              rows="3"
              className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm focus:border-[#7c3aed] outline-none transition-all resize-none"
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Briefly describe your expertise..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Specialties</label>
              <input 
                className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm outline-none"
                value={formData.specialties}
                onChange={(e) => setFormData({...formData, specialties: e.target.value})}
                placeholder="Braids, Locs..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Working Hours</label>
              <input 
                className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm outline-none"
                value={formData.workingHours}
                onChange={(e) => setFormData({...formData, workingHours: e.target.value})}
                placeholder="9AM - 6PM"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Address</label>
            <input 
              className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm outline-none"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Shop location or Area"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-400 ml-1">Phone Number</label>
            <input 
              className="w-full p-4 bg-white border border-zinc-100 rounded-2xl text-sm outline-none"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              placeholder="070..."
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-[#7c3aed] text-white p-4 rounded-2xl font-bold text-sm shadow-lg shadow-purple-100 mt-4 active:scale-95 transition-all flex justify-center items-center gap-2"
        >
          {saving && <Loader2 className="animate-spin" size={18} />}
          Save Changes
        </button>
      </form>
    </div>
  );
}