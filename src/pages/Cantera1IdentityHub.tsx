import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Search, ShieldCheck, Shield, ArrowRight, Mail, PlayCircle, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../core/i18n/LanguageContext';

// --- Types ---
type RoleType = 'player' | 'referee' | 'scout' | 'guardian';

interface RoleCardProps {
  id: RoleType;
  title: string;
  description: string;
  icon: React.ReactNode;
  delay: number;
  onSelect: (role: RoleType) => void;
}

export default function Cantera1IdentityHub() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  const handleRoleSelection = (role: RoleType) => {
    setSelectedRole(role);
  };

  const handleDemoLogin = () => {
    switch (selectedRole) {
      case 'player':
        navigate('/player/PLY-8472');
        break;
      case 'referee':
        navigate('/c3');
        break;
      case 'scout':
        navigate('/c4');
        break;
      case 'guardian':
        alert('Redirigiendo a CANTERA 5: Guardian Oversight (DEMO)...');
        break;
    }
  };

  const roleTitles: Record<RoleType, string> = {
    player: t('c1.role.player'),
    referee: t('c1.role.referee'),
    scout: t('c1.role.scout'),
    guardian: t('c1.role.guardian'),
  };

  return (
    <div className="min-h-screen bg-charcoal text-ice flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-gold/30 relative overflow-hidden">
      
      {/* Background Ambient Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-ice/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <div className="glass-panel p-1 flex items-center rounded-full">
          <button 
            onClick={() => setLanguage('es')}
            className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", language === 'es' ? "bg-white/10 text-gold" : "text-ice/50 hover:text-ice")}
          >
            ES
          </button>
          <button 
            onClick={() => setLanguage('en')}
            className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", language === 'en' ? "bg-white/10 text-gold" : "text-ice/50 hover:text-ice")}
          >
            EN
          </button>
        </div>
      </div>

      <div className="max-w-2xl w-full space-y-12 z-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter md:tracking-tight mb-2 text-gold-gradient">
              {t('c1.title')}
            </h1>
            <p className="text-ice/50 uppercase tracking-widest text-sm font-medium">
              {t('c1.subtitle')}
            </p>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-ice/70 max-w-md mx-auto text-sm"
          >
            {t('c1.desc')}
          </motion.p>
        </div>

        {/* Main Content Area (Roles or Auth) */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div 
                key="roles"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <RoleCard 
                  id="player"
                  title={t('c1.role.player')}
                  description={t('c1.role.player.desc')}
                  icon={<User size={24} />}
                  delay={0.3}
                  onSelect={handleRoleSelection}
                />
                <RoleCard 
                  id="scout"
                  title={t('c1.role.scout')}
                  description={t('c1.role.scout.desc')}
                  icon={<Search size={24} />}
                  delay={0.4}
                  onSelect={handleRoleSelection}
                />
                <RoleCard 
                  id="guardian"
                  title={t('c1.role.guardian')}
                  description={t('c1.role.guardian.desc')}
                  icon={<Shield size={24} />}
                  delay={0.5}
                  onSelect={handleRoleSelection}
                />
                <RoleCard 
                  id="referee"
                  title={t('c1.role.referee')}
                  description={t('c1.role.referee.desc')}
                  icon={<ShieldCheck size={24} />}
                  delay={0.6}
                  onSelect={handleRoleSelection}
                />
              </motion.div>
            ) : (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="glass-panel p-8 space-y-8"
              >
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedRole(null)}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-ice/50 hover:text-ice"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {t('c1.auth.title')} <span className="text-gold">{roleTitles[selectedRole]}</span>
                    </h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-charcoal font-medium hover:bg-white/90 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('c1.auth.google')}
                  </button>
                  
                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-black text-white border border-border-subtle font-medium hover:bg-black/80 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.55.05 2.82.72 3.61 1.88-3.15 1.91-2.65 6.05.39 7.29-.75 1.83-1.63 3.53-2.67 3.8zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {t('c1.auth.apple')}
                  </button>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border-subtle"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-charcoal px-2 text-ice/40 uppercase tracking-widest">O</span>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-transparent border border-border-subtle text-ice font-medium hover:bg-white/5 transition-colors">
                    <Mail size={18} />
                    {t('c1.auth.email')}
                  </button>
                </div>

                <div className="pt-6 border-t border-border-subtle">
                  <button 
                    onClick={handleDemoLogin}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gold/10 text-gold border border-gold/20 font-medium hover:bg-gold/20 transition-colors"
                  >
                    <PlayCircle size={18} />
                    {t('c1.auth.demo')}
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center text-xs text-ice/30 flex items-center justify-center gap-2"
        >
          <Shield size={12} />
          <span>{t('c1.footer')}</span>
        </motion.div>

      </div>
    </div>
  );
}

function RoleCard({ id, title, description, icon, delay, onSelect }: RoleCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      onClick={() => onSelect(id)}
      className="w-full group text-left"
    >
      <div className="glass-panel p-5 md:p-6 flex items-center justify-between glass-panel-hover border-transparent hover:border-gold/30 transition-all duration-300 relative overflow-hidden">
        
        {/* Hover Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/5 to-gold/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="p-3 rounded-xl bg-white/5 text-ice/60 group-hover:text-gold group-hover:bg-gold/10 transition-colors duration-300">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ice group-hover:text-white transition-colors">
              {title}
            </h3>
            <p className="text-sm text-ice/50 mt-1">
              {description}
            </p>
          </div>
        </div>

        <div className="relative z-10 text-ice/30 group-hover:text-gold transition-colors duration-300 transform group-hover:translate-x-1">
          <ArrowRight size={20} />
        </div>
      </div>
    </motion.button>
  );
}
