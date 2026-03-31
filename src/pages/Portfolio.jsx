import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, X, Camera, Send, Heart, MoreHorizontal, Loader2, WifiOff, BookmarkPlus, CheckCircle2, Upload, Share2, Trash2
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../firebaseconfig';

const SITE_KNOWLEDGE = `You are Hairly Vision, an AI hairstyle assistant. Give concise, practical hair style recommendations tailored to the user's goals.`;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function parseStyleRecommendation(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return {
      styleName: 'Personalized Style',
      details: 'I could not generate a full style analysis. Please try another photo.',
    };
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const styleName =
        parsed.styleName ||
        parsed.hairStyle ||
        parsed.recommendedStyle ||
        'Personalized Style';
      const whyItFits = parsed.whyItFits || parsed.reason || parsed.summary || '';
      const careTip = parsed.careTip || parsed.careTips || '';
      const details = [whyItFits, careTip && `Care tip: ${careTip}`].filter(Boolean).join('\n');

      return {
        styleName,
        details: details || text,
      };
    } catch {
      // Ignore parse failure and fallback to plain text.
    }
  }

  const firstLine = text.split('\n').find((line) => line.trim()) || 'Personalized Style';
  const cleanName = firstLine
    .replace(/^[-*#\d.\s]+/, '')
    .replace(/^best match:?\s*/i, '')
    .trim();

  return {
    styleName: cleanName || 'Personalized Style',
    details: text,
  };
}

function estimateFirestoreStringBytes(value) {
  return new Blob([String(value || '')]).size;
}

async function compressDataUrlForFirestore(sourceDataUrl, maxWidth = 1080) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = sourceDataUrl;
  });

  const widthScales = [1, 0.85, 0.7, 0.55];
  const qualityLevels = [0.72, 0.6, 0.5, 0.4, 0.32];
  const maxSafeBytes = 700000;
  let bestCandidate = '';

  for (const scaleFactor of widthScales) {
    const scaledWidth = Math.max(320, Math.round(maxWidth * scaleFactor));
    const scale = Math.min(1, scaledWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image.');
    ctx.drawImage(image, 0, 0, width, height);

    for (const qualityValue of qualityLevels) {
      const candidate = canvas.toDataURL('image/jpeg', qualityValue);
      bestCandidate = candidate;
      if (estimateFirestoreStringBytes(candidate) <= maxSafeBytes) {
        return candidate;
      }
    }
  }

  if (estimateFirestoreStringBytes(bestCandidate) > maxSafeBytes) {
    throw new Error('Image too large for Firestore.');
  }

  return bestCandidate;
}

async function compressImageForFirestore(file, maxWidth = 1080) {
  const sourceDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return compressDataUrlForFirestore(sourceDataUrl, maxWidth);
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl || '').split(',');
  const mimeTypeMatch = header?.match(/data:(.*?);base64/);
  const mimeType = mimeTypeMatch?.[1] || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function queryGeminiFromParts(parts) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return 'AI is not configured yet. Add VITE_GEMINI_API_KEY to your .env file and restart the app.';
  }

  if (!window.navigator.onLine) {
    return "You're offline right now. Reconnect to use AI.";
  }

  const models = [
    import.meta.env.VITE_GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
  ].filter(Boolean);

  let lastError = 'AI request failed. Please try again.';

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || 'AI request failed.';
        const modelNotSupported = /not found|not supported|unsupported|for API version/i.test(message);
        lastError = message;
        if (modelNotSupported) continue;
        return message;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastError = 'No response from AI. Please try again.';
    } catch {
      lastError = 'Network error while contacting AI. Please try again.';
    }
  }

  return lastError;
}

async function queryGemini(userMessage) {
  const prompt = `${SITE_KNOWLEDGE}\n\nUser: ${userMessage}`;
  return queryGeminiFromParts([{ text: prompt }]);
}

async function queryGeminiWithImage(base64Image, mimeType = 'image/jpeg') {
  const prompt = `${SITE_KNOWLEDGE}

Look at this person's photo and recommend one hairstyle that will likely suit their face shape and vibe.
Return ONLY valid JSON with this shape:
{"styleName":"...","whyItFits":"...","careTip":"..."}`;

  return queryGeminiFromParts([
    { text: prompt },
    { inline_data: { mime_type: mimeType, data: base64Image } },
  ]);
}

