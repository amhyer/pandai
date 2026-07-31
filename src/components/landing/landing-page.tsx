'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/use-store';
import {
  GraduationCap,
  Menu,
  X,
  Stethoscope,
  Target,
  BookOpen,
  Timer,
  BarChart3,
  Trophy,
  Search,
  Zap,
  ArrowRight,
  Check,
  Users,
  FileQuestion,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Brain,
  BarChart2,
  Flame,
} from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ─── Section Wrapper with scroll-triggered animation ────────────────────────

function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const el = document.getElementById(`section-${className.replace(/\s/g, '-')}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [className]);

  return (
    <motion.section
      id={`section-${className.replace(/\s/g, '-')}`}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  const { navigateTo } = useAppStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Fitur', href: '#fitur' },
    { label: 'Harga', href: '#harga' },
    { label: 'Tentang', href: '#tentang' },
  ];

  const handleNavClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-emerald-600/95 backdrop-blur-md shadow-sm border-b border-emerald-500/50'
          : 'bg-emerald-600'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            PANDAI
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`text-sm font-medium transition-colors hover:text-emerald-200 ${
                scrolled ? 'text-white/90' : 'text-white/80'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => navigateTo('login')}
          >
            Masuk
          </Button>
          <Button
            className="bg-white hover:bg-white/90 text-emerald-700 font-semibold shadow-md hover:shadow-lg transition-all"
            onClick={() => navigateTo('register')}
          >
            Daftar Sekolah
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-emerald-700">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  PANDAI
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 px-4">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => {
                      handleNavClick(link.href);
                    }}
                    className="text-left rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-navy transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    className="w-full text-navy border-navy/20"
                    onClick={() => navigateTo('login')}
                  >
                    Masuk
                  </Button>
                  <Button
                    className="w-full bg-gold hover:bg-gold-dark text-white font-semibold"
                    onClick={() => navigateTo('register')}
                  >
                    Daftar Sekolah
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────────

