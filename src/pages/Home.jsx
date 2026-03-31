
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Bell,
  Star,
  Loader2,
  Calendar,
  Users,
  Briefcase,
  X,
  Inbox,
  Sparkles,
  Filter,
  Heart,
  MessageCircle,
  Share2,
  Reply,
  Send,
} from 'lucide-react';
import { auth, db } from '../../firebaseconfig';
import {
  doc,
  getDoc,
  collection,
  query,
  getDocs,
  where,
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

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

function groupComments(comments) {
  const parentMap = new Map();
  const topLevel = [];

  comments.forEach((item) => {
    if (!item.parentId) {
      topLevel.push(item);
      return;
    }
    if (!parentMap.has(item.parentId)) parentMap.set(item.parentId, []);
    parentMap.get(item.parentId).push(item);
  });

  return { topLevel, parentMap };
}

export default function Home() {
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [topStylists, setTopStylists] = useState([]);
  const [sharedPortfolioStyles, setSharedPortfolioStyles] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ clients: 0, revenue: 0, rating: 0 });
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isNotifLoading, setIsNotifLoading] = useState(true);
  const notifPanelRef = useRef(null);

  const [postLikes, setPostLikes] = useState({});
  const [postCommentsCount, setPostCommentsCount] = useState({});
  const [userLikedPosts, setUserLikedPosts] = useState({});
  const engagementUnsubsRef = useRef([]);

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [isSendingComment, setIsSendingComment] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const toastTimerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchUrl, setSearchUrl] = useState('');

  const unreadCount = notifications.filter((item) => item.read !== true).length;
  const actorDisplayName =
    userData?.businessName ||
    userData?.fullName ||
    auth.currentUser?.displayName ||
    'Someone';

  const stylistLookup = useMemo(() => {
    const map = {};
    topStylists.forEach((stylist) => {
      map[stylist.id] = stylist;
    });
    return map;
  }, [topStylists]);

  const showToast = useCallback((message, type = 'info', duration = 2600) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, duration);
  }, []);

  const sendEngagementNotification = useCallback(
    async ({ recipientId, type, title, message, postId, styleName }) => {
      const actor = auth.currentUser;
      if (!actor || !recipientId || recipientId === actor.uid) return;

      try {
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          actorId: actor.uid,
          actorName: actorDisplayName,
          type,
          title,
          message,
          postId: postId || null,
          styleName: styleName || null,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    },
    [actorDisplayName]
  );

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(`${searchQuery} hairstyle`)}&form=HDRSC2`;
      setSearchUrl(url);
      setIsSearching(true);
    }
  };

  const markAllNotificationsRead = useCallback(async () => {
    const unreadItems = notifications.filter((item) => item.read !== true);
    if (unreadItems.length === 0) return;
    try {
      await Promise.all(
        unreadItems.map((item) => updateDoc(doc(db, 'notifications', item.id), { read: true }))
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [notifications]);

  const handleToggleLike = useCallback(
    async (post) => {
      const user = auth.currentUser;
      if (!user || !post?.id) {
        showToast('Please login first.', 'warning');
        return;
      }

      const likeRef = doc(db, 'styles', post.id, 'likes', user.uid);
      const postOwnerId = post.ownerId || post.stylistId || null;
      try {
        if (userLikedPosts[post.id]) {
          await deleteDoc(likeRef);
        } else {
          await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          await sendEngagementNotification({
            recipientId: postOwnerId,
            type: 'like',
            title: 'New like on your post',
            message: `${actorDisplayName} liked "${post.styleName || 'your style'}".`,
            postId: post.id,
            styleName: post.styleName || null,
          });
        }
      } catch (error) {
        console.error('Like toggle failed:', error);
        showToast('Could not update like right now.', 'error');
      }
    },
    [actorDisplayName, sendEngagementNotification, showToast, userLikedPosts]
  );

  const handleSharePost = useCallback(
    async (post) => {
      const shareText = `Check out this hairstyle: ${post?.styleName || 'Hair Style'}`;
      const shareUrl = `${window.location.origin}/portfolio`;

      try {
        if (navigator.share) {
          await navigator.share({ title: 'Hairly Portfolio Post', text: shareText, url: shareUrl });
          showToast('Post shared.', 'success');
          return;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          showToast('Share link copied.', 'success');
          return;
        }

        showToast('Sharing is not available on this device.', 'warning');
      } catch {
        showToast('Could not share right now.', 'error');
      }
    },
    [showToast]
  );

  const openComments = useCallback((post) => {
    setActivePostForComments(post);
    setComments([]);
    setCommentInput('');
    setReplyTarget(null);
    setIsCommentsOpen(true);
  }, []);

  const closeComments = useCallback(() => {
    setIsCommentsOpen(false);
    setActivePostForComments(null);
    setComments([]);
    setCommentInput('');
    setReplyTarget(null);
  }, []);

  const handleSubmitComment = useCallback(
    async (e) => {
      e.preventDefault();
      const text = commentInput.trim();
      const user = auth.currentUser;
      if (!text || !user || !activePostForComments?.id || isSendingComment) return;

      setIsSendingComment(true);
      try {
        const postOwnerId = activePostForComments.ownerId || activePostForComments.stylistId || null;
        const parentComment = replyTarget?.id
          ? comments.find((item) => item.id === replyTarget.id)
          : null;
        const isReply = Boolean(replyTarget?.id);

        await addDoc(collection(db, 'styles', activePostForComments.id, 'comments'), {
          userId: user.uid,
          userName: userData?.businessName || userData?.fullName || user.displayName || 'User',
          userImage: userData?.profileImage || user.photoURL || '',
          text,
          parentId: replyTarget?.id || null,
          createdAt: serverTimestamp(),
        });

        await sendEngagementNotification({
          recipientId: postOwnerId,
          type: isReply ? 'reply' : 'comment',
          title: isReply ? 'New reply on your post' : 'New comment on your post',
          message: isReply
            ? `${actorDisplayName} replied on "${activePostForComments.styleName || 'your post'}".`
            : `${actorDisplayName} commented on "${activePostForComments.styleName || 'your post'}".`,
          postId: activePostForComments.id,
          styleName: activePostForComments.styleName || null,
        });

        if (
          isReply &&
          parentComment?.userId &&
          parentComment.userId !== user.uid &&
          parentComment.userId !== postOwnerId
        ) {
          await sendEngagementNotification({
            recipientId: parentComment.userId,
            type: 'reply',
            title: 'New reply to your comment',
            message: `${actorDisplayName} replied: "${text.slice(0, 120)}"`,
            postId: activePostForComments.id,
            styleName: activePostForComments.styleName || null,
          });
        }

        setCommentInput('');
        setReplyTarget(null);
      } catch (error) {
        console.error('Comment failed:', error);
        showToast('Could not send comment right now.', 'error');
      } finally {
        setIsSendingComment(false);
      }
    },
    [
      activePostForComments,
      actorDisplayName,
      commentInput,
      comments,
      isSendingComment,
      replyTarget,
      sendEngagementNotification,
      showToast,
      userData,
    ]
  );

  useEffect(() => {
    let unsubscribeSharedStyles = () => {};
    let unsubscribeNotifications = () => {};
    let unsubscribeStylists = () => {};
    let unsubscribeFollowers = () => {};
    let unsubscribeFollowing = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeSharedStyles();
      unsubscribeNotifications();
      unsubscribeStylists();
      unsubscribeFollowers();
      unsubscribeFollowing();
      setCurrentUserId(user?.uid || null);

      if (!user) {
        setNotifications([]);
        setIsNotifLoading(false);
        setTopStylists([]);
        setSharedPortfolioStyles([]);
        setFollowStats({ followers: 0, following: 0 });
        navigate('/');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const profileData = userDoc.exists() ? userDoc.data() : null;
        if (profileData) setUserData(profileData);

        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, where('stylistId', '==', user.uid));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        const appointmentsData = appointmentsSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setUpcomingAppointments(appointmentsData);

        const totalRevenue = appointmentsData.reduce((sum, apt) => sum + (Number(apt.price) || 0), 0);
        const uniqueClients = new Set(appointmentsData.map((apt) => apt.clientEmail || apt.clientId)).size;

        setStats({
          clients: uniqueClients || 0,
          revenue: totalRevenue || 0,
          rating: profileData?.rating || 0,
        });

        const stylistsQuery = query(collection(db, 'users'), where('role', '==', 'stylist'));
        unsubscribeStylists = onSnapshot(
          stylistsQuery,
          (snapshot) => {
            const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
            setTopStylists(list.slice(0, 12));
          },
          (error) => {
            console.error('Stylists stream error:', error);
            setTopStylists([]);
          }
        );

        const sharedQuery = query(collection(db, 'styles'), where('sharedToHome', '==', true));
        unsubscribeSharedStyles = onSnapshot(
          sharedQuery,
          (snapshot) => {
            const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            list.sort(
              (a, b) =>
                (toMillis(b.sharedAt) || toMillis(b.createdAt)) -
                (toMillis(a.sharedAt) || toMillis(a.createdAt))
            );
            setSharedPortfolioStyles(list.slice(0, 24));
          },
          (error) => {
            console.error('Shared styles stream error:', error);
            setSharedPortfolioStyles([]);
          }
        );

        const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid));
        setIsNotifLoading(true);
        unsubscribeNotifications = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            list.sort(
              (a, b) =>
                (toMillis(b.createdAt) || toMillis(b.timestamp)) -
                (toMillis(a.createdAt) || toMillis(a.timestamp))
            );
            setNotifications(list);
            setIsNotifLoading(false);
          },
          (error) => {
            console.error('Notification stream error:', error);
            setNotifications([]);
            setIsNotifLoading(false);
          }
        );

        const followersQuery = query(collection(db, 'follows'), where('stylistId', '==', user.uid));
        unsubscribeFollowers = onSnapshot(
          followersQuery,
          (snapshot) => {
            setFollowStats((prev) => ({ ...prev, followers: snapshot.size }));
          },
          () => {
            setFollowStats((prev) => ({ ...prev, followers: 0 }));
          }
        );

        const followingQuery = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        unsubscribeFollowing = onSnapshot(
          followingQuery,
          (snapshot) => {
            setFollowStats((prev) => ({ ...prev, following: snapshot.size }));
          },
          () => {
            setFollowStats((prev) => ({ ...prev, following: 0 }));
          }
        );
      } catch (error) {
        console.error('Home load error:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSharedStyles();
      unsubscribeNotifications();
      unsubscribeStylists();
      unsubscribeFollowers();
      unsubscribeFollowing();
      unsubscribeAuth();
    };
  }, [navigate]);

  useEffect(() => {
    engagementUnsubsRef.current.forEach((fn) => fn());
    engagementUnsubsRef.current = [];

    if (sharedPortfolioStyles.length === 0) {
      setPostLikes({});
      setPostCommentsCount({});
      setUserLikedPosts({});
      return;
    }

    sharedPortfolioStyles.forEach((post) => {
      if (!post?.id) return;
      const likesCol = collection(db, 'styles', post.id, 'likes');
      const commentsCol = collection(db, 'styles', post.id, 'comments');

      const unsubLikes = onSnapshot(likesCol, (snapshot) => {
        setPostLikes((prev) => ({ ...prev, [post.id]: snapshot.size }));
        if (currentUserId) {
          setUserLikedPosts((prev) => ({
            ...prev,
            [post.id]: snapshot.docs.some((docSnap) => docSnap.id === currentUserId),
          }));
        }
      });

      const unsubComments = onSnapshot(commentsCol, (snapshot) => {
        setPostCommentsCount((prev) => ({ ...prev, [post.id]: snapshot.size }));
      });

      engagementUnsubsRef.current.push(unsubLikes, unsubComments);
    });

    return () => {
      engagementUnsubsRef.current.forEach((fn) => fn());
      engagementUnsubsRef.current = [];
    };
  }, [currentUserId, sharedPortfolioStyles]);

  useEffect(() => {
    if (!isNotifOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isNotifOpen]);

  useEffect(() => {
    if (!isCommentsOpen || !activePostForComments?.id) return undefined;

    const commentsQuery = query(collection(db, 'styles', activePostForComments.id, 'comments'));
    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
        setComments(list);
      },
      (error) => {
        console.error('Comments stream error:', error);
        setComments([]);
      }
    );

    return () => unsubscribe();
  }, [activePostForComments, isCommentsOpen]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const { topLevel: topComments, parentMap: repliesByParent } = useMemo(
    () => groupComments(comments),
    [comments]
  );

  const portfolioFeed = sharedPortfolioStyles.slice(0, 8);
  const inspirationFeed = sharedPortfolioStyles.slice(0, 12);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#7c3aed]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] w-full pb-24 font-sans relative overflow-x-hidden">
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSearching(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X size={20} />
                </button>
                <div>
                  <p className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-widest">Live Web Search</p>
                  <h2 className="font-bold text-zinc-800 line-clamp-1">{searchQuery}</h2>
                </div>
              </div>
            </div>
            <iframe src={searchUrl} className="flex-1 w-full border-none" title="Search Results" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#7c3aed] p-6 pt-12 pb-16 rounded-b-[40px] relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border-2 border-white/30 overflow-hidden bg-white/10 shadow-inner">
              <img
                src={
                  userData?.profileImage ||
                  `https://ui-avatars.com/api/?name=${userData?.fullName || 'User'}&background=fff&color=7c3aed`
                }
                className="w-full h-full object-cover"
                alt="profile"
              />
            </div>
            <div className="text-white">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Welcome back,</p>
              <h1 className="font-bold text-xl leading-tight">{userData?.businessName || userData?.fullName || 'Stylist Hub'}</h1>
            </div>
          </div>

          <div className="flex gap-2 relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-3 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/15 transition-colors"
            >
              <Bell className="text-white" size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full border border-[#7c3aed] flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  ref={notifPanelRef}
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="absolute right-0 top-14 w-[min(24rem,calc(100vw-2rem))] rounded-3xl bg-white text-zinc-900 shadow-2xl border border-zinc-100 p-4 z-30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Activity</p>
                      <h3 className="font-black text-sm">Notifications</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/notifications')}
                      className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] hover:text-[#6d28d9]"
                    >
                      View all
                    </button>
                  </div>

                  {isNotifLoading ? (
                    <div className="py-8 text-center text-xs font-bold text-zinc-400">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="mx-auto text-zinc-300 mb-3" size={22} />
                      <p className="text-sm font-bold text-zinc-500">No notifications yet.</p>
                      <p className="text-[11px] text-zinc-400 mt-1">You will see real updates here automatically.</p>
                    </div>
                  ) : (
                    <>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#7c3aed] hover:text-[#6d28d9]"
                        >
                          Mark all as read
                        </button>
                      )}
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {notifications.slice(0, 8).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate('/notifications')}
                            className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                              item.read === true ? 'bg-zinc-50 border-zinc-100' : 'bg-violet-50 border-violet-200'
                            }`}
                          >
                            <p className="font-black text-xs text-zinc-800 line-clamp-1">{item.title || 'Notification'}</p>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                              {item.message || 'You have a new account update.'}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-2 uppercase font-bold tracking-wider">
                              {formatRelativeTime(item.createdAt || item.timestamp)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-8 relative z-10">
          {[
            { label: 'Clients', val: stats.clients, icon: <Users size={16} /> },
            { label: 'Rating', val: stats.rating || '0.0', icon: <Star size={16} /> },
            { label: 'Revenue', val: `NGN ${(stats.revenue / 1000).toFixed(1)}k`, icon: <Briefcase size={16} /> },
            { label: 'Followers', val: followStats.followers || 0, icon: <Users size={16} /> },
            { label: 'Following', val: followStats.following || 0, icon: <Users size={16} /> },
          ].map((stat, i) => (
            <div key={i} className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl p-3 text-center text-white border border-white/5">
              <p className="font-black text-lg">{stat.val}</p>
              <p className="text-[8px] uppercase font-bold tracking-widest opacity-60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-[-28px] relative z-20">
        <div className="shadow-2xl rounded-3xl overflow-hidden mb-8">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search hairstyle trends..."
              className="w-full bg-white p-6 pl-14 text-sm font-medium outline-none border-none"
            />
          </div>
        </div>

        <div className="mb-10">
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-black text-zinc-800 text-lg italic tracking-tighter">Top Stylists</h2>
            <button type="button" onClick={() => navigate('/explore')} className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-widest">
              See All
            </button>
          </div>

          {topStylists.length === 0 ? (
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[28px] p-6 text-center">
              <p className="text-zinc-400 font-bold text-sm">No stylists found in the app yet.</p>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
              {topStylists.map((stylist) => (
                <button key={stylist.id} type="button" onClick={() => navigate(`/explore/${stylist.id}`)} className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full border-2 border-[#7c3aed] p-0.5">
                    <img
                      src={stylist.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(stylist.businessName || stylist.fullName || 'Stylist')}&background=f4f4f5&color=7c3aed`}
                      className="w-full h-full rounded-full object-cover"
                      alt={stylist.businessName || stylist.fullName || 'Stylist'}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 max-w-16 truncate">{stylist.businessName || stylist.fullName || 'Stylist'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-zinc-800 text-2xl italic tracking-tighter">Portfolio Feed</h2>
                <Filter size={20} className="text-zinc-400" />
              </div>

              {portfolioFeed.length === 0 ? (
                <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[32px] p-10 text-center">
                  <p className="text-zinc-400 font-bold text-sm">No shared portfolio posts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {portfolioFeed.map((style) => {
                    const ownerId = style.ownerId || style.stylistId;
                    const owner = stylistLookup[ownerId];
                    return (
                      <motion.button key={style.id} type="button" whileHover={{ y: -5 }} onClick={() => openComments(style)} className="aspect-[3/4] rounded-[32px] overflow-hidden relative shadow-sm group text-left">
                        <img src={style.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={style.styleName || 'Style'} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-5 flex flex-col justify-end">
                          <p className="text-white font-black text-sm line-clamp-1">{style.styleName || 'Shared Style'}</p>
                          <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest line-clamp-1">
                            {owner?.businessName || owner?.fullName || style.ownerName || 'Hairly Stylist'}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-zinc-800 text-2xl italic tracking-tighter">Web Inspiration</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">From app portfolio posts</span>
              </div>

              {inspirationFeed.length === 0 ? (
                <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[32px] p-10 text-center">
                  <p className="text-zinc-400 font-bold text-sm">No inspiration posts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inspirationFeed.map((post) => {
                    const likes = postLikes[post.id] || 0;
                    const commentsCount = postCommentsCount[post.id] || 0;
                    const isLiked = userLikedPosts[post.id] === true;
                    const ownerId = post.ownerId || post.stylistId;
                    const owner = stylistLookup[ownerId];

                    return (
                      <article key={post.id} className="bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-sm">
                        <div className="aspect-[4/5] relative overflow-hidden">
                          <img src={post.image} className="w-full h-full object-cover" alt={post.styleName || 'Style'} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="text-white font-black text-sm line-clamp-1">{post.styleName || 'Shared Style'}</p>
                            <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest line-clamp-1">
                              {owner?.businessName || owner?.fullName || post.ownerName || 'Hairly Stylist'}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black ${
                              isLiked ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            <Heart size={14} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                            {likes}
                          </button>

                          <button
                            type="button"
                            onClick={() => openComments(post)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black bg-zinc-100 text-zinc-600"
                          >
                            <MessageCircle size={14} />
                            {commentsCount}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSharePost(post)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-black bg-zinc-100 text-zinc-600"
                          >
                            <Share2 size={14} />
                            Share
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-[#1a0f2e] rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl shadow-purple-200">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#7c3aed] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                  <Sparkles className="text-white" size={24} />
                </div>
                <h3 className="font-black text-2xl mb-2 leading-tight">AI Style Studio</h3>
                <p className="text-white/50 text-xs font-medium mb-8 leading-relaxed">
                  Visualize any hairstyle on your own face using our proprietary AI engine.
                </p>
                <button onClick={() => navigate('/studio')} className="w-full py-4 bg-[#7c3aed] rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-[#6d28d9] transition-all active:scale-95">
                  Enter Studio
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#7c3aed] blur-[80px] opacity-30" />
            </div>

            <div>
              <h2 className="font-black text-zinc-800 text-xl mb-6">Upcoming Jobs</h2>
              <div className="space-y-3">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="bg-white p-4 rounded-[28px] border border-zinc-100 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(apt.clientName || 'Client')}&background=f4f4f5&color=7c3aed`} alt="client" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-zinc-800 text-sm">{apt.clientName}</h4>
                        <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                          <Calendar size={10} /> {apt.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-[32px] p-10 text-center">
                    <Inbox className="text-zinc-200 mx-auto mb-2" size={32} />
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">No jobs today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCommentsOpen && activePostForComments && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/50 p-4 flex items-end md:items-center justify-center">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-2xl bg-white rounded-3xl border border-zinc-100 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-zinc-400">Comments</p>
                  <h3 className="font-black text-sm text-zinc-800 line-clamp-1">{activePostForComments.styleName || 'Shared Style'}</h3>
                </div>
                <button type="button" onClick={closeComments} className="p-2 rounded-full hover:bg-zinc-100">
                  <X size={18} className="text-zinc-500" />
                </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4 bg-zinc-50">
                {topComments.length === 0 ? (
                  <div className="text-center py-10 text-zinc-400 font-bold text-sm">No comments yet. Start the conversation.</div>
                ) : (
                  topComments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="bg-white rounded-2xl border border-zinc-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black text-zinc-800">{comment.userName || 'User'}</p>
                          <p className="text-[10px] font-bold text-zinc-400">{formatRelativeTime(comment.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-sm text-zinc-700 break-words">{comment.text}</p>
                        <button
                          type="button"
                          onClick={() => setReplyTarget({ id: comment.id, name: comment.userName || 'User' })}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#7c3aed]"
                        >
                          <Reply size={12} /> Reply
                        </button>
                      </div>

                      {(repliesByParent.get(comment.id) || []).map((reply) => (
                        <div key={reply.id} className="ml-6 bg-white rounded-2xl border border-zinc-100 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-black text-zinc-800">{reply.userName || 'User'}</p>
                            <p className="text-[10px] font-bold text-zinc-400">{formatRelativeTime(reply.createdAt)}</p>
                          </div>
                          <p className="mt-1 text-sm text-zinc-700 break-words">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmitComment} className="p-4 border-t border-zinc-100 bg-white">
                {replyTarget && (
                  <div className="mb-2 flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2">
                    <p className="text-[11px] font-bold text-violet-700">Replying to {replyTarget.name}</p>
                    <button type="button" onClick={() => setReplyTarget(null)} className="text-[10px] uppercase font-black tracking-widest text-violet-700">
                      Cancel
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={replyTarget ? `Reply to ${replyTarget.name}...` : 'Write a comment...'}
                    className="flex-1 bg-transparent text-sm font-medium outline-none"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={isSendingComment || !commentInput.trim()}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-2 bg-[#7c3aed] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-60"
                  >
                    <Send size={12} />
                    {isSendingComment ? 'Sending' : 'Send'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {toast.show && (
        <div className="fixed top-4 right-4 z-[140]">
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