async function queryGeminiHairstylePreview(base64Image, styleName, mimeType = 'image/jpeg') {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || !base64Image || !window.navigator.onLine) {
    return { imageDataUrl: null, error: 'No API key or internet connection.' };
  }

  const models = [
    import.meta.env.VITE_GEMINI_IMAGE_MODEL,
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-preview-image-generation',
    'gemini-2.0-flash-exp-image-generation',
    'gemini-2.0-flash-exp',
  ].filter(Boolean);
  let lastError = 'No image model returned a hairstyle preview.';

  const prompt = `${SITE_KNOWLEDGE}

Edit this selfie.
Keep the same face, skin tone, and identity.
Apply one realistic hairstyle that suits the person, focused on "${styleName}".
Do not alter clothes or background.
Return an edited image.`;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Image } },
                ],
              },
            ],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        const message = data?.error?.message || '';
        const modelUnsupported = /not found|not supported|unsupported|for API version/i.test(message);
        lastError = `${model}: ${message || 'request failed'}`;
        if (modelUnsupported) continue;
        continue;
      }

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => {
        const snake = part?.inline_data;
        const camel = part?.inlineData;
        const mime = snake?.mime_type || camel?.mimeType || '';
        const payload = snake?.data || camel?.data;
        return payload && /^image\//.test(mime);
      });

      if (imagePart) {
        const snake = imagePart?.inline_data;
        const camel = imagePart?.inlineData;
        const mime = snake?.mime_type || camel?.mimeType || 'image/png';
        const payload = snake?.data || camel?.data;
        return { imageDataUrl: `data:${mime};base64,${payload}`, error: null };
      }
      lastError = `${model}: model responded without image data`;
    } catch {
      // Fallback to next model.
      lastError = `${model}: network/request error`;
    }
  }

  // Final fallback: discover image-capable models dynamically.
  try {
    const modelListResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const modelListData = await modelListResponse.json();
    const allModels = Array.isArray(modelListData?.models) ? modelListData.models : [];

    const discovered = allModels
      .map((item) => String(item?.name || '').replace(/^models\//, ''))
      .filter((name) => /image|vision|flash/i.test(name))
      .filter((name) => !models.includes(name))
      .slice(0, 6);

    for (const model of discovered) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mimeType, data: base64Image } },
                  ],
                },
              ],
              generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
          }
        );

        const data = await response.json();
        if (!response.ok) continue;

        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((part) => {
          const snake = part?.inline_data;
          const camel = part?.inlineData;
          const mime = snake?.mime_type || camel?.mimeType || '';
          const payload = snake?.data || camel?.data;
          return payload && /^image\//.test(mime);
        });

        if (imagePart) {
          const snake = imagePart?.inline_data;
          const camel = imagePart?.inlineData;
          const mime = snake?.mime_type || camel?.mimeType || 'image/png';
          const payload = snake?.data || camel?.data;
          return { imageDataUrl: `data:${mime};base64,${payload}`, error: null };
        }
        lastError = `${model}: discovered model returned no image data`;
      } catch {
        // Continue trying discovered models.
        lastError = `${model}: discovered model request error`;
      }
    }
  } catch {
    // Ignore discovery errors.
    lastError = 'Could not discover image-capable models for preview.';
  }

  return { imageDataUrl: null, error: lastError };
}

