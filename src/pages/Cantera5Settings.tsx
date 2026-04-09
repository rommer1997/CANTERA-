import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, User, Settings, CreditCard, HelpCircle, FileText, 
  LogOut, Moon, Sun, Globe, Bell, Shield, ChevronRight, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../core/i18n/LanguageContext';
import { useTheme } from '../core/ThemeContext';
import { useAppStore } from '../store/useAppStore';

type SettingsSection = 'main' | 'profile' | 'personalization' | 'subscription' | 'support' | 'terms';

export default function Cantera5Settings() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [notifications, setNotifications] = useState(true);
  
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);

  // Get user data from global store or fallback to default (Mateo)
  const userData = user || {
    name: 'Mateo Silva',
    email: 'mateo.silva@example.com',
    role: 'PLAYER',
    bio: 'CM @ Real Madrid Academy | 🇪🇸 U19 National Team | Vision & Control | Chasing the dream ⚽️',
    avatar: 'https://picsum.photos/seed/player1/200/200',
    plan: 'PRO PLAN'
  };

  const handleBack = () => {
    if (activeSection === 'main') {
      navigate(-1);
    } else {
      setActiveSection('main');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal text-charcoal dark:text-white font-sans selection:bg-gold/30 pb-20 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-charcoal/90 backdrop-blur-md border-b border-gray-200 dark:border-border-subtle px-4 py-4 flex items-center gap-4">
        <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">
          {activeSection === 'main' && t('settings.title')}
          {activeSection === 'profile' && t('settings.profile')}
          {activeSection === 'personalization' && t('settings.personalization')}
          {activeSection === 'subscription' && t('settings.subscription')}
          {activeSection === 'support' && t('settings.support')}
          {activeSection === 'terms' && t('settings.terms')}
        </h1>
      </header>

      <div className="max-w-2xl mx-auto w-full p-4">
        <AnimatePresence mode="wait">
          {activeSection === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* User Quick Info */}
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2A2A2A] overflow-hidden border border-[#D4AF37]/30">
                  <img src={userData.avatar} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{userData.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    {userData.plan}
                  </div>
                </div>
              </div>

              {/* Settings Menu */}
              <div className="space-y-2">
                <MenuButton icon={<User />} label={t('settings.profile')} onClick={() => setActiveSection('profile')} />
                <MenuButton icon={<Settings />} label={t('settings.personalization')} onClick={() => setActiveSection('personalization')} />
                <MenuButton icon={<CreditCard />} label={t('settings.subscription')} onClick={() => setActiveSection('subscription')} />
                <MenuButton icon={<HelpCircle />} label={t('settings.support')} onClick={() => setActiveSection('support')} />
                <MenuButton icon={<FileText />} label={t('settings.terms')} onClick={() => setActiveSection('terms')} />
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-[#2A2A2A]">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={20} />
                    <span className="font-medium">{t('settings.logout')}</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative">
                  <img src={userData.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-[#2A2A2A]" referrerPolicy="no-referrer" />
                  <button className="absolute bottom-0 right-0 p-2 bg-[#D4AF37] text-black rounded-full hover:scale-105 transition-transform">
                    <User size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <InputField label={t('settings.fullname')} defaultValue={userData.name} />
                <InputField label={t('settings.email')} defaultValue={userData.email} type="email" />
                <InputField label={t('settings.phone')} defaultValue="+34 600 123 456" type="tel" />
                
                <div className="pt-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">{t('settings.bio')}</label>
                  <textarea 
                    defaultValue={userData.bio} 
                    rows={4} 
                    className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-3 text-charcoal dark:text-white focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                  />
                </div>

                {userData.role === 'PLAYER' && (
                  <div className="pt-4 space-y-4">
                    <h3 className="text-sm font-bold text-charcoal dark:text-white">Social & Media</h3>
                    <InputField label="Instagram Username" defaultValue="@mateosilva10" />
                    <InputField label="X (Twitter) Username" defaultValue="@msilva_10" />
                    <InputField label="Highlight Video URL (YouTube/Vimeo)" defaultValue="https://youtube.com/watch?v=..." />
                  </div>
                )}
              </div>

              <button className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#b5952f] transition-colors mt-8">
                {t('settings.save')}
              </button>
            </motion.div>
          )}

          {activeSection === 'personalization' && (
            <motion.div 
              key="personalization"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Theme */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('settings.appearance')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors",
                      theme === 'dark' ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]" : "border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:text-charcoal dark:hover:text-white"
                    )}
                  >
                    <Moon size={24} />
                    <span className="font-medium">{t('settings.dark')}</span>
                  </button>
                  <button 
                    onClick={() => setTheme('light')}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center gap-3 transition-colors",
                      theme === 'light' ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#D4AF37]" : "border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:text-charcoal dark:hover:text-white"
                    )}
                  >
                    <Sun size={24} />
                    <span className="font-medium">{t('settings.light')}</span>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{t('settings.language')}</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setLanguage('en')}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-gray-500 dark:text-gray-400" />
                      <span>English (US)</span>
                    </div>
                    {language === 'en' && <CheckCircle2 size={20} className="text-[#D4AF37]" />}
                  </button>
                  <button 
                    onClick={() => setLanguage('es')}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-gray-500 dark:text-gray-400" />
                      <span>Español (ES)</span>
                    </div>
                    {language === 'es' && <CheckCircle2 size={20} className="text-[#D4AF37]" />}
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('settings.notifications')}</h3>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="font-medium">{t('settings.push')}</p>
                      <p className="text-xs text-gray-500">{t('settings.push_desc')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setNotifications(!notifications)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors",
                      notifications ? "bg-[#D4AF37]" : "bg-gray-200 dark:bg-[#2A2A2A]"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                      notifications ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'subscription' && (
            <motion.div 
              key="subscription"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Current Plan */}
              <div className="p-6 rounded-2xl border border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/20 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={100} />
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37] text-black mb-4">
                    CURRENT PLAN
                  </div>
                  <h2 className="text-3xl font-bold mb-2">PRO Elite</h2>
                  <p className="text-gray-300 mb-6">Your subscription is active and renews on Nov 24, 2026.</p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-[#D4AF37]" /> Unlimited Scout Views</div>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-[#D4AF37]" /> Advanced Analytics</div>
                    <div className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-[#D4AF37]" /> Priority Verification</div>
                  </div>

                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/20">
                    Manage Billing
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Payment Method</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-gray-100 dark:bg-white rounded flex items-center justify-center">
                      <span className="text-blue-600 font-bold italic text-xs">VISA</span>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal dark:text-white">•••• •••• •••• 4242</p>
                      <p className="text-xs text-gray-500">Expires 12/28</p>
                    </div>
                  </div>
                  <button className="text-sm text-[#D4AF37] hover:underline">Edit</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'support' && (
            <motion.div 
              key="support"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] text-center space-y-4">
                <div className="w-16 h-16 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto">
                  <HelpCircle size={32} />
                </div>
                <h2 className="text-xl font-bold">How can we help you?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Our support team is available 24/7 to assist you with any issues.</p>
                <button className="w-full py-3 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#b5952f] transition-colors mt-4">
                  Contact Support
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Frequently Asked Questions</h3>
                <div className="space-y-2">
                  <FAQItem question="How do I get verified?" answer="To get verified, you need to request an official referee evaluation during a sanctioned match." />
                  <FAQItem question="Can I change my position?" answer="Yes, you can update your primary and secondary positions in the Profile Configuration section." />
                  <FAQItem question="How does the Guardian feature work?" answer="The Guardian feature allows a parent or legal guardian to monitor and approve communications from scouts." />
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'terms' && (
            <motion.div 
              key="terms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-[#2A2A2A] bg-black/[0.02] dark:bg-white/[0.02] prose prose-invert max-w-none">
                <h2 className="text-xl font-bold mb-4 text-charcoal dark:text-white">Terms and Conditions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last updated: April 3, 2026</p>
                
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  <h3 className="text-charcoal dark:text-white font-bold">1. Acceptance of Terms</h3>
                  <p>By accessing and using CANTERA, you accept and agree to be bound by the terms and provision of this agreement.</p>
                  
                  <h3 className="text-charcoal dark:text-white font-bold">2. User Accounts</h3>
                  <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.</p>
                  
                  <h3 className="text-charcoal dark:text-white font-bold">3. Data Privacy</h3>
                  <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, protect, and when we share personal information and other data with third parties.</p>
                  
                  <h3 className="text-charcoal dark:text-white font-bold">4. Code of Conduct</h3>
                  <p>Users must maintain a professional demeanor. Harassment, abusive language, or falsification of data (including stats and metrics) will result in immediate account termination.</p>
                  
                  <h3 className="text-charcoal dark:text-white font-bold">5. Subscriptions and Billing</h3>
                  <p>Subscription fees are billed in advance on a recurring basis. You may cancel your subscription at any time, but no refunds will be provided for the current billing period.</p>
                </div>
              </div>
              
              <button className="w-full py-4 bg-white/[0.05] border border-[#2A2A2A] text-white font-medium rounded-xl hover:bg-white/[0.1] transition-colors">
                Download PDF Copy
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className="text-gray-500 dark:text-gray-400 group-hover:text-[#D4AF37] transition-colors">
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <ChevronRight size={20} className="text-gray-400 dark:text-gray-600 group-hover:text-charcoal dark:group-hover:text-white transition-colors" />
    </button>
  );
}

function InputField({ label, defaultValue, type = "text" }: { label: string, defaultValue: string, type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">{label}</label>
      <input 
        type={type} 
        defaultValue={defaultValue} 
        className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-3 text-charcoal dark:text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
      />
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-gray-200 dark:border-[#2A2A2A] rounded-xl overflow-hidden bg-black/[0.02] dark:bg-white/[0.02]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-medium text-sm">{question}</span>
        <ChevronRight size={16} className={cn("text-gray-500 transition-transform", isOpen && "rotate-90")} />
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#2A2A2A] mt-2">
          {answer}
        </div>
      )}
    </div>
  );
}
