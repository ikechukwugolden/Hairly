import { useState } from 'react';
import { Camera, Upload, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { auth, db, storage } from '../firebaseconfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [styleName, setStyleName] = useState("");
  const [success, setSuccess] = useState(false);

  // Handle Image Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file || !styleName) return alert("Please add a photo and a style name!");
    
    setUploading(true);
    try {
      const user = auth.currentUser;
      // 1. Create a unique filename in Storage
      const storageRef = ref(storage, `styles/${Date.now()}_${file.name}`);
      
      // 2. Upload file
      const uploadTask = await uploadBytesResumable(storageRef, file);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      // 3. Save details to Firestore "styles" collection
      await addDoc(collection(db, "styles"), {
        styleName: styleName,
        description: description,
        image: downloadURL, // This is what the Home page fetches
        stylistId: user.uid,
        stylistName: user.displayName || "Professional Stylist",
        createdAt: serverTimestamp(),
        likes: 0
      });

      setSuccess(true);
      // Reset form after 2 seconds
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setStyleName("");
        setDescription("");
        setSuccess(false);
      }, 2500);

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Something went wrong. Check your Firebase Storage rules!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-24">
      <header className="pt-8 mb-8">
        <h1 className="text-2xl font-black text-zinc-800">Post New Style</h1>
        <p className="text-zinc-400 text-xs font-medium">Share your masterpiece with the world</p>
      </header>

      {/* Image Upload Area */}
      <div className="relative w-full aspect-square rounded-[40px] bg-zinc-50 border-2 border-dashed border-zinc-200 overflow-hidden flex flex-col items-center justify-center group transition-all hover:border-[#7c3aed]/50">
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              onClick={() => {setFile(null); setPreview(null);}}
              className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 bg-[#7c3aed]/10 rounded-full flex items-center justify-center text-[#7c3aed] mb-4 group-hover:scale-110 transition-transform">
              <Camera size={28} />
            </div>
            <span className="text-sm font-bold text-zinc-500">Click to upload photo</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>

      {/* Input Fields */}
      <div className="mt-8 space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Style Name</label>
          <input 
            type="text" 
            placeholder="e.g. Bohemian Butterfly Braids"
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            className="w-full bg-zinc-50 p-4 rounded-2xl text-sm outline-none border border-transparent focus:border-[#7c3aed]/20 transition-all mt-1"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Short Description</label>
          <textarea 
            placeholder="Tell us about this look..."
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-50 p-4 rounded-2xl text-sm outline-none border border-transparent focus:border-[#7c3aed]/20 transition-all mt-1 resize-none"
          />
        </div>

        <button 
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            uploading ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-[#7c3aed] text-white shadow-lg active:scale-95'
          }`}
        >
          {uploading ? (
            <><Loader2 className="animate-spin" size={20} /> Processing...</>
          ) : success ? (
            <><CheckCircle2 size={20} /> Success!</>
          ) : (
            <><Upload size={20} /> Publish Globally</>
          )}
        </button>
      </div>
    </div>
  );
}