export default function HairlyPortfolio() {
  const [activeTab, setActiveTab] = useState('Gallery');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      text: 'Send me a selfie or upload a picture. I will suggest a hairstyle that suits you, then you can save it to your portfolio.',
    },
  ]);
  const [styles, setStyles] = useState([]);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [userId, setUserId] = useState(null);
  const [draftStyle, setDraftStyle] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [activeStyleActionId, setActiveStyleActionId] = useState(null);
  const [confirmDeleteStyleId, setConfirmDeleteStyleId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(window.navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setStyles([]);
      setLoadingStyles(false);
      return;
    }

    setLoadingStyles(true);
    const stylesQuery = query(collection(db, 'styles'), where('ownerId', '==', userId));

    const unsubscribe = onSnapshot(
      stylesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setStyles(list);
        setLoadingStyles(false);
      },
      () => {
        setLoadingStyles(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isChatOpen, chatHistory, isTyping, draftStyle]);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const displayStyles =
    activeTab === 'Analysis'
      ? styles.filter((style) => style.source === 'ai')
      : activeTab === 'Saved'
        ? styles.filter((style) => style.sharedToHome)
        : styles;

  const showToast = (message, type = 'info', duration = 2600) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, duration);
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const openAiCamera = async () => {
    if (isTyping || isOpeningCamera) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Your browser does not support camera access.');
      setIsCameraOpen(true);
      return;
    }

    setIsOpeningCamera(true);
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      stopCameraStream();
      mediaStreamRef.current = stream;
      setIsCameraOpen(true);

      // Wait until the modal/video is visible before binding the stream.
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }, 20);
    } catch {
      setCameraError('Could not open camera. Please allow camera permission.');
      setIsCameraOpen(true);
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const processSelectedImage = async (file) => {
    const localUrl = URL.createObjectURL(file);
    setChatHistory((prev) => [...prev, { role: 'user', type: 'image', text: localUrl }]);
    setIsTyping(true);

    try {
      const [base64Image, originalFirestoreImage] = await Promise.all([
        fileToBase64(file),
        compressImageForFirestore(file),
      ]);
      const rawResponse = await queryGeminiWithImage(base64Image, file.type || 'image/jpeg');
      const parsed = parseStyleRecommendation(rawResponse);
      const previewResult = await queryGeminiHairstylePreview(
        base64Image,
        parsed.styleName,
        file.type || 'image/jpeg'
      );
      const aiPreviewImage = previewResult?.imageDataUrl;
      const firestoreImage = aiPreviewImage
        ? await compressDataUrlForFirestore(aiPreviewImage)
        : originalFirestoreImage;

      const aiText = `Best style for you: ${parsed.styleName}\n${parsed.details}`;
      setChatHistory((prev) => [...prev, { role: 'ai', text: aiText }]);
      if (aiPreviewImage) {
        setChatHistory((prev) => [
          ...prev,
          { role: 'ai', text: `I added "${parsed.styleName}" to your selfie. Save it if you like it.` },
          { role: 'ai', type: 'image', text: aiPreviewImage },
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `I could not generate the hairstyle preview this time (${previewResult?.error || 'image model unavailable'}), but your recommendation is ready to save.`,
          },
        ]);
      }

      if (draftStyle?.sourcePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(draftStyle.sourcePreviewUrl);
      if (draftStyle?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(draftStyle.previewUrl);

      setDraftStyle({
        file,
        sourcePreviewUrl: localUrl,
        firestoreImage,
        previewUrl: aiPreviewImage || localUrl,
        styleName: parsed.styleName,
        description: parsed.details,
        isAiRender: Boolean(aiPreviewImage),
        saved: false,
      });
    } catch (error) {
      const isLargeImageError = /too large for firestore/i.test(String(error?.message || ''));
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'ai',
          text: isLargeImageError
            ? 'This image is too large to save in Firestore. Please use a smaller photo.'
            : 'I could not read that image. Please try another photo.',
        },
      ]);
      URL.revokeObjectURL(localUrl);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || isTyping) return;

    setChatHistory((prev) => [...prev, { role: 'user', text: message }]);
    setChatInput('');
    setIsTyping(true);

    const response = await queryGemini(message);
    setChatHistory((prev) => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
  };

  const handleCameraClick = () => {
    openAiCamera();
  };

  const handleUploadClick = () => {
    if (isCameraOpen) closeCameraModal();
    if (!isTyping) fileInputRef.current?.click();
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isTyping) return;

    await processSelectedImage(file);
  };

  const handleCapturePhoto = async () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || isTyping) return;

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Could not capture photo. Please try again.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const capturedBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));

    if (!capturedBlob) {
      setCameraError('Could not capture photo. Please try again.');
      return;
    }

    const capturedFile = new File([capturedBlob], `ai-camera-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    closeCameraModal();
    await processSelectedImage(capturedFile);
  };

  const handleSaveDraftToPortfolio = async () => {
    if (!draftStyle || !draftStyle.firestoreImage || isSavingDraft) return;

    if (!userId) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: 'Please log in first so I can save this style to your portfolio.' },
      ]);
      return;
    }

    setIsSavingDraft(true);

    try {
      const stylePayload = {
        ownerId: userId,
        styleName: draftStyle.styleName,
        description: draftStyle.description,
        source: 'ai',
        sharedToHome: false,
        createdAt: serverTimestamp(),
      };

      try {
        await addDoc(collection(db, 'styles'), {
          ...stylePayload,
          image: draftStyle.firestoreImage,
          imageSource: 'firestore',
        });
      } catch (firestoreImageError) {
        const shouldFallbackToStorage =
          draftStyle.file &&
          /(too large|resource-exhausted|invalid-argument)/i.test(
            String(firestoreImageError?.message || firestoreImageError?.code || '')
          );

        if (!shouldFallbackToStorage) throw firestoreImageError;

        const uploadBlob =
          draftStyle.isAiRender && typeof draftStyle.previewUrl === 'string' && draftStyle.previewUrl.startsWith('data:image/')
            ? dataUrlToBlob(draftStyle.previewUrl)
            : draftStyle.file;
        const safeFileName = (draftStyle.file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `styles/${userId}/ai-${Date.now()}-${safeFileName}`);
        await uploadBytes(storageRef, uploadBlob);
        const imageUrl = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'styles'), {
          ...stylePayload,
          image: imageUrl,
          imageSource: 'storage-fallback',
        });
      }

      setDraftStyle((prev) => (prev ? { ...prev, saved: true } : prev));
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: 'Saved! Your AI hairstyle is now in your portfolio.' },
      ]);
      showToast('Saved to portfolio', 'success');
    } catch (error) {
      const rawMessage = String(error?.message || error?.code || '');
      const detail = /permission-denied/i.test(rawMessage)
        ? 'Firestore permission denied.'
        : /offline|network/i.test(rawMessage)
          ? 'You appear to be offline.'
          : /quota/i.test(rawMessage)
            ? 'Project quota was reached.'
            : 'Please check Firebase rules and limits.';
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: `I could not save to portfolio right now. ${detail}` },
      ]);
      showToast(`Save failed. ${detail}`, 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleShareToHome = async (style) => {
    if (!style?.id || !userId || activeStyleActionId) return;
    setActiveStyleActionId(style.id);
    try {
      await updateDoc(doc(db, 'styles', style.id), {
        sharedToHome: true,
        sharedAt: serverTimestamp(),
      });
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: `"${style.styleName || 'Style'}" was shared to Home page.` },
      ]);
      showToast('Shared to Home page', 'success');
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: 'I could not share this style to Home right now. Please try again.' },
      ]);
      showToast('Could not share style right now', 'error');
    } finally {
      setActiveStyleActionId(null);
    }
  };

  const handleDeleteStyle = async (style) => {
    if (!style?.id || !userId || activeStyleActionId) return;
    if (confirmDeleteStyleId !== style.id) {
      setConfirmDeleteStyleId(style.id);
      showToast('Tap delete again to confirm', 'warning', 3000);
      return;
    }

    setActiveStyleActionId(style.id);
    try {
      await deleteDoc(doc(db, 'styles', style.id));
      setConfirmDeleteStyleId(null);
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: 'Photo deleted from portfolio.' },
      ]);
      showToast('Photo deleted', 'success');
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'ai', text: 'I could not delete this photo right now. Please try again.' },
      ]);
      showToast('Could not delete photo right now', 'error');
    } finally {
      setActiveStyleActionId(null);
    }
  };

  useEffect(() => () => stopCameraStream(), []);

  useEffect(() => {
    return () => {
      if (draftStyle?.sourcePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(draftStyle.sourcePreviewUrl);
      if (draftStyle?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(draftStyle.previewUrl);
    };
  }, [draftStyle]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans relative">
      <section className={`flex-1 min-w-0 flex flex-col transition-all duration-500 bg-white ${isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="pt-8 px-5 pb-2 md:pt-12 md:px-10 shrink-0">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-[900] italic uppercase tracking-tighter leading-[0.8] text-black">
            Portfolio
          </h1>
          <div className="flex justify-between items-end mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
              {styles.length} Styles Saved
            </p>
            <button className="p-2 text-zinc-400 md:block">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        <div className="flex px-5 md:px-10 gap-6 mt-6 border-b border-zinc-100 overflow-x-auto no-scrollbar shrink-0">
          {['Gallery', 'Analysis', 'Saved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[11px] font-[900] uppercase tracking-widest whitespace-nowrap relative transition-colors ${
                activeTab === tab ? 'text-[#7c3aed]' : 'text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#7c3aed] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-50 md:bg-white md:p-4 lg:p-10">
          {loadingStyles ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-[#7c3aed]" size={28} />
            </div>
          ) : displayStyles.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500">
                <p className="font-bold">No styles yet</p>
                <p className="text-sm mt-1">
                  {activeTab === 'Saved'
                    ? 'Share a style to Home page and it will appear here.'
                    : 'Use AI camera, then save your result.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[1px] md:gap-4 lg:gap-6">
              {displayStyles.map((style) => (
                <div key={style.id} className="aspect-square bg-zinc-200 relative group overflow-hidden md:rounded-2xl lg:rounded-3xl shadow-sm">
                  <img
                    src={style.image}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={style.styleName || 'Saved style'}
                  />
                  <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => handleShareToHome(style)}
                      disabled={Boolean(style.sharedToHome) || activeStyleActionId === style.id}
                      className="h-8 px-2 rounded-lg bg-white/95 text-zinc-700 text-[10px] font-black uppercase tracking-wide disabled:opacity-60 inline-flex items-center gap-1"
                    >
                      <Share2 size={12} />
                      {style.sharedToHome ? 'Shared' : 'Share'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStyle(style)}
                      disabled={activeStyleActionId === style.id}
                      className="h-8 w-8 rounded-lg bg-red-500/95 text-white inline-flex items-center justify-center disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <Heart size={20} className="text-white fill-white mb-1" />
                    <span className="text-[8px] text-white font-bold uppercase tracking-tighter truncate w-full">
                      {style.styleName || 'Saved Style'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside
        className={`
        fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-500
        md:relative md:inset-auto md:translate-x-0 md:border-l md:border-zinc-100
        ${isChatOpen ? 'translate-x-0 flex md:w-[400px] lg:w-[450px]' : 'translate-x-full hidden md:hidden'}
      `}
      >
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7c3aed] rounded-full flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles size={20} className="text-white" fill="white" />
            </div>
            <div>
              <p className="font-[900] uppercase text-[10px] tracking-widest leading-none">Hairly Vision</p>
              <p className={`text-[9px] font-bold uppercase mt-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                {isOnline ? 'AI Online' : 'AI Offline'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          {chatHistory.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`p-4 max-w-[85%] rounded-3xl text-sm font-bold leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-[#7c3aed] text-white rounded-tr-none'
                    : 'bg-zinc-100 text-zinc-800 rounded-tl-none'
                }`}
              >
                {msg.type === 'image' ? (
                  <img
                    src={msg.text}
                    alt="Uploaded hairstyle"
                    className="w-40 h-40 sm:w-52 sm:h-52 object-cover rounded-2xl"
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {draftStyle && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={draftStyle.previewUrl}
                  alt="AI style draft"
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-800 truncate">{draftStyle.styleName}</p>
                  <p className="text-[11px] text-zinc-500 font-semibold">
                    {draftStyle.isAiRender ? 'AI hairstyle preview ready' : 'Ready to save to portfolio'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveDraftToPortfolio}
                disabled={isSavingDraft || draftStyle.saved}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#7c3aed] text-white text-xs font-black rounded-xl py-2.5 disabled:opacity-60"
              >
                {draftStyle.saved ? <CheckCircle2 size={14} /> : <BookmarkPlus size={14} />}
                {draftStyle.saved ? 'Saved to Portfolio' : isSavingDraft ? 'Saving...' : 'Save to Portfolio'}
              </button>
            </div>
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#7c3aed]" />
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide">Analyzing...</p>
              </div>
            </div>
          )}

          {!isOnline && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wide">
              <WifiOff size={14} />
              <span>No internet connection</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="p-5 bg-white border-t border-zinc-50 shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2 bg-zinc-100 rounded-[30px] border border-zinc-200">
            <button type="button" className="p-3 text-[#7c3aed]" onClick={handleCameraClick}>
              <Camera size={22} />
            </button>
            <button type="button" className="p-3 text-zinc-500" onClick={handleUploadClick}>
              <Upload size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelected}
            />
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent text-sm font-bold outline-none"
              disabled={isTyping}
            />
            <button
              type="submit"
              className="p-3 bg-[#7c3aed] text-white rounded-full disabled:opacity-50"
              disabled={isTyping || !chatInput.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </aside>

      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-6 w-16 h-16 bg-[#7c3aed] text-white rounded-full flex items-center justify-center shadow-2xl z-40 hover:scale-110 active:scale-95 transition-all animate-bounce-subtle"
        >
          <Sparkles size={30} fill="white" />
        </button>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-950 rounded-3xl border border-zinc-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-white">AI Camera</p>
              <button onClick={closeCameraModal} className="p-2 text-zinc-300 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-zinc-800">
              {cameraError ? (
                <div className="h-72 flex items-center justify-center p-4 text-center">
                  <p className="text-xs font-semibold text-red-300">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-72 object-cover"
                />
              )}
            </div>

            <canvas ref={cameraCanvasRef} className="hidden" />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={Boolean(cameraError) || isTyping}
                className="py-3 rounded-xl bg-[#7c3aed] text-white text-xs font-black disabled:opacity-50"
              >
                Capture & Analyze
              </button>
              <button
                type="button"
                onClick={handleUploadClick}
                className="py-3 rounded-xl bg-zinc-800 text-zinc-100 text-xs font-black"
              >
                Use Upload Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed top-4 right-4 z-[90]">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl text-xs font-black uppercase tracking-wide text-white ${
              toast.type === 'success'
                ? 'bg-emerald-500'
                : toast.type === 'error'
                  ? 'bg-red-500'
                  : toast.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-zinc-800'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
