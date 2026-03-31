import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  Loader2,
  MessageCircle,
  SendHorizontal,
  User,
  X,
  MapPin,
  Star,
  Briefcase,
  Clock3,
  Phone,
  UserPlus,
  Check,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../firebaseconfig';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function formatRelativeTime(value) {
  const ms = toMillis(value);
  if (!ms) return 'Just now';
  const delta = Date.now() - ms;
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function normalizePhone(phone) {
  const value = String(phone || '').replace(/[^\d+]/g, '');
  if (!value) return '';
  if (value.startsWith('+')) return value.slice(1);
  if (value.startsWith('0')) return `234${value.slice(1)}`;
  return value;
}

function toSpecialties(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 8);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  return [];
}

export default function ClientDetail() {
  const { id: stylistId } = useParams();
  const navigate = useNavigate();

  const [viewer, setViewer] = useState(null);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [stylist, setStylist] = useState(null);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState(null);
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const toastTimerRef = useRef(null);

  const ownerStylesRef = useRef([]);
  const legacyStylesRef = useRef([]);

  const viewerName =
    viewerProfile?.businessName ||
    viewerProfile?.fullName ||
    viewer?.displayName ||
    'Client';

  const stylistName =
    stylist?.businessName ||
    stylist?.fullName ||
    'Stylist';

  const specialties = useMemo(() => toSpecialties(stylist?.specialties), [stylist]);

  const viewerLiked = useMemo(
    () => Boolean(viewer?.uid && likes.some((like) => like.id === viewer.uid)),
    [likes, viewer]
  );

  const showToast = (message, type = 'info', duration = 2600) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, duration);
  };

  const mergeStyles = () => {
    const map = new Map();

    [...ownerStylesRef.current, ...legacyStylesRef.current]
      .filter((item) => item.sharedToHome)
      .forEach((item) => {
        map.set(item.id, item);
      });

    const merged = Array.from(map.values());
    merged.sort((a, b) => (toMillis(b.sharedAt) || toMillis(b.createdAt)) - (toMillis(a.sharedAt) || toMillis(a.createdAt)));
    setStyles(merged);
  };

  const sendNotification = async ({ type, title, message, postId = null }) => {
    const actor = auth.currentUser;
    if (!actor || !stylistId || actor.uid === stylistId) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: stylistId,
        actorId: actor.uid,
        actorName: viewerName,
        type,
        title,
        message,
        postId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Notification create failed:', error);
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setViewer(user || null);
      if (!user) {
        setViewerProfile(null);
        return;
      }

      try {
        const viewerDoc = await getDoc(doc(db, 'users', user.uid));
        setViewerProfile(viewerDoc.exists() ? viewerDoc.data() : null);
      } catch {
        setViewerProfile(null);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!stylistId) return undefined;
    let active = true;

    async function loadStylist() {
      try {
        const snap = await getDoc(doc(db, 'users', stylistId));
        if (!active) return;
        if (snap.exists()) {
          setStylist({ id: snap.id, ...snap.data() });
        } else {
          setStylist(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStylist();

    const ownerQuery = query(collection(db, 'styles'), where('ownerId', '==', stylistId));
    const legacyQuery = query(collection(db, 'styles'), where('stylistId', '==', stylistId));

    const unsubOwner = onSnapshot(ownerQuery, (snapshot) => {
      ownerStylesRef.current = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      mergeStyles();
    });

    const unsubLegacy = onSnapshot(legacyQuery, (snapshot) => {
      legacyStylesRef.current = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      mergeStyles();
    });

    return () => {
      active = false;
      unsubOwner();
      unsubLegacy();
    };
  }, [stylistId]);

  useEffect(() => {
    if (!stylistId) return undefined;

    const followersQuery = query(collection(db, 'follows'), where('stylistId', '==', stylistId));
    const unsubFollowers = onSnapshot(followersQuery, (snapshot) => {
      setFollowersCount(snapshot.size);
    });

    let unsubMyFollow = () => {};
    if (viewer?.uid) {
      const myFollowQuery = query(
        collection(db, 'follows'),
        where('stylistId', '==', stylistId),
        where('followerId', '==', viewer.uid)
      );
      unsubMyFollow = onSnapshot(myFollowQuery, (snap) => {
        const first = snap.docs[0];
        setIsFollowing(!snap.empty);
        setFollowDocId(first?.id || null);
      });
    } else {
      setIsFollowing(false);
      setFollowDocId(null);
    }

    return () => {
      unsubFollowers();
      unsubMyFollow();
    };
  }, [stylistId, viewer?.uid]);

  useEffect(() => {
    if (!selectedStyle?.id) {
      setLikes([]);
      setComments([]);
      return undefined;
    }

    const likesRef = collection(db, 'styles', selectedStyle.id, 'likes');
    const commentsRef = query(
      collection(db, 'styles', selectedStyle.id, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsubLikes = onSnapshot(likesRef, (snapshot) => {
      setLikes(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    const unsubComments = onSnapshot(commentsRef, (snapshot) => {
      setComments(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [selectedStyle]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleToggleFollow = async () => {
    if (!viewer || !stylistId || isTogglingFollow) return;
    if (viewer.uid === stylistId) {
      showToast('You cannot follow your own account.', 'warning');
      return;
    }

    setIsTogglingFollow(true);
    const deterministicId = `${stylistId}_${viewer.uid}`;
    const followRef = doc(db, 'follows', deterministicId);

    try {
      if (isFollowing) {
        if (followDocId) {
          await deleteDoc(doc(db, 'follows', followDocId));
        } else {
          await deleteDoc(followRef);
        }
        setIsFollowing(false);
        setFollowDocId(null);
        showToast(`You unfollowed ${stylistName}.`, 'info');
      } else {
        await setDoc(followRef, {
          followerId: viewer.uid,
          followerName: viewerName,
          followerImage: viewerProfile?.profileImage || viewer.photoURL || '',
          stylistId,
          createdAt: serverTimestamp(),
        });
        setIsFollowing(true);
        setFollowDocId(deterministicId);
        await sendNotification({
          type: 'follow',
          title: 'New follower',
          message: `${viewerName} started following you.`,
        });
        showToast(`You are now following ${stylistName}.`, 'success');
      }
    } catch (error) {
      console.error('Follow toggle failed:', error);
      const raw = String(error?.code || error?.message || '').toLowerCase();
      const detail = /permission-denied/.test(raw)
        ? 'Permission denied. Please deploy latest Firestore rules.'
        : /unavailable|offline|network/.test(raw)
          ? 'Network issue. Check your internet and try again.'
          : 'Could not update follow right now.';
      showToast(detail, 'error');
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleToggleLike = async () => {
    if (!viewer || !selectedStyle?.id || isTogglingLike) return;
    setIsTogglingLike(true);
    const likeRef = doc(db, 'styles', selectedStyle.id, 'likes', viewer.uid);

    try {
      if (viewerLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          userId: viewer.uid,
          userName: viewerName,
          createdAt: serverTimestamp(),
        });
        await sendNotification({
          type: 'like',
          title: 'New like on your style',
          message: `${viewerName} liked "${selectedStyle.styleName || 'your style'}".`,
          postId: selectedStyle.id,
        });
      }
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!viewer || !selectedStyle?.id || isSendingComment) return;
    const text = commentInput.trim();
    if (!text) return;

    setIsSendingComment(true);
    try {
      await addDoc(collection(db, 'styles', selectedStyle.id, 'comments'), {
        userId: viewer.uid,
        userName: viewerName,
        userImage: viewerProfile?.profileImage || viewer.photoURL || '',
        text,
        createdAt: serverTimestamp(),
      });
      await sendNotification({
        type: 'comment',
        title: 'New comment on your style',
        message: `${viewerName}: ${text.slice(0, 120)}`,
        postId: selectedStyle.id,
      });
      setCommentInput('');
    } finally {
      setIsSendingComment(false);
    }
  };

  const whatsappNumber = normalizePhone(stylist?.phoneNumber);
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

  return (
    <div className="min-h-screen bg-[#f8f8fc] text-zinc-900 pb-24">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-100 px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-zinc-100">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">Stylist Profile</p>
          <h1 className="font-black truncate">{stylistName}</h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 space-y-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-[#7c3aed]" />
          </div>
        ) : !stylist ? (
          <div className="py-16 text-center text-zinc-500">
            <p className="font-bold">Stylist not found</p>
            <p className="text-sm mt-1">This profile may have been removed.</p>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
              <div className="h-28 sm:h-36 bg-gradient-to-r from-[#7c3aed] to-violet-500" />
              <div className="p-5 sm:p-6 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
                  <div className="flex items-end gap-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white overflow-hidden bg-zinc-100 shadow-lg">
                      <img
                        src={
                          stylist.profileImage ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(stylistName)}&background=f4f4f5&color=7c3aed`
                        }
                        alt={stylistName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="pb-1">
                      <h2 className="text-xl sm:text-2xl font-black leading-tight">{stylistName}</h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">
                        {stylist.serviceType || 'Professional Stylist'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:pb-1">
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={!viewer || isTogglingFollow || viewer?.uid === stylistId}
                      className={`h-11 px-4 rounded-xl text-sm font-black inline-flex items-center gap-2 disabled:opacity-60 ${
                        isFollowing ? 'bg-violet-100 text-violet-700' : 'bg-[#7c3aed] text-white'
                      }`}
                    >
                      {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
                      {isTogglingFollow ? 'Please wait...' : isFollowing ? 'Following' : 'Follow'}
                    </button>

                    <a
                      href={whatsappLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        if (!whatsappLink) {
                          e.preventDefault();
                          showToast('No phone number available yet.', 'warning');
                        }
                      }}
                      className="h-11 px-4 rounded-xl text-sm font-black inline-flex items-center gap-2 bg-zinc-100 text-zinc-700"
                    >
                      <MessageCircle size={16} /> Message
                    </a>
                  </div>
                </div>

                <p className="mt-4 text-sm text-zinc-700 font-medium leading-relaxed">
                  {stylist.bio || 'No bio added yet.'}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-center">
                    <p className="text-lg font-black text-zinc-900">{styles.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Posts</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-center">
                    <p className="text-lg font-black text-zinc-900">{followersCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Followers</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-center">
                    <p className="text-lg font-black text-zinc-900">{Number(stylist.rating || 0).toFixed(1)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rating</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">About</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Location</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <MapPin size={14} /> {stylist.location || stylist.address || 'Not provided'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Contact</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <Phone size={14} /> {stylist.phoneNumber || 'Not provided'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Services</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <Briefcase size={14} /> {stylist.serviceType || 'Not specified'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Working Hours</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700 flex items-center gap-2">
                    <Clock3 size={14} /> {stylist.workingHours || 'Not set'}
                  </p>
                </div>
              </div>

              {specialties.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((item) => (
                      <span key={item} className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-black">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Portfolio</h3>

              {styles.length === 0 ? (
                <div className="py-14 text-center text-zinc-500">
                  <p className="font-bold">No shared styles yet</p>
                  <p className="text-sm mt-1">This stylist has not shared portfolio images yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 text-left"
                    >
                      <img
                        src={style.image}
                        alt={style.styleName || 'Style'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[11px] font-black text-white truncate">{style.styleName || 'Style'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {selectedStyle && (
        <div className="fixed inset-0 z-50 bg-black/70 p-3 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden grid md:grid-cols-2 max-h-[95vh]">
            <div className="bg-black flex items-center justify-center">
              <img
                src={selectedStyle.image}
                alt={selectedStyle.styleName || 'Style'}
                className="w-full h-full object-contain max-h-[55vh] md:max-h-[95vh]"
              />
            </div>

            <div className="flex flex-col min-h-0">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-black">Client View</p>
                  <p className="font-black">{selectedStyle.styleName || 'Style'}</p>
                  <p className="text-[10px] text-zinc-400 font-bold mt-1">{formatRelativeTime(selectedStyle.sharedAt || selectedStyle.createdAt)}</p>
                </div>
                <button onClick={() => setSelectedStyle(null)} className="p-2 rounded-full hover:bg-zinc-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-zinc-100 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={!viewer || isTogglingLike}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black ${viewerLiked ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-700'} disabled:opacity-60`}
                >
                  <Heart size={16} className={viewerLiked ? 'fill-rose-500 text-rose-500' : ''} />
                  {viewerLiked ? 'Liked' : 'Like'} ({likes.length})
                </button>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500">
                  <MessageCircle size={16} />
                  {comments.length} comments
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-zinc-400 font-semibold">No comments yet. Start the conversation.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 overflow-hidden flex items-center justify-center">
                        {comment.userImage ? (
                          <img src={comment.userImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 bg-zinc-50 rounded-2xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black text-zinc-500">{comment.userName || 'Client'}</p>
                          <p className="text-[10px] font-bold text-zinc-400">{formatRelativeTime(comment.createdAt)}</p>
                        </div>
                        <p className="text-sm font-semibold text-zinc-800 break-words">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendComment} className="p-4 border-t border-zinc-100 flex gap-2">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={viewer ? 'Write a comment...' : 'Login to comment'}
                  disabled={!viewer || isSendingComment}
                  className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!viewer || isSendingComment || !commentInput.trim()}
                  className="h-12 w-12 rounded-xl bg-[#7c3aed] text-white inline-flex items-center justify-center disabled:opacity-60"
                >
                  {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                </button>
              </form>
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
    </div>
  );
}
