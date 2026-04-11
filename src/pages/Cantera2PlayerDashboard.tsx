import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip
} from 'recharts';
import { 
  Home, LayoutDashboard, Plus, Globe, User, Heart, MessageCircle, Share2, 
  Camera, Video, X, ShieldCheck, MapPin, Calendar, Activity, Award, 
  ChevronRight, TrendingUp, FileText, Edit3, Trophy, CheckCircle2, Play, Image as ImageIcon, Shield, Settings, Briefcase, Map, Filter as FilterIcon, Clock, Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../core/i18n/LanguageContext';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';
import TutorialService, { TourStep } from '../components/TutorialService';
import { useNavigate } from 'react-router-dom';
import { MOCK_OPPORTUNITIES, Opportunity } from '../core/domain';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '../store/useAppStore';
import NotificationCenter from '../components/NotificationCenter';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

// --- Types & Mock Data ---

interface PlayerProfile {
  id: string;
  name: string;
  position: string;
  age: number;
  location: string;
  strongFoot: string;
  height: string;
  weight: string;
  verification_status: boolean;
  verification_tier: 'GOLD' | 'DIAMOND' | 'DIAMOND_PRO' | 'NONE';
  years_experience: number;
  total_validations: number;
  overall_rating: number;
  followers: string;
  following: string;
  bio: string;
  posts_count: number;
  stats: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
  validation_breakdown: {
    referee: number;
    coach: number;
    community: number;
  };
  recent_matches: { date: string; rating: number; opponent: string; result: string }[];
  scout_views: { date: string; views: number }[];
  interested_clubs: { name: string; logo: string; status: string }[];
  feed: { 
    id: string; 
    type: 'video' | 'image' | 'text'; 
    title: string; 
    time: string; 
    content: string; 
    likes: number; 
    comments: number; 
    image?: string;
  }[];
}

const mockPlayer: PlayerProfile = {
  id: 'PLY-8472',
  name: 'Mateo Silva',
  position: 'Central Midfielder (CM)',
  age: 19,
  location: 'Madrid, Spain',
  strongFoot: 'Right',
  height: '1.82m',
  weight: '74kg',
  verification_status: true,
  verification_tier: 'GOLD',
  years_experience: 4,
  total_validations: 128,
  overall_rating: 84,
  followers: '12.4K',
  following: '150',
  bio: 'CM @ Real Madrid Academy | 🇪🇸 U19 National Team | Vision & Control | Chasing the dream ⚽️',
  posts_count: 42,
  stats: { pace: 78, shooting: 72, passing: 88, dribbling: 85, defending: 70, physical: 76 },
  validation_breakdown: { referee: 86, coach: 82, community: 80 },
  recent_matches: [
    { date: 'Oct 12', rating: 82, opponent: 'FC Barcelona U19', result: 'W 2-1' },
    { date: 'Oct 19', rating: 85, opponent: 'Valencia CF U19', result: 'D 1-1' },
    { date: 'Oct 26', rating: 84, opponent: 'Sevilla FC U19', result: 'W 3-0' },
    { date: 'Nov 02', rating: 88, opponent: 'Athletic Club U19', result: 'W 1-0' },
    { date: 'Nov 09', rating: 86, opponent: 'Real Betis U19', result: 'L 1-2' },
  ],
  scout_views: [
    { date: '1', views: 12 }, { date: '5', views: 15 }, { date: '10', views: 25 },
    { date: '15', views: 22 }, { date: '20', views: 45 }, { date: '25', views: 60 }, { date: '30', views: 85 }
  ],
  interested_clubs: [
    { name: 'Arsenal FC', logo: 'AFC', status: 'Monitoring' },
    { name: 'Borussia Dortmund', logo: 'BVB', status: 'Offer Pending' },
    { name: 'SL Benfica', logo: 'SLB', status: 'Scouted' },
  ],
  feed: [
    { 
      id: '1', type: 'video', title: 'feed.assist', time: 'feed.time', 
      content: 'feed.content1', 
      likes: 1240, comments: 84, image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop' 
    },
    { 
      id: '2', type: 'image', title: 'feed.motm', time: 'feed.time_day', 
      content: 'feed.content2', 
      likes: 3890, comments: 156, image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop' 
    },
    { 
      id: '3', type: 'video', title: 'feed.training', time: 'feed.time_days', 
      content: 'feed.content3', 
      likes: 850, comments: 32, image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop' 
    },
    { 
      id: '4', type: 'text', title: 'feed.update', time: 'feed.time_week', 
      content: 'feed.content4', 
      likes: 420, comments: 18 
    },
  ]
};

const radarData = [
  { subject: 'PAC', A: mockPlayer.stats.pace, fullMark: 100 },
  { subject: 'SHO', A: mockPlayer.stats.shooting, fullMark: 100 },
  { subject: 'PAS', A: mockPlayer.stats.passing, fullMark: 100 },
  { subject: 'DRI', A: mockPlayer.stats.dribbling, fullMark: 100 },
  { subject: 'DEF', A: mockPlayer.stats.defending, fullMark: 100 },
  { subject: 'PHY', A: mockPlayer.stats.physical, fullMark: 100 },
];

const historyData = [
  { month: 'Aug', ovr: 81 },
  { month: 'Sep', ovr: 82 },
  { month: 'Oct', ovr: 83 },
  { month: 'Nov', ovr: 84 },
  { month: 'Dec', ovr: 84 },
];

type TabType = 'feed' | 'dashboard' | 'opportunities' | 'profile';

const TOUR_STEPS: TourStep[] = [
  { targetId: 'tour-radar', title: 'The Athletic CV', text: 'Tu Identidad Digital: Aquí se refleja tu rendimiento certificado por expertos.' },
  { targetId: 'tour-pro-badge', title: 'The PRO Badge', text: 'Estatus Elite: Este sello se activa tras ser validado por la red central.' },
  { targetId: 'tour-guardian', title: 'Guardian Link', text: 'Privacidad Blindada: Toda comunicación externa es filtrada por tu tutor legal.' },
  { targetId: 'tour-analytics', title: 'Scout Analytics', text: 'Impacto Real: Monitorea cuántas organizaciones están siguiendo tu rastro.' },
  { targetId: 'tour-decision', title: 'Decision Point', text: '¿Listo para explorar?', isDecisionPoint: true },
  { targetId: 'tour-compare', title: 'Talent Comparison', text: 'Benchmark: Compara tus KPIs con el promedio de la liga.' },
  { targetId: 'tour-vault', title: 'Document Vault', text: 'Bóveda Segura: Gestiona tus contratos y permisos encriptados.' },
];

export default function Cantera2PlayerDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [profileTab, setProfileTab] = useState<'posts' | 'cv'>('posts');
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Cantera Player Profile',
          text: 'Check out my football profile on Cantera!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const { t } = useLanguage();
  const navigate = useNavigate();

  // Tutorial State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const startTour = () => {
    setIsTourActive(true);
    setTourStepIndex(0);
    setActiveTab('dashboard');
  };

  const handleTourNext = () => {
    const nextStep = tourStepIndex + 1;
    if (nextStep >= TOUR_STEPS.length) {
      handleTourFinish();
      return;
    }
    
    setTourStepIndex(nextStep);
    
    // Auto-navigate tabs based on the next step
    switch (nextStep) {
      case 0: setActiveTab('dashboard'); break; // Radar
      case 1: setActiveTab('profile'); break; // PRO Badge
      case 2: break; // Guardian (Header, any tab)
      case 3: setActiveTab('network'); break; // Analytics
      case 4: break; // Decision (Any tab)
      case 5: setActiveTab('dashboard'); break; // Compare
      case 6: 
        setActiveTab('profile'); 
        setProfileTab('cv');
        break; // Vault
    }
  };

  const handleTourFinish = () => {
    setIsTourActive(false);
    localStorage.setItem('cantera_tour_completed', 'true');
    setActiveTab('feed');
  };

  useEffect(() => {
    (window as any).setIsPublishOpen = setIsPublishOpen;
    return () => { delete (window as any).setIsPublishOpen; };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal text-charcoal dark:text-ice pb-32 font-sans selection:bg-gold/30 transition-colors duration-300">
      
      {/* Top App Bar (Mobile Social Style) */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-charcoal/80 backdrop-blur-md border-b border-border-subtle px-4 py-3 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-3">
          <BackButton />
          <Logo size="md" />
        </div>
        <div className="flex items-center gap-4">
          <button id="tour-guardian" className="flex items-center gap-1 text-charcoal/60 dark:text-ice/60 hover:text-gold transition-colors bg-black/5 dark:bg-white/5 px-2 py-1 rounded-lg border border-border-subtle">
            <Shield size={16} /> <span className="text-xs font-medium">{t('profile.guardian')}</span>
          </button>
          <button onClick={startTour} className="text-charcoal/60 dark:text-ice/60 hover:text-gold transition-colors" aria-label="Start Tour">
            <div className="p-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-border-subtle flex items-center justify-center">
              <span className="text-xs font-bold">?</span>
            </div>
          </button>
          <button onClick={() => setIsQROpen(true)} className="text-charcoal/60 dark:text-ice/60 hover:text-gold transition-colors" aria-label="My QR Code">
            <div className="p-1.5 rounded-md bg-black/5 dark:bg-white/5 border border-border-subtle">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
            </div>
          </button>
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative text-charcoal/60 dark:text-ice/60 hover:text-gold transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white dark:border-charcoal flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/settings')} className="text-charcoal/60 dark:text-ice/60 hover:text-gold transition-colors"><Settings size={20} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'feed' && <ScreenFeed />}
            {activeTab === 'dashboard' && <ScreenDashboard t={t} />}
            {activeTab === 'opportunities' && <ScreenOpportunities t={t} />}
            {activeTab === 'profile' && <ScreenProfile onEdit={() => setIsEditProfileOpen(true)} t={t} profileTab={profileTab} setProfileTab={setProfileTab} onOpenVerification={() => setIsVerificationModalOpen(true)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <TutorialService 
        isActive={isTourActive}
        steps={TOUR_STEPS}
        currentStepIndex={tourStepIndex}
        onNext={handleTourNext}
        onSkip={handleTourFinish}
        onFinish={handleTourFinish}
      />

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/80 dark:bg-charcoal/80 backdrop-blur-xl border border-border-subtle/50 rounded-full shadow-2xl z-50 px-2 py-2 transition-all duration-300">
        <div className="flex justify-around items-center h-14 relative">
          <NavButton icon={<Home size={24} />} label={t('nav.home')} isActive={activeTab === 'feed'} onClick={() => setActiveTab('feed')} />
          <NavButton icon={<LayoutDashboard size={24} />} label={t('nav.dash')} isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          
          {/* Publish FAB */}
          <div className="relative -top-8">
            <button 
              onClick={() => setIsPublishOpen(true)}
              className="w-14 h-14 bg-gold rounded-full flex items-center justify-center text-charcoal shadow-[0_8px_25px_rgba(212,175,55,0.4)] hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>

          <NavButton icon={<Trophy size={24} />} label={t('nav.opps')} isActive={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} />
          <NavButton icon={<User size={24} />} label={t('nav.profile')} isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </div>

      {/* Modals */}
      <PublishModal isOpen={isPublishOpen} onClose={() => setIsPublishOpen(false)} />
      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
      <VerificationModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} t={t} />
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQROpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsQROpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-charcoal p-8 rounded-3xl border border-border-subtle max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2">My Cantera QR</h3>
              <p className="text-sm text-charcoal/50 dark:text-ice/50 mb-8">Scouts can scan this to view your profile instantly.</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block mb-8">
                <QRCodeSVG value={window.location.href} size={200} fgColor="#1A1A1A" />
              </div>

              <div className="flex gap-4">
                <button onClick={handleShare} className="flex-1 py-3 bg-gold text-charcoal font-bold rounded-xl hover:bg-gold/80 transition-colors flex items-center justify-center gap-2">
                  <Share2 size={18} /> Share Link
                </button>
                <button onClick={() => setIsQROpen(false)} className="flex-1 py-3 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// --- Components ---

function KPISummary({ t }: { t: (k: string) => string }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4">
      {[
        { label: 'Scout Views', value: '8', trend: '↑2', icon: <Globe size={16} />, color: 'text-blue-500' },
        { label: 'Messages', value: '2', trend: 'New', icon: <MessageCircle size={16} />, color: 'text-gold' },
        { label: 'Clubs Watching', value: '3', trend: 'Active', icon: <Briefcase size={16} />, color: 'text-emerald-500' },
        { label: 'Next Event', value: 'Jun 15', trend: 'Trial', icon: <Calendar size={16} />, color: 'text-purple-500' },
        { label: 'Latest Rating', value: '84', trend: 'May 8', icon: <ShieldCheck size={16} />, color: 'text-gold' },
      ].map((kpi, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-panel p-3 flex flex-col justify-between min-h-[90px] border-border-subtle/50"
        >
          <div className={cn("p-1.5 rounded-lg bg-black/5 dark:bg-white/5 w-fit mb-2", kpi.color)}>
            {kpi.icon}
          </div>
          <div>
            <p className="text-[10px] text-charcoal/50 dark:text-ice/50 uppercase font-bold tracking-wider">{kpi.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold">{kpi.value}</p>
              <span className={cn("text-[9px] font-black px-1 rounded", kpi.color === 'text-gold' ? 'bg-gold/10' : 'bg-black/5 dark:bg-white/5')}>
                {kpi.trend}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function NotificationBanner({ t }: { t: (k: string) => string }) {
  return (
    <div className="px-4 mb-2">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gold/10 border border-gold/20 rounded-2xl p-4 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold shrink-0">
          <Bell size={20} className="animate-bounce" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-charcoal dark:text-white">Arsenal FC is watching you!</p>
          <p className="text-xs text-charcoal/60 dark:text-ice/60">A scout from Arsenal just viewed your profile. Keep it up!</p>
        </div>
        <button className="text-xs font-bold text-gold hover:underline underline-offset-4">
          View Profile
        </button>
      </motion.div>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-all duration-300 relative",
        isActive ? "text-gold bg-gold/10 scale-110" : "text-charcoal/40 dark:text-ice/40 hover:text-charcoal/80 dark:hover:text-ice/80"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
      {isActive && <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-gold rounded-full absolute -bottom-1" />}
    </button>
  );
}

// --- Screen 1: Social Feed ---
function ScreenFeed() {
  const { t } = useLanguage();
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const user = useAppStore(state => state.user);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!user?.uid) return;
      try {
        const likesRef = collection(db, `users/${user.uid}/likes`);
        const snapshot = await getDocs(likesRef);
        const likes: Record<string, boolean> = {};
        snapshot.forEach(doc => {
          likes[doc.id] = true;
        });
        setLikedPosts(likes);
      } catch (error) {
        console.error("Error fetching likes", error);
      }
    };
    fetchLikes();
  }, [user?.uid]);

  const toggleLike = async (id: string) => {
    const isLiked = likedPosts[id];
    
    // Optimistic update
    setLikedPosts(prev => ({ ...prev, [id]: !isLiked }));

    if (user?.uid) {
      try {
        const likeRef = doc(db, `users/${user.uid}/likes`, id);
        if (isLiked) {
          await deleteDoc(likeRef);
        } else {
          await setDoc(likeRef, { timestamp: new Date().toISOString() });
        }
      } catch (error) {
        console.error("Error toggling like", error);
        // Revert optimistic update on error
        setLikedPosts(prev => ({ ...prev, [id]: isLiked }));
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <KPISummary t={t} />
      <NotificationBanner t={t} />

      {/* Create Post Trigger */}
      <div className="px-4">
        <div className="glass-panel p-4 flex items-center gap-4 border-border-subtle/50">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/30">
            <img src={user?.avatar || "https://picsum.photos/seed/player1/400/400"} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <button 
            onClick={() => (window as any).setIsPublishOpen?.(true)}
            className="flex-1 bg-black/5 dark:bg-white/5 border border-border-subtle rounded-xl py-2.5 px-4 text-left text-charcoal/50 dark:text-ice/50 text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            {t('c2.post.create')}...
          </button>
          <div className="flex items-center gap-2">
            <button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"><Video size={20} /></button>
            <button className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><ImageIcon size={20} /></button>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {mockPlayer.feed.map((post) => (
          <div key={post.id} className="glass-panel overflow-hidden border border-border-subtle rounded-2xl">
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gold/30">
                  <img src="https://picsum.photos/seed/player1/400/400" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm text-charcoal dark:text-ice">{mockPlayer.name}</p>
                    {mockPlayer.verification_status && <ShieldCheck size={14} className="text-gold" />}
                  </div>
                  <p className="text-xs text-charcoal/50 dark:text-ice/50">{t(post.time)}</p>
                </div>
              </div>
              <button className="text-charcoal/40 dark:text-ice/40 hover:text-gold transition-colors"><Activity size={18} /></button>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
              <p className="text-sm text-charcoal/90 dark:text-ice/90 leading-relaxed">{t(post.content)}</p>
            </div>

            {/* Post Media */}
            {post.image && (
              <div className="relative w-full max-h-[500px] bg-black/5 dark:bg-black/20 overflow-hidden flex items-center justify-center">
                <img 
                  src={post.image} 
                  alt="Post media" 
                  className="w-full h-full object-contain max-h-[500px]" 
                  referrerPolicy="no-referrer" 
                />
                {post.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-charcoal/80 backdrop-blur-sm flex items-center justify-center text-gold border border-gold/30">
                      <Play size={20} className="ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Post Actions */}
            <div className="p-4 flex flex-col gap-4 border-t border-border-subtle/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={cn("flex items-center gap-2 transition-colors", likedPosts[post.id] ? "text-red-500" : "text-charcoal/60 dark:text-ice/60 hover:text-red-400")}
                  >
                    <Heart size={20} fill={likedPosts[post.id] ? "currentColor" : "none"} /> 
                    <span className="text-sm font-medium">{post.likes + (likedPosts[post.id] ? 1 : 0)}</span>
                  </button>
                  <button className="flex items-center gap-2 text-charcoal/60 dark:text-ice/60 hover:text-charcoal dark:hover:text-ice transition-colors">
                    <MessageCircle size={20} /> <span className="text-sm font-medium">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-charcoal/60 dark:text-ice/60 hover:text-charcoal dark:hover:text-ice transition-colors">
                    <Share2 size={20} />
                  </button>
                </div>
                <button className="text-gold text-xs font-bold uppercase tracking-widest hover:underline underline-offset-4">
                  View Scout Analytics
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Screen 2: Dashboard (Analytics & Radar) ---
function ScreenDashboard({ t }: { t: (k: string) => string }) {
  const calculateWeightedRating = (breakdown: PlayerProfile['validation_breakdown']) => {
    return (breakdown.referee * 0.6) + (breakdown.coach * 0.2) + (breakdown.community * 0.2);
  };
  const calculatedRating = calculateWeightedRating(mockPlayer.validation_breakdown).toFixed(1);

  return (
    <div className="p-4 space-y-6">
      {/* OVR Card */}
      <div className="glass-panel p-6 flex items-center justify-between bg-gradient-to-br from-black/[0.02] dark:from-white/[0.05] to-transparent">
        <div>
          <p className="text-xs text-charcoal/50 dark:text-ice/50 uppercase tracking-widest mb-1">Overall Rating</p>
          <p className="text-5xl font-bold text-gold-gradient">{calculatedRating}</p>
        </div>
        <div className="space-y-2 text-right">
          <div className="text-xs"><span className="text-charcoal/50 dark:text-ice/50">{t('c2.dash.referee')}</span> <span className="font-mono text-gold">{mockPlayer.validation_breakdown.referee}</span></div>
          <div className="text-xs"><span className="text-charcoal/50 dark:text-ice/50">{t('c2.dash.coach')}</span> <span className="font-mono text-gold">{mockPlayer.validation_breakdown.coach}</span></div>
          <div className="text-xs"><span className="text-charcoal/50 dark:text-ice/50">{t('c2.dash.community')}</span> <span className="font-mono text-gold">{mockPlayer.validation_breakdown.community}</span></div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="glass-panel p-6" id="tour-radar">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold tracking-widest uppercase text-charcoal/80 dark:text-ice/80">{t('c2.dash.tech')}</h3>
          <button id="tour-compare" className="text-xs text-gold border border-gold/30 px-2 py-1 rounded hover:bg-gold/10 transition-colors">
            {t('dash.compare')}
          </button>
        </div>
        <div className="h-[280px] -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#2A2A2A" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#F0F8FF', opacity: 0.5, fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Player" dataKey="A" stroke="#D4AF37" strokeWidth={2} fill="#D4AF37" fillOpacity={0.15} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical OVR Line Chart */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-semibold tracking-widest uppercase text-charcoal/80 dark:text-ice/80 mb-6">OVR History</h3>
        <div className="h-[200px] -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#D4AF37' }}
              />
              <Line type="monotone" dataKey="ovr" stroke="#D4AF37" strokeWidth={3} dot={{ fill: '#D4AF37', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#D4AF37' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Career History */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-semibold tracking-widest uppercase text-charcoal/80 dark:text-ice/80 mb-6">{t('c2.dash.recent')}</h3>
        
        {/* OVR Evolution Chart */}
        <div className="h-[150px] mb-6 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockPlayer.recent_matches}>
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#D4AF37' }}
              />
              <Line type="monotone" dataKey="rating" stroke="#D4AF37" strokeWidth={3} dot={{ fill: '#D4AF37', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {mockPlayer.recent_matches.map((match, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="flex flex-col">
                <span className="font-medium text-sm text-charcoal dark:text-ice">{match.opponent}</span>
                <span className="text-xs font-mono text-charcoal/40 dark:text-ice/40">{match.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "text-xs font-bold w-8 text-center",
                  match.result.startsWith('W') ? "text-green-600 dark:text-green-400" : match.result.startsWith('L') ? "text-red-600 dark:text-red-400" : "text-charcoal/50 dark:text-ice/50"
                )}>{match.result}</span>
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center border border-border-subtle">
                  <span className="font-mono text-xs text-gold">{match.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Screen 3: Opportunities ---
function ScreenOpportunities({ t }: { t: (k: string) => string }) {
  const [filter, setFilter] = useState<'ALL' | 'TRIAL' | 'TOURNAMENT' | 'SCOUTING_EVENT'>('ALL');
  
  const filteredOpportunities = MOCK_OPPORTUNITIES.filter(opp => 
    filter === 'ALL' || opp.type === filter
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-charcoal dark:text-white">{t('c2.opp.title')}</h2>
          <button className="text-charcoal/40 dark:text-ice/40 hover:text-gold transition-colors">
            <FilterIcon size={20} />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'ALL', label: t('c2.opp.filter.all') },
            { id: 'TRIAL', label: t('c2.opp.filter.trial') },
            { id: 'TOURNAMENT', label: t('c2.opp.filter.tournament') },
            { id: 'SCOUTING_EVENT', label: t('c2.opp.filter.scouting') }
          ].map((f) => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-all", 
                filter === f.id ? "bg-gold text-charcoal border-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" : "bg-black/5 dark:bg-white/5 text-charcoal/40 dark:text-ice/40 border-border-subtle"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredOpportunities.map((opp) => (
          <div key={opp.id} className="glass-panel p-6 rounded-2xl border border-border-subtle hover:border-gold/30 transition-all group relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-3xl -mr-12 -mt-12 group-hover:bg-gold/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-border-subtle text-gold font-bold text-sm shadow-inner overflow-hidden shrink-0">
                  {opp.creator.logo ? (
                    <img 
                      src={opp.creator.logo} 
                      alt={opp.creator.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    opp.creator.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-charcoal dark:text-ice group-hover:text-gold transition-colors text-base truncate">{opp.title}</h3>
                  <p className="text-xs text-charcoal/40 dark:text-ice/40 flex items-center gap-1 mt-0.5 truncate">
                    <Briefcase size={12} className="text-gold/60 shrink-0" /> 
                    <span className="truncate">{opp.creator.name}</span> • <span className="text-gold/80 font-medium shrink-0">{opp.type}</span>
                  </p>
                </div>
              </div>
              {opp.creator.isAuthorized && (
                <div className="bg-gold/10 text-gold p-1.5 rounded-full border border-gold/20 shadow-[0_0_10px_rgba(212,175,55,0.1)] shrink-0 ml-2">
                  <ShieldCheck size={16} className="fill-gold/10" />
                </div>
              )}
            </div>

            <p className="text-sm text-charcoal/70 dark:text-ice/70 mb-5 line-clamp-2 leading-relaxed relative z-10">{opp.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="flex items-center gap-2 text-xs text-charcoal/50 dark:text-ice/50 bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-border-subtle/30">
                <MapPin size={14} className="text-gold" /> 
                <span className="truncate">{opp.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal/50 dark:text-ice/50 bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-border-subtle/30">
                <Clock size={14} className="text-gold" /> 
                <span>{opp.date}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle/30 flex items-center justify-between relative z-10">
              <div className="flex flex-wrap gap-2">
                {opp.requirements.minRating && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-[10px] text-charcoal/40 dark:text-ice/40 border border-border-subtle">
                    <TrendingUp size={10} className="text-gold/50" />
                    OVR {opp.requirements.minRating}+
                  </div>
                )}
                {opp.requirements.verifiedOnly && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-gold/5 text-[10px] text-gold/60 border border-gold/20">
                    <ShieldCheck size={10} />
                    {t('c2.verified')}
                  </div>
                )}
              </div>
              <button className="px-5 py-2 bg-gold text-charcoal rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)]">
                {t('c2.opp.apply')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="glass-panel p-4 bg-gold/5 border-gold/20 mt-8">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <Award size={20} className="text-gold" />
          </div>
          <div>
            <p className="text-sm font-bold text-gold">{t('c2.opp.proTip')}</p>
            <p className="text-xs text-charcoal/60 dark:text-ice/60 leading-relaxed">
              {t('c2.opp.proTipDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationBadge({ tier, onClick }: { tier: 'GOLD' | 'DIAMOND' | 'DIAMOND_PRO' | 'NONE', onClick?: () => void }) {
  const { t } = useLanguage();
  if (tier === 'NONE') return null;

  const configs = {
    GOLD: {
      color: 'text-gold',
      bg: 'bg-gold/10',
      border: 'border-gold/30',
      label: t('tier.gold'),
      shadow: 'shadow-[0_0_10px_rgba(212,175,55,0.3)]'
    },
    DIAMOND: {
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/30',
      label: t('tier.diamond'),
      shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]'
    },
    DIAMOND_PRO: {
      color: 'text-white',
      bg: 'bg-gradient-to-br from-cyan-400 via-purple-500 to-gold',
      border: 'border-white/30',
      label: t('tier.diamond_pro'),
      shadow: 'shadow-[0_0_20px_rgba(255,255,255,0.5)]',
      textShadow: 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]'
    }
  };

  const config = configs[tier as keyof typeof configs];

  const content = (
    <div className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-tighter",
      config.bg, config.border, config.color, config.shadow
    )}>
      <ShieldCheck size={10} className={tier === 'DIAMOND_PRO' ? 'fill-white/20' : ''} />
      <span className={'textShadow' in config ? (config as any).textShadow : ''}>{config.label}</span>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="hover:scale-105 transition-transform">
        {content}
      </button>
    );
  }

  return content;
}

// --- Screen 4: Social Profile & CV ---
function ScreenProfile({ onEdit, t, profileTab, setProfileTab, onOpenVerification }: { onEdit: () => void, t: (k: string) => string, profileTab: 'posts' | 'cv', setProfileTab: (t: 'posts' | 'cv') => void, onOpenVerification: () => void }) {
  const totalLikes = mockPlayer.feed.reduce((acc, post) => acc + post.likes, 0);
  const formattedLikes = totalLikes > 1000 ? (totalLikes / 1000).toFixed(1) + 'K' : totalLikes;

  return (
    <div className="pb-8">
      {/* Profile Header */}
      <div className="p-6 flex flex-col items-center">
        <div className="relative mb-4">
          <div className={cn(
            "w-28 h-28 rounded-full overflow-hidden border-2 p-1 transition-all duration-500",
            mockPlayer.verification_tier === 'DIAMOND_PRO' ? "border-white shadow-[0_0_30px_rgba(212,175,55,0.4)]" : 
            mockPlayer.verification_tier === 'DIAMOND' ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]" :
            "border-gold shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          )}>
            <img src="https://picsum.photos/seed/player1/400/400" alt="Avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-charcoal dark:text-white">{mockPlayer.name}</h2>
            {mockPlayer.verification_status && (
              <div id="tour-pro-badge">
                <VerificationBadge tier={mockPlayer.verification_tier} onClick={onOpenVerification} />
              </div>
            )}
          </div>
          <p className="text-sm text-charcoal/60 dark:text-ice/60 mb-3">{mockPlayer.position}</p>
          <p className="text-sm text-charcoal/80 dark:text-ice/80 leading-relaxed max-w-xs mx-auto mb-4">{mockPlayer.bio}</p>
          
          <div className="flex items-center justify-center gap-8 py-4 border-y border-border-subtle/30 w-full max-w-sm">
            <div className="flex flex-col items-center">
              <p className="text-lg font-bold text-charcoal dark:text-white">{mockPlayer.followers}</p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 dark:text-ice/40 font-semibold">Followers</p>
            </div>
            <div className="w-px h-8 bg-border-subtle/30" />
            <div className="flex flex-col items-center">
              <p className="text-lg font-bold text-charcoal dark:text-white">{formattedLikes}</p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 dark:text-ice/40 font-semibold">Likes</p>
            </div>
            <div className="w-px h-8 bg-border-subtle/30" />
            <div className="flex flex-col items-center">
              <p className="text-lg font-bold text-charcoal dark:text-white">{mockPlayer.posts_count}</p>
              <p className="text-[10px] uppercase tracking-widest text-charcoal/40 dark:text-ice/40 font-semibold">Posts</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-charcoal/50 dark:text-ice/50">
          <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-border-subtle transition-colors"><MapPin size={12} /> {mockPlayer.location}</span>
          <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full border border-border-subtle transition-colors"><Calendar size={12} /> {t('c2.cv.joined')} 2024</span>
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={onEdit} className="flex-1 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors rounded-lg text-sm font-medium border border-border-subtle text-charcoal dark:text-ice">
            Edit Profile
          </button>
          <button className="flex-1 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors rounded-lg text-sm font-medium border border-border-subtle text-charcoal dark:text-ice">
            Share Profile
          </button>
        </div>
      </div>

      {/* Profile Sub-tabs */}
      <div className="flex border-t border-border-subtle">
        <button 
          onClick={() => setProfileTab('posts')}
          className={cn("flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", profileTab === 'posts' ? "border-gold text-gold" : "border-transparent text-charcoal/50 dark:text-ice/50")}
        >
          <LayoutDashboard size={18} /> Posts
        </button>
        <button 
          onClick={() => setProfileTab('cv')}
          className={cn("flex-1 py-3 text-sm font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", profileTab === 'cv' ? "border-gold text-gold" : "border-transparent text-charcoal/50 dark:text-ice/50")}
        >
          <FileText size={18} /> Digital CV
        </button>
      </div>

      {/* Sub-tab Content */}
      <div className="mt-1">
        {profileTab === 'posts' && (
          <div className="grid grid-cols-3 gap-1">
            {mockPlayer.feed.filter(p => p.image).map(post => (
              <div key={post.id} className="aspect-square bg-white/5 relative group cursor-pointer">
                <img src={post.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 text-white"><Heart size={16} className="fill-current" /> <span className="text-xs font-bold">{post.likes}</span></div>
                </div>
                {post.type === 'video' && <Play size={16} className="absolute top-2 right-2 text-white drop-shadow-md" />}
              </div>
            ))}
          </div>
        )}

        {profileTab === 'cv' && (
          <div className="p-4 space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-ice/50 mb-6">{t('cv.biometrics_reach')}</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.age')}</p><p className="font-medium text-sm">{mockPlayer.age} {t('cv.experience_years')}</p></div>
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.experience')}</p><p className="font-medium text-sm">{mockPlayer.years_experience} {t('cv.experience_years')}</p></div>
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.validations')}</p><p className="font-medium text-sm">{mockPlayer.total_validations} {t('cv.validations_verified')}</p></div>
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.strong_foot')}</p><p className="font-medium text-sm">{mockPlayer.strongFoot}</p></div>
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.height')}</p><p className="font-medium text-sm">{mockPlayer.height}</p></div>
                <div><p className="text-[10px] text-ice/40 uppercase tracking-wider mb-1">{t('cv.weight')}</p><p className="font-medium text-sm">{mockPlayer.weight}</p></div>
              </div>
            </div>

            <div className="glass-panel p-6" id="tour-vault">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-ice/50 mb-4">{t('cv.docs')}</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border-subtle bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-ice/50" />
                    <span className="text-sm">{t('c2.cv.fifaId')}</span>
                  </div>
                  <CheckCircle2 size={16} className="text-gold" />
                </div>
                <div className="p-3 rounded-lg border border-border-subtle bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity size={16} className="text-ice/50" />
                    <span className="text-sm">{t('c2.cv.medical')}</span>
                  </div>
                  <CheckCircle2 size={16} className="text-gold" />
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-ice/50 mb-4">{t('cv.referee_quality')}</h3>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-border-subtle">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                  <ShieldCheck size={24} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ice">98.5% {t('cv.accuracy')}</p>
                  <p className="text-[10px] text-ice/40 leading-relaxed">
                    {t('cv.referee_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Modals ---

function EditProfileModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { t } = useLanguage();
  const user = useAppStore(state => state.user);
  const setUser = useAppStore(state => state.setUser);
  
  const [name, setName] = useState(user?.name || mockPlayer.name);
  const [bio, setBio] = useState(user?.bio || mockPlayer.bio);
  const [location, setLocation] = useState(mockPlayer.location);
  const [height, setHeight] = useState(mockPlayer.height);
  const [weight, setWeight] = useState(mockPlayer.weight);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || mockPlayer.bio);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) {
      onClose();
      return;
    }
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: name,
        bio: bio,
        location: location,
        height: height,
        weight: weight,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setUser({ ...user, name, bio });
      onClose();
    } catch (error) {
      console.error("Error saving profile", error);
      alert("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-charcoal flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-charcoal/80 backdrop-blur-md sticky top-0 z-10">
          <button onClick={onClose} className="p-2 text-ice/60 hover:text-ice"><X size={24} /></button>
          <h2 className="font-bold text-lg">{t('c2.edit.title')}</h2>
          <button onClick={handleSave} disabled={isSaving} className="p-2 text-gold font-medium disabled:opacity-50">
            {isSaving ? 'Saving...' : t('c2.edit.save')}
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
          
          {/* Avatar Edit */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img src={user?.avatar || "https://picsum.photos/seed/player1/400/400"} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border-subtle opacity-50" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <span className="text-gold text-sm font-medium cursor-pointer">{t('c2.edit.photo')}</span>
          </div>

          {/* Fields */}
          <div className="space-y-6">
            <div>
              <label className="text-xs text-ice/50 uppercase tracking-wider mb-2 block">{t('c2.edit.name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border-b border-border-subtle py-2 text-ice focus:outline-none focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="text-xs text-ice/50 uppercase tracking-wider mb-2 block">{t('c2.edit.bio')}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-transparent border-b border-border-subtle py-2 text-ice focus:outline-none focus:border-gold transition-colors resize-none" />
            </div>
            <div>
              <label className="text-xs text-ice/50 uppercase tracking-wider mb-2 block">{t('c2.edit.location')}</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-transparent border-b border-border-subtle py-2 text-ice focus:outline-none focus:border-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-ice/50 uppercase tracking-wider mb-2 block">{t('c2.edit.height')}</label>
                <input type="text" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-transparent border-b border-border-subtle py-2 text-ice focus:outline-none focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-xs text-ice/50 uppercase tracking-wider mb-2 block">{t('c2.edit.weight')}</label>
                <input type="text" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-transparent border-b border-border-subtle py-2 text-ice focus:outline-none focus:border-gold transition-colors" />
              </div>
            </div>
          </div>

          {/* Settings Toggles */}
          <div className="pt-6 border-t border-border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('c2.edit.looking')}</p>
                <p className="text-xs text-ice/50">{t('c2.edit.lookingDesc')}</p>
              </div>
              <div className="w-12 h-6 bg-gold rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-charcoal rounded-full absolute right-0.5 top-0.5" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('c2.edit.private')}</p>
                <p className="text-xs text-ice/50">{t('c2.edit.privateDesc')}</p>
              </div>
              <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-ice/50 rounded-full absolute left-0.5 top-0.5" />
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PublishModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { t } = useLanguage();
  const user = useAppStore(state => state.user);
  const [content, setContent] = useState('');
  const [type, setType] = useState<'video' | 'image' | 'text'>('text');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setContent('');
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-0 z-[100] bg-charcoal flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <button onClick={onClose} className="p-2 text-ice/60"><X size={24} /></button>
          <h2 className="font-bold text-lg">{t('c2.post.create')}</h2>
          <button 
            onClick={handlePost}
            disabled={isSubmitting || !content.trim()}
            className="px-4 py-1.5 bg-gold text-charcoal font-bold rounded-full disabled:opacity-50"
          >
            {isSubmitting ? '...' : t('c2.post.publish')}
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3">
            <img src={user?.avatar || "https://picsum.photos/seed/player1/400/400"} alt="Avatar" className="w-10 h-10 rounded-full border border-gold/30" referrerPolicy="no-referrer" />
            <div>
              <p className="font-bold text-sm">{user?.name || 'Mateo Silva'}</p>
              <div className="flex gap-2 mt-1">
                {(['text', 'image', 'video'] as const).map(t_type => (
                  <button 
                    key={t_type}
                    onClick={() => setType(t_type)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all",
                      type === t_type ? "bg-gold border-gold text-charcoal" : "border-border-subtle text-ice/40"
                    )}
                  >
                    {t_type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea 
            placeholder={t('c2.post.placeholder')}
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full bg-transparent text-lg text-ice placeholder:text-ice/20 focus:outline-none resize-none min-h-[200px]"
          />

          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 rounded-2xl border border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 text-ice/40 hover:text-gold hover:border-gold transition-all">
              <ImageIcon size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">{t('c2.post.add_photo')}</span>
            </button>
            <button className="p-4 rounded-2xl border border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 text-ice/40 hover:text-gold hover:border-gold transition-all">
              <Video size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">{t('c2.post.add_video')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function VerificationModal({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: (k: string) => string }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel w-full max-w-md overflow-hidden rounded-3xl border border-border-subtle bg-charcoal"
        >
          <div className="p-6 border-b border-border-subtle flex justify-between items-center">
            <h3 className="text-xl font-bold text-gold-gradient">{t('verification.title')}</h3>
            <button onClick={onClose} className="p-2 text-ice/60 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <p className="text-sm text-ice/70 leading-relaxed">
              {t('verification.desc')}
            </p>

            {/* GOLD */}
            <div className="space-y-2 p-4 rounded-2xl bg-gold/5 border border-gold/20">
              <div className="flex items-center gap-2">
                <VerificationBadge tier="GOLD" />
                <h4 className="font-bold text-gold">{t('verification.gold.title')}</h4>
              </div>
              <p className="text-xs text-ice/60 leading-relaxed">
                {t('verification.gold.req')}
              </p>
            </div>

            {/* DIAMOND */}
            <div className="space-y-2 p-4 rounded-2xl bg-cyan-400/5 border border-cyan-400/20">
              <div className="flex items-center gap-2">
                <VerificationBadge tier="DIAMOND" />
                <h4 className="font-bold text-cyan-400">{t('verification.diamond.title')}</h4>
              </div>
              <p className="text-xs text-ice/60 leading-relaxed">
                {t('verification.diamond.req')}
              </p>
            </div>

            {/* DIAMOND PRO */}
            <div className="space-y-2 p-4 rounded-2xl bg-gradient-to-br from-cyan-400/5 via-purple-500/5 to-gold/5 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-purple-500/10 to-gold/10 opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <VerificationBadge tier="DIAMOND_PRO" />
                  <h4 className="font-bold text-white">{t('verification.diamond_pro.title')}</h4>
                </div>
                <p className="text-xs text-ice/60 leading-relaxed">
                  {t('verification.diamond_pro.req')}
                </p>
              </div>
            </div>

          </div>
          
          <div className="p-4 border-t border-border-subtle">
            <button 
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              {t('verification.close')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