function HeroSection() {
  const { navigateTo } = useAppStore();

  const stats = [
    { value: '50+', label: 'Sekolah' },
    { value: '5.000+', label: 'Siswa' },
    { value: '100K+', label: 'Soal' },
    { value: '92%', label: 'Kenaikan Skor' },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy pt-16">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} custom={0}>
                <Badge className="bg-gold/20 text-gold border-gold/30 px-3 py-1 text-sm mb-6">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Platform TKA #1 di Indonesia
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                custom={1}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight"
              >
                Tingkatkan Skor{' '}
                <span className="text-gold">TKA</span>{' '}
                Siswa Anda
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                custom={2}
                className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-xl"
              >
                Platform persiapan Tes Kemampuan Akademik berbasis AI dengan diagnostic
                test, latihan adaptif, dan analisis kelemahan per topik.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                custom={3}
                className="mt-8 flex flex-col sm:flex-row gap-4"
              >
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold-dark text-white font-semibold text-base px-8 h-12 shadow-lg shadow-gold/25 hover:shadow-gold/40 transition-all"
                  onClick={() => navigateTo('register')}
                >
                  Mulai Gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white text-base px-8 h-12 bg-transparent"
                  onClick={() => {
                    document.querySelector('#fitur')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Lihat Demo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  custom={i + 4}
                  className="text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-gold">{stat.value}</div>
                  <div className="mt-1 text-sm text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right - Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Main card shape */}
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gold/20 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Diagnostic Test</div>
                    <div className="text-gray-400 text-xs">Menganalisis kemampuan siswa</div>
                  </div>
                </div>

                {/* Simulated radar chart */}
                <div className="relative mx-auto w-48 h-48">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Background rings */}
                    {[20, 40, 60, 80, 100].map((r) => (
                      <polygon
                        key={r}
                        points={`${100},${100 - r} ${100 + r * 0.95},${100 - r * 0.31} ${100 + r * 0.59},${100 + r * 0.81} ${100 - r * 0.59},${100 + r * 0.81} ${100 - r * 0.95},${100 - r * 0.31}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                      />
                    ))
                    }
                    {/* Data polygon */}
                    <polygon
                      points="100,25 175,72 140,165 60,165 25,72"
                      fill="rgba(212,160,23,0.15)"
                      stroke="#D4A017"
                      strokeWidth="2"
                    />
                    {/* Data points */}
                    {[
                      [100, 25],
                      [175, 72],
                      [140, 165],
                      [60, 165],
                      [25, 72],
                    ].map(([cx, cy], i) => (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="#D4A017"
                        stroke="white"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gold">78</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {['Matematika', 'Fisika', 'Bahasa', 'Biologi', 'Kimia', 'IPA'].map(
                    (subject, i) => (
                      <div key={subject} className="text-center">
                        <div className={`h-1.5 rounded-full ${i % 2 === 0 ? 'bg-gold' : 'bg-gold/40'} mb-1.5`}
                          style={{ width: `${60 + (i * 8)}%`, margin: '0 auto' }}
                        />
                        <span className="text-[10px] text-gray-400">{subject}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-gold rounded-2xl px-4 py-3 shadow-lg shadow-gold/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-white" />
                  <span className="text-white font-bold text-sm">+92%</span>
                </div>
                <p className="text-white/80 text-[10px] mt-0.5">Kenaikan skor</p>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gold" />
                  <span className="text-white font-bold text-sm">5.000+</span>
                </div>
                <p className="text-gray-400 text-[10px] mt-0.5">Siswa aktif</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Section (Bento Grid) ─────────────────────────────────────────

const features = [
  {
    icon: Stethoscope,
    title: 'Diagnostic Test Awal',
    description: 'Pemetaan kekuatan & kelemahan siswa secara mendalam di awal pembelajaran.',
    span: 'md:col-span-2',
    accent: 'from-navy/5 to-navy/10',
    iconBg: 'bg-navy/10',
    iconColor: 'text-navy',
  },
  {
    icon: Target,
    title: 'Latihan Adaptif',
    description: 'Soal menyesuaikan kemampuan siswa secara real-time berdasarkan performa.',
    span: 'md:col-span-1',
    accent: 'from-gold/5 to-gold/10',
    iconBg: 'bg-gold/10',
    iconColor: 'text-gold-dark',
  },
  {
    icon: BookOpen,
    title: 'Bank Soal HOTS',
    description: '10 mata uji lengkap, level C1-C6 untuk mengasah kemampuan berpikir tingkat tinggi.',
    span: 'md:col-span-1',
    accent: 'from-emerald-50 to-emerald-100/50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Timer,
    title: 'Tryout Berkala',
    description: 'Simulasi ujian lengkap dengan timer, fitur anti-nyontek, dan auto-submit.',
    span: 'md:col-span-2',
    accent: 'from-orange-50 to-orange-100/50',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    icon: BarChart3,
    title: 'Analisis Mendalam',
    description: 'Radar mapel, heatmap topik, dan insight untuk setiap siswa secara individual.',
    span: 'md:col-span-1',
    accent: 'from-violet-50 to-violet-100/50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: Trophy,
    title: 'Leaderboard Sehat',
    description: 'Motivasi siswa dengan peringkat tanpa tekanan berlebihan.',
    span: 'md:col-span-1',
    accent: 'from-rose-50 to-rose-100/50',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
];

function FeaturesSection() {
  return (
    <AnimatedSection id="fitur" className="py-20 md:py-28 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <Badge variant="secondary" className="bg-gold/10 text-gold-dark border-gold/20 mb-4">
            <Zap className="h-3.5 w-3.5 mr-1" />
            Fitur Unggulan
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            Semua yang sekolah Anda butuhkan
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Fitur lengkap untuk mempersiapkan siswa menghadapi Tes Kemampuan Akademik
            dengan pendekatan yang terukur dan personal.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={scaleIn} custom={i} className={feature.span}>
                <Card className={`h-full border-0 shadow-sm hover:shadow-md transition-shadow duration-300 bg-gradient-to-br ${feature.accent} overflow-hidden`}>
                  <CardHeader className="pb-3">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.iconBg} mb-2`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <CardTitle className="text-navy text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-gray-500 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── How It Works Section ───────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Diagnostic',
    description:
      'Siswa mengerjakan tes diagnostik awal. Sistem AI memetakan kekuatan dan kelemahan di setiap topik secara mendalam.',
    color: 'navy',
  },
  {
    number: '02',
    icon: Target,
    title: 'Drill & Practice',
    description:
      'Sistem menyusun latihan adaptif yang fokus ke topik lemah. Soal disesuaikan level kemampuan masing-masing siswa.',
    color: 'gold',
  },
  {
    number: '03',
    icon: BarChart2,
    title: 'Tryout & Evaluate',
    description:
      'Ukur progres berkala dengan tryout realistis. Dapatkan prediksi skor TKA dan rekomendasi perbaikan.',
    color: 'navy',
  },
];

function HowItWorksSection() {
  return (
    <AnimatedSection id="tentang" className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <Badge variant="secondary" className="bg-navy/5 text-navy border-navy/10 mb-4">
            <ChevronRight className="h-3.5 w-3.5 mr-1" />
            Cara Kerja
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            3 Langkah Menuju Skor TKA Terbaik
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Proses yang terstruktur dan terukur untuk memaksimalkan potensi setiap siswa.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.number} variants={fadeInUp} custom={i} className="relative">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-0.5 bg-gradient-to-r from-navy/20 to-gold/20" />
                )}

                <div className="text-center">
                  <div className="relative inline-flex mb-6">
                    <div
                      className={`h-24 w-24 rounded-2xl flex items-center justify-center shadow-lg ${
                        step.color === 'gold'
                          ? 'bg-gold/10 shadow-gold/10'
                          : 'bg-navy/5 shadow-navy/10'
                      }`}
                    >
                      <Icon
                        className={`h-10 w-10 ${
                          step.color === 'gold' ? 'text-gold' : 'text-navy'
                        }`}
                      />
                    </div>
                    <div
                      className={`absolute -top-2 -right-2 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        step.color === 'gold' ? 'bg-gold' : 'bg-navy'
                      }`}
                    >
                      {step.number}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-navy mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── Pricing Section ────────────────────────────────────────────────────────

const pricingPlans = [
  {
    name: 'Free',
    price: 'Rp 0',
    period: '/bulan',
    description: 'Cocok untuk mencoba platform sebelum berkomitmen.',
    highlighted: false,
    features: [
      { text: 'Hingga 50 siswa', included: true },
      { text: 'Diagnostic Test', included: true },
      { text: 'Bank Soal Global', included: true },
      { text: 'Laporan Dasar', included: true },
      { text: 'Tryout Berkala', included: false },
      { text: 'Analisis Butir Soal', included: false },
      { text: 'Laporan PDF', included: false },
    ],
  },
  {
    name: 'Starter',
    price: 'Rp 250.000',
    period: '/bulan',
    description: 'Ideal untuk sekolah dengan kebutuhan tryout rutin.',
    highlighted: false,
    features: [
      { text: 'Hingga 200 siswa', included: true },
      { text: 'Diagnostic Test', included: true },
      { text: 'Bank Soal Global', included: true },
      { text: 'Tryout Berkala', included: true },
      { text: 'Analisis Butir Soal', included: true },
      { text: 'Laporan Mendalam', included: true },
      { text: 'Laporan PDF', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 'Rp 500.000',
    period: '/bulan',
    description: 'Solusi lengkap untuk sekolah yang serius meningkatkan skor TKA.',
    highlighted: true,
    features: [
      { text: 'Siswa Unlimited', included: true },
      { text: 'Diagnostic Test', included: true },
      { text: 'Bank Soal Global + Privat', included: true },
      { text: 'Tryout Berkala', included: true },
      { text: 'Analisis Butir Soal', included: true },
      { text: 'Laporan Mendalam', included: true },
      { text: 'Laporan PDF Ekspor', included: true },
    ],
  },
];

function PricingSection() {
  const { navigateTo } = useAppStore();

  return (
    <AnimatedSection id="harga" className="py-20 md:py-28 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeInUp} className="text-center mb-16">
          <Badge variant="secondary" className="bg-gold/10 text-gold-dark border-gold/20 mb-4">
            <Flame className="h-3.5 w-3.5 mr-1" />
            Harga
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy tracking-tight">
            Pilih Paket yang Tepat
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Mulai gratis, upgrade kapan saja. Tanpa biaya tersembunyi.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start max-w-5xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <motion.div key={plan.name} variants={fadeInUp} custom={i}>
              <Card
                className={`relative h-full transition-shadow duration-300 hover:shadow-lg ${
                  plan.highlighted
                    ? 'border-2 border-gold shadow-lg shadow-gold/10 scale-105 md:scale-110'
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gold text-white border-0 px-4 py-1 shadow-md">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Paling Populer
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4 pt-8">
                  <CardTitle
                    className={`text-lg font-semibold ${
                      plan.highlighted ? 'text-gold-dark' : 'text-navy'
                    }`}
                  >
                    {plan.name}
                  </CardTitle>
                  <div className="mt-3">
                    <span
                      className={`text-4xl font-extrabold tracking-tight ${
                        plan.highlighted ? 'text-navy' : 'text-navy'
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="pt-0 pb-8">
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <div key={feature.text} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                            <Check className="h-3 w-3 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <X className="h-3 w-3 text-gray-300" />
                          </div>
                        )}
                        <span
                          className={`text-sm ${
                            feature.included ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full font-semibold h-11 ${
                      plan.highlighted
                        ? 'bg-gold hover:bg-gold-dark text-white shadow-md hover:shadow-lg'
                        : 'bg-navy hover:bg-navy-light text-white'
                    }`}
                    onClick={() => navigateTo('register')}
                  >
                    {plan.name === 'Free' ? 'Mulai Gratis' : `Pilih ${plan.name}`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────────────

function CTASection() {
  const { navigateTo } = useAppStore();

  return (
    <AnimatedSection className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeInUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy px-8 py-16 md:px-16 md:py-20 text-center"
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-gold/5 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 mb-6">
              <ShieldCheck className="h-7 w-7 text-gold" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Siap meningkatkan skor TKA{' '}
              <span className="text-gold">sekolah Anda?</span>
            </h2>
            <p className="mt-5 text-lg text-gray-300 max-w-xl mx-auto">
              Bergabung dengan 50+ sekolah yang sudah mempercayai PANDAI untuk persiapan TKA siswa mereka.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gold hover:bg-gold-dark text-white font-semibold text-base px-10 h-13 shadow-lg shadow-gold/25 hover:shadow-gold/40 transition-all"
                onClick={() => navigateTo('register')}
              >
                Daftar Sekolah Gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white text-base px-8 h-13 bg-transparent"
                onClick={() => navigateTo('login')}
              >
                Masuk ke Akun
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  const footerLinks = [
    { label: 'Tentang', href: '#tentang' },
    { label: 'Bantuan', href: '#' },
    { label: 'Kebijakan Privasi', href: '#' },
    { label: 'Syarat & Ketentuan', href: '#' },
  ];

  const handleLinkClick = (href: string) => {
    if (href === '#') return;
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-navy border-t border-navy-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <GraduationCap className="h-4 w-4 text-gold" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                PANDAI
              </span>
            </div>
            <p className="text-sm text-gray-400">
              by <span className="text-gold font-medium">NALAR</span>
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="text-sm text-gray-400 hover:text-gold transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PANDAI by NALAR. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Landing Page (Main Export) ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
