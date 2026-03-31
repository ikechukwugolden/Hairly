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
  CalendarPlus,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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

function toDateKey(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAppointmentDateKey(appointment) {
  if (!appointment) return '';
  if (typeof appointment.date === 'string' && appointment.date) return appointment.date;
  return (
    toDateKey(appointment.appointmentDate) ||
    toDateKey(appointment.scheduledAt) ||
    toDateKey(appointment.dateTime) ||
    ''
  );
}

function isActiveBookingStatus(status) {
  const normalized = String(status || '').toLowerCase();
  return normalized !== 'declined' && normalized !== 'cancelled' && normalized !== 'canceled';
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
  const [reviews, setReviews] = useState([]);
  const [ratingInput, setRatingInput] = useState(0);
  const [reviewInput, setReviewInput] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    service: '',
    date: '',
    time: '',
    location: '',
    note: '',
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isSendingChat, setIsSendingChat] = useState(false);

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
  const isStylistActive = stylist?.isActive === true;
  const stylistDailyLimit = Math.max(1, Number(stylist?.bookingLimitPerDay) || 10);
  const isStylistAcceptingBookings = stylist?.acceptingBookings !== false;

  const viewerLiked = useMemo(
    () => Boolean(viewer?.uid && likes.some((like) => like.id === viewer.uid)),
    [likes, viewer]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return Number(stylist?.rating || 0);
    const sum = reviews.reduce((total, item) => total + (Number(item.rating) || 0), 0);
    return sum / reviews.length;
  }, [reviews, stylist]);

  const chatId = useMemo(() => {
    if (!viewer?.uid || !stylistId) return null;
    return [viewer.uid, stylistId].sort().join('_');
  }, [viewer?.uid, stylistId]);

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
    if (!stylistId) return undefined;

    const reviewsQuery = query(collection(db, 'reviews'), where('stylistId', '==', stylistId));
    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setReviews(list);
      },
      () => {
        setReviews([]);
      }
    );

    return () => unsubscribe();
  }, [stylistId]);

  useEffect(() => {
    if (!chatId) {
      setChatMessages([]);
      return undefined;
    }

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setChatMessages(list);
      },
      () => {
        setChatMessages([]);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

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

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!viewer || !stylistId || viewer.uid === stylistId || isSubmittingRating) return;
    if (ratingInput < 1 || ratingInput > 5) {
      showToast('Please choose a star rating.', 'warning');
      return;
    }

    setIsSubmittingRating(true);
    try {
      await setDoc(doc(db, 'reviews', `${stylistId}_${viewer.uid}`), {
        stylistId,
        reviewerId: viewer.uid,
        reviewerName: viewerName,
        reviewerImage: viewerProfile?.profileImage || viewer.photoURL || '',
        rating: Number(ratingInput),
        comment: reviewInput.trim(),
        createdAt: serverTimestamp(),
      });

      try {
        await sendNotification({
          type: 'rating',
          title: 'New rating received',
          message: `${viewerName} rated you ${ratingInput}/5${reviewInput.trim() ? ` - ${reviewInput.trim().slice(0, 90)}` : ''}.`,
        });
      } catch (notifyError) {
        console.error('Rating notification failed:', notifyError);
      }

      showToast('Rating submitted successfully.', 'success');
      setReviewInput('');
    } catch (error) {
      console.error('Rating failed:', error);
      const raw = String(error?.code || error?.message || '').toLowerCase();
      showToast(
        /permission-denied/.test(raw)
          ? 'Rating blocked by Firestore rules. Please update/deploy rules.'
          : 'Could not submit rating right now.',
        'error'
      );
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!viewer || !stylistId || isSubmittingBooking) return;
    if (!bookingForm.service.trim() || !bookingForm.date) {
      showToast('Service and date are required to book.', 'warning');
      return;
    }
    if (!isStylistAcceptingBookings) {
      showToast('This stylist is not accepting bookings right now.', 'warning');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const existingAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('stylistId', '==', stylistId)
      );
      const existingAppointmentsSnapshot = await getDocs(existingAppointmentsQuery);
      const existingBookingsForDate = existingAppointmentsSnapshot.docs.reduce((total, docSnap) => {
        const data = docSnap.data();
        if (!isActiveBookingStatus(data?.status)) return total;
        const existingDateKey = getAppointmentDateKey(data);
        return existingDateKey === bookingForm.date ? total + 1 : total;
      }, 0);

      if (existingBookingsForDate >= stylistDailyLimit) {
        showToast(
          `${stylistName} is fully booked on ${bookingForm.date}. Please choose another date.`,
          'warning'
        );
        return;
      }

      const isoDateTime = bookingForm.time
        ? new Date(`${bookingForm.date}T${bookingForm.time}`).toISOString()
        : new Date(`${bookingForm.date}T09:00`).toISOString();

      await addDoc(collection(db, 'appointments'), {
        stylistId,
        customerId: viewer.uid,
        customerName: viewerName,
        customerEmail: viewer.email || '',
        clientName: viewerName,
        service: bookingForm.service.trim(),
        date: bookingForm.date,
        time: bookingForm.time || '09:00',
        appointmentDate: isoDateTime,
        location: bookingForm.location.trim() || stylist?.address || stylist?.location || '',
        note: bookingForm.note.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      try {
        await sendNotification({
          type: 'booking_request',
          title: 'New booking request',
          message: `${viewerName} requested "${bookingForm.service.trim()}" on ${bookingForm.date}.`,
        });
      } catch (notifyError) {
        console.error('Booking notification failed:', notifyError);
      }

      showToast('Booking request sent. Waiting for stylist confirmation.', 'success');
      setIsBookingOpen(false);
      setBookingForm({
        service: '',
        date: '',
        time: '',
        location: '',
        note: '',
      });
    } catch (error) {
      console.error('Booking request failed:', error);
      const raw = String(error?.code || error?.message || '').toLowerCase();
      showToast(
        /permission-denied/.test(raw)
          ? 'Booking blocked by Firestore rules. Please update/deploy rules.'
          : 'Could not send booking request right now.',
        'error'
      );
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !viewer || !chatId || isSendingChat) return;

    setIsSendingChat(true);
    try {
      await setDoc(
        doc(db, 'chats', chatId),
        {
          members: [viewer.uid, stylistId],
          updatedAt: serverTimestamp(),
          lastMessage: text.slice(0, 180),
          lastMessageAt: serverTimestamp(),
        },
        { merge: true }
      );

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: viewer.uid,
        senderName: viewerName,
        text,
        createdAt: serverTimestamp(),
      });

      await sendNotification({
        type: 'chat',
        title: 'New chat message',
        message: `${viewerName}: ${text.slice(0, 100)}`,
      });

      setChatInput('');
    } catch (error) {
      console.error('Chat message failed:', error);
      showToast('Could not send message right now.', 'error');
    } finally {
      setIsSendingChat(false);
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
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white overflow-hidden bg-zinc-100 shadow-lg">
                      <img
                        src={
                          stylist.profileImage ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(stylistName)}&background=f4f4f5&color=7c3aed`
                        }
                        alt={stylistName}
                        className="w-full h-full object-cover"
                      />
                      <span className={`absolute bottom-1 right-1 block w-3 h-3 rounded-full border-2 border-white ${isStylistActive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    </div>
                    <div className="pb-1">
                      <h2 className="text-xl sm:text-2xl font-black leading-tight">{stylistName}</h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">
                        {stylist.serviceType || 'Professional Stylist'}
                      </p>
                      <p className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isStylistActive ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {isStylistActive ? 'Active now' : 'Offline'}
                      </p>
                    </div>
                  </div>

	                  <div className="flex gap-2 sm:pb-1">
                    <button
                      type="button"
                      onClick={() => setIsBookingOpen(true)}
                      disabled={!viewer || viewer?.uid === stylistId || !isStylistAcceptingBookings}
                      className="h-11 px-4 rounded-xl text-sm font-black inline-flex items-center gap-2 bg-emerald-500 text-white disabled:opacity-60"
                    >
                      <CalendarPlus size={16} /> {isStylistAcceptingBookings ? 'Book' : 'Unavailable'}
                    </button>
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
	                    <p className="text-lg font-black text-zinc-900">{averageRating.toFixed(1)}</p>
	                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rating</p>
	                  </div>
	                </div>
	              </div>
	            </section>

            <section className="bg-white rounded-3xl border border-zinc-100 p-5 sm:p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Rate Stylist</h3>

              {viewer?.uid === stylistId ? (
                <p className="text-sm font-semibold text-zinc-500">You cannot rate your own profile.</p>
              ) : (
                <form onSubmit={handleSubmitRating} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        className="p-1 rounded-full"
                      >
                        <Star
                          size={20}
                          className={star <= ratingInput ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-zinc-500 ml-1">
                      {ratingInput > 0 ? `${ratingInput}/5` : 'Select rating'}
                    </span>
                  </div>

                  <textarea
                    value={reviewInput}
                    onChange={(e) => setReviewInput(e.target.value)}
                    placeholder="Write a short review (optional)..."
                    maxLength={500}
                    className="w-full p-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold outline-none"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingRating || ratingInput === 0}
                    className="h-11 px-5 rounded-xl bg-[#7c3aed] text-white text-sm font-black disabled:opacity-60"
                  >
                    {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Recent Reviews</p>
                  <p className="text-xs font-bold text-zinc-500">{reviews.length} total</p>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-sm font-semibold text-zinc-400">No ratings yet.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {reviews.slice(0, 6).map((review) => (
                      <div key={review.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-zinc-700">{review.reviewerName || 'Client'}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={`${review.id}-${index}`}
                                size={12}
                                className={index < Number(review.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment ? (
                          <p className="text-sm text-zinc-600 font-medium mt-1 break-words">{review.comment}</p>
                        ) : (
                          <p className="text-sm text-zinc-400 font-medium mt-1">No written comment.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Daily Booking Limit</p>
                  <p className="mt-1 text-sm font-bold text-zinc-700">{stylistDailyLimit} bookings/day</p>
                </div>
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Availability</p>
                  <p className={`mt-1 text-sm font-bold ${isStylistAcceptingBookings ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isStylistAcceptingBookings ? 'Accepting bookings' : 'Not accepting bookings'}
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
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">In-App Chat</h3>

              {!viewer ? (
                <p className="text-sm font-semibold text-zinc-500">Login to chat with this stylist.</p>
              ) : (
                <>
                  <div className="max-h-56 overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50 p-3 space-y-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-sm text-zinc-400 font-semibold">No messages yet. Say hello.</p>
                    ) : (
                      chatMessages.slice(-80).map((msg) => {
                        const mine = msg.senderId === viewer.uid;
                        return (
                          <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-[#7c3aed] text-white' : 'bg-white border border-zinc-100 text-zinc-700'}`}>
                              <p className="text-[11px] font-bold break-words">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message ${stylistName}...`}
                      className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingChat || !chatInput.trim()}
                      className="h-12 w-12 rounded-xl bg-[#7c3aed] text-white inline-flex items-center justify-center disabled:opacity-60"
                    >
                      {isSendingChat ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
                    </button>
                  </form>
                </>
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

      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-zinc-100 shadow-2xl">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Book Stylist</p>
                <h3 className="font-black text-sm text-zinc-800">{stylistName}</h3>
                <p className="text-[10px] font-bold text-zinc-500 mt-1">
                  {isStylistAcceptingBookings
                    ? `${stylistDailyLimit} bookings allowed per day`
                    : 'This stylist is not accepting bookings right now'}
                </p>
              </div>
              <button type="button" onClick={() => setIsBookingOpen(false)} className="p-2 rounded-full hover:bg-zinc-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-4 space-y-3">
              <input
                value={bookingForm.service}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, service: e.target.value }))}
                placeholder="Service (e.g. Knotless Braids)"
                className="w-full bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                  required
                />
                <input
                  type="time"
                  value={bookingForm.time}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
                />
              </div>
              <input
                value={bookingForm.location}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Preferred location (optional)"
                className="w-full bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none"
              />
              <textarea
                value={bookingForm.note}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Additional note (optional)"
                maxLength={500}
                className="w-full bg-zinc-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none h-24"
              />
              <button
                type="submit"
                disabled={isSubmittingBooking || !isStylistAcceptingBookings}
                className="w-full h-11 rounded-xl bg-emerald-500 text-white text-sm font-black disabled:opacity-60"
              >
                {isSubmittingBooking ? 'Sending Request...' : 'Send Booking Request'}
              </button>
            </form>
          </div>
        </div>
      )}

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
