
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Plus, 
  PieChart, 
  Settings, 
  Target,
  ChevronRight,
  AlertCircle,
  History,
  CreditCard, 
  User,
  LogOut,
  Bell,
  Search,
  ArrowUpRight,
  ShoppingBag,
  Check,
  Zap,
  Star,
  Download,
  ShieldCheck,
  Sparkles,
  Edit3,
  BrainCircuit
} from 'lucide-react';
import { 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

// --- Types & Config ---
declare global {
  interface Window {
    Telegram?: any;
  }
}

interface UserProfile {
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

interface AppSettings {
  currency: 'RUB' | 'USD';
  monthlyIncome: number;
  paydayDay: number;
}

const CATEGORIES = [
  { id: 'food', name: 'Еда', emoji: '🍕', color: '#f87171' },
  { id: 'transport', name: 'Транспорт', emoji: '🚌', color: '#60a5fa' },
  { id: 'home', name: 'Дом', emoji: '🏠', color: '#fbbf24' },
  { id: 'subs', name: 'Подписки', emoji: '📺', color: '#a78bfa' },
  { id: 'kids', name: 'Дети', emoji: '🧸', color: '#f472b6' },
  { id: 'health', name: 'Здоровье', emoji: '💊', color: '#34d399' },
  { id: 'cafe', name: 'Кафе', emoji: '☕', color: '#fb923c' },
  { id: 'taxi', name: 'Такси', emoji: '🚕', color: '#facc15' },
  { id: 'entertainment', name: 'Развлечения', emoji: '🎮', color: '#818cf8' },
  { id: 'gifts', name: 'Подарки', emoji: '🎁', color: '#fb7185' },
  { id: 'travel', name: 'Путешествия', emoji: '✈️', color: '#2dd4bf' },
  { id: 'other', name: 'Прочее', emoji: '📦', color: '#94a3b8' },
];

// --- Reusable Components ---

const Card = ({ children, className = "", onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 dark:border-zinc-800/50 ${className}`}
  >
    {children}
  </div>
);

const BigNumberCard = ({ title, value, subtitle, highlight = false }: any) => (
  <Card className={highlight ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-none" : ""}>
    <p className={`text-xs font-semibold uppercase tracking-widest opacity-60 mb-2`}>{title}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-4xl font-bold tracking-tight">{value}</span>
      {subtitle && <span className="text-sm font-medium opacity-50">{subtitle}</span>}
    </div>
  </Card>
);

const NavItem = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 gap-1.5 transition-all duration-300 ${active ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60'}`}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-bold tracking-tight ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

const Modal = ({ isOpen, onClose, title, children, dark = false }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/70 backdrop-blur-md transition-opacity duration-300">
      <div className={`${dark ? 'bg-zinc-950 text-white' : 'bg-white dark:bg-zinc-900'} w-full max-w-xl rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 fill-mode-forwards max-h-[95vh] overflow-y-auto`}>
        <div className={`w-12 h-1.5 ${dark ? 'bg-zinc-800' : 'bg-slate-200 dark:bg-zinc-800'} rounded-full mx-auto mb-8 cursor-pointer`} onClick={onClose} />
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <button onClick={onClose} className={`w-10 h-10 rounded-full ${dark ? 'bg-zinc-900' : 'bg-slate-100 dark:bg-zinc-800'} flex items-center justify-center active:scale-90 transition-transform`}>
            <Plus className="rotate-45" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'RUB',
    monthlyIncome: 85000,
    paydayDay: 1
  });

  // User State
  const [user, setUser] = useState<UserProfile>({ firstName: 'Александр' });

  // Modal States
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [isEditingSettings, setIsEditingSettings] = useState<'currency' | 'income' | 'payday' | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  
  // Expenses State
  const [expenses, setExpenses] = useState([
    { name: 'ВкусВилл', cat: 'food', amount: 1240, time: '14:20', date: new Date() },
    { name: 'Яндекс Такси', cat: 'taxi', amount: 450, time: '12:05', date: new Date() },
    { name: 'Starbucks', cat: 'cafe', amount: 380, time: '10:15', date: new Date() }
  ]);

  // AI State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        tg.headerColor = '#f8fafc';
        
        // Sync Profile with TG
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          setUser({
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            photoUrl: tgUser.photo_url
          });
        }
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Helper for Currency
  const formatValue = (val: number) => {
    return `${val.toLocaleString()} ${settings.currency === 'RUB' ? '₽' : '$'}`;
  };

  const getPremiumPrice = () => {
    return settings.currency === 'RUB' ? '299 ₽' : '$4.99';
  };

  // --- Dynamic Calculations ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let nextPayday = new Date(currentYear, currentMonth, settings.paydayDay);
    if (now.getDate() >= settings.paydayDay) {
      nextPayday = new Date(currentYear, currentMonth + 1, settings.paydayDay);
    }
    
    const diffTime = nextPayday.getTime() - now.getTime();
    const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalSpentThisMonth = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const remainingBudget = Math.max(0, settings.monthlyIncome - totalSpentThisMonth);
    const dailyLimit = remainingBudget / daysRemaining;
    const spentToday = expenses
      .filter(e => e.date.toDateString() === now.toDateString())
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Group by category for charts
    const chartData = CATEGORIES.map(cat => {
      const total = expenses
        .filter(e => e.cat === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return { name: cat.name, value: total, color: cat.color };
    }).filter(d => d.value > 0);

    return {
      daysRemaining,
      dailyLimit,
      spentToday,
      totalSpentThisMonth,
      chartData
    };
  }, [settings, expenses]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(formData.get('amount'));
    const note = formData.get('note') as string;
    
    if (amount > 0) {
      const categoryObj = CATEGORIES.find(c => c.id === selectedCategory);
      const newExp = {
        name: note || categoryObj?.name || 'Расход',
        cat: selectedCategory,
        amount,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date()
      };
      setExpenses([newExp, ...expenses]);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      setIsAddingExpense(false);
      setSelectedCategory(CATEGORIES[0].id); // Reset for next time
    }
  };

  const fetchAIAdvice = async () => {
    setLoadingAdvice(true);
    try {
      // Logic for fetching advice from AI endpoint
      // Mocking the call for UX purposes while assuming backend is ready
      await new Promise(r => setTimeout(r, 2000));
      const mockAdvice = "💡 Анализ твоих трат показывает, что 30% бюджета уходит на 'Кафе'. Если сократить эти расходы вдвое, ты сможешь сэкономить около 5000₽ к следующей зарплате!";
      setAiAdvice(mockAdvice);
    } catch (err) {
      setAiAdvice("Не удалось получить совет. Попробуйте позже.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handlePayment = () => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    alert(`Инициализация оплаты: ${getPremiumPrice()}`);
    setIsPremiumModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-zinc-950">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wallet size={24} className="text-blue-500" />
          </div>
        </div>
        <p className="mt-6 text-sm font-bold tracking-widest uppercase opacity-40 animate-pulse text-center px-6">Где мои деньги?...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-slate-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="Avatar" className="w-12 h-12 rounded-[1.25rem] object-cover shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <User size={24} strokeWidth={2.5} />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-4 border-slate-50 dark:border-zinc-950"></div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Где мои деньги?...</p>
            <p className="text-lg font-black tracking-tight">{user.firstName} {user.lastName || ''}</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('profile')} className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
          <Settings size={20} />
        </button>
      </header>

      <main className="px-6 flex-1 space-y-8 max-w-xl mx-auto w-full">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <BigNumberCard 
              title="Лимит на сегодня" 
              value={formatValue(stats.dailyLimit)} 
              subtitle="доступно" 
              highlight 
            />
            
            <div className="grid grid-cols-2 gap-5">
              <BigNumberCard title="До зарплаты" value={stats.daysRemaining} subtitle="дн." />
              <BigNumberCard title="Потрачено" value={formatValue(stats.spentToday)} />
            </div>

            <Card className="relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-sm uppercase tracking-widest opacity-40">Месячный бюджет</h3>
                <span className="text-xs font-black text-blue-500">{((stats.totalSpentThisMonth / settings.monthlyIncome) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                  style={{ width: `${Math.min(100, (stats.totalSpentThisMonth / settings.monthlyIncome * 100))}%` }}
                ></div>
              </div>
              <div className="mt-5 flex justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Расход</p>
                  <p className="text-lg font-black tracking-tight">{formatValue(stats.totalSpentThisMonth)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Доход</p>
                  <p className="text-lg font-black tracking-tight text-slate-400">{formatValue(settings.monthlyIncome)}</p>
                </div>
              </div>
            </Card>

            <button 
              onClick={() => setIsAddingExpense(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-500/40 flex items-center justify-center gap-3 transition-all active:scale-[0.96] active:shadow-lg"
            >
              <Plus size={24} strokeWidth={3} />
              <span className="text-lg tracking-tight">Добавить расход</span>
            </button>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black tracking-tight">История</h2>
            <div className="space-y-3">
              {expenses.map((item, i) => (
                <Card key={i} className="flex justify-between items-center py-4 px-6">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-inner">
                      {CATEGORIES.find(c => c.id === item.cat)?.emoji || '📦'}
                    </div>
                    <div>
                      <p className="font-black tracking-tight">{item.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">{item.time} • {CATEGORIES.find(c => c.id === item.cat)?.name || 'Прочее'}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black tracking-tighter">-{formatValue(item.amount)}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black tracking-tight">Аналитика</h2>
            
            {/* AI Advisor Card */}
            <Card className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-none relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <BrainCircuit size={20} className="text-white" />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest opacity-80">ИИ Советник Gemini</h3>
                </div>
                
                {aiAdvice ? (
                  <div className="animate-in fade-in duration-500 space-y-4">
                    <p className="text-sm font-bold leading-relaxed">{aiAdvice}</p>
                    <button 
                      onClick={() => setAiAdvice(null)} 
                      className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <ArrowUpRight size={12} />
                      Обновить анализ
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={fetchAIAdvice}
                    disabled={loadingAdvice}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-[1.5rem] border border-white/20 font-black text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {loadingAdvice ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {loadingAdvice ? 'Анализирую траты...' : 'Как сэкономить?'}
                  </button>
                )}
              </div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
            </Card>

            {/* Category Chart Card */}
            <Card className="flex flex-col items-center">
              <div className="flex justify-between w-full mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest opacity-40">Траты по категориям</h3>
                <PieChart size={18} className="opacity-20" />
              </div>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={stats.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full mt-4">
                {stats.chartData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-xs font-bold opacity-60 truncate max-w-[80px]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-black">{formatValue(cat.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-10">
            <h2 className="text-3xl font-black tracking-tight">Настройки</h2>
            
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 ml-4 mb-2">Общие</p>
              <Card className="p-2 space-y-1">
                <button 
                  onClick={() => setIsEditingSettings('currency')}
                  className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                      <CreditCard size={20} />
                    </div>
                    <p className="text-sm font-bold tracking-tight">Валюта</p>
                  </div>
                  <p className="text-sm font-black text-blue-600 flex items-center gap-2">
                    {settings.currency} ({settings.currency === 'RUB' ? '₽' : '$'})
                    <ChevronRight size={16} />
                  </p>
                </button>

                <button 
                  onClick={() => setIsEditingSettings('income')}
                  className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                      <Wallet size={20} />
                    </div>
                    <p className="text-sm font-bold tracking-tight">Доход в месяц</p>
                  </div>
                  <p className="text-sm font-black text-blue-600 flex items-center gap-2">
                    {formatValue(settings.monthlyIncome)}
                    <ChevronRight size={16} />
                  </p>
                </button>

                <button 
                  onClick={() => setIsEditingSettings('payday')}
                  className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                      <Bell size={20} />
                    </div>
                    <p className="text-sm font-bold tracking-tight">День зарплаты</p>
                  </div>
                  <p className="text-sm font-black text-blue-600 flex items-center gap-2">
                    {settings.paydayDay}-е число
                    <ChevronRight size={16} />
                  </p>
                </button>
              </Card>
            </div>

            <Card 
              onClick={() => setIsPremiumModalOpen(true)}
              className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-none relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter">Premium</h3>
                    <p className="text-sm opacity-60 font-medium mt-1">Безлимитные цели и история</p>
                  </div>
                  <div className="bg-blue-500 p-3 rounded-2xl shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <Sparkles size={24} strokeWidth={3} className="text-white" />
                  </div>
                </div>
                <div className="w-full bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white font-black py-5 rounded-3xl shadow-lg flex items-center justify-center gap-2">
                  <span>Подробнее</span>
                  <ChevronRight size={20} />
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
            </Card>

            <button className="w-full py-6 text-red-500 font-black text-xs uppercase tracking-[0.2em] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[2rem] flex items-center justify-center gap-2">
              <LogOut size={16} strokeWidth={3} />
              Сбросить данные
            </button>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 dark:border-zinc-800/50 px-6 flex justify-between items-center z-50">
        <NavItem active={activeTab === 'home'} icon={Wallet} label="Главная" onClick={() => setActiveTab('home')} />
        <NavItem active={activeTab === 'expenses'} icon={History} label="История" onClick={() => setActiveTab('expenses')} />
        <div className="relative -top-8">
          <button 
            onClick={() => setIsAddingExpense(true)}
            className="w-16 h-16 rounded-[1.75rem] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>
        <NavItem active={activeTab === 'analytics'} icon={PieChart} label="Отчеты" onClick={() => setActiveTab('analytics')} />
        <NavItem active={activeTab === 'profile'} icon={Settings} label="Меню" onClick={() => setActiveTab('profile')} />
      </nav>

      {/* Modal: New Expense */}
      <Modal 
        isOpen={isAddingExpense} 
        onClose={() => setIsAddingExpense(false)} 
        title="Новый расход"
      >
        <form onSubmit={handleAddExpense} className="space-y-8 pb-4">
          {/* Amount Input */}
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4">Сколько вы потратили?</p>
            <div className="relative inline-block w-full">
              <input 
                autoFocus
                name="amount"
                type="number" 
                step="0.01" 
                placeholder="0"
                className="w-full bg-transparent border-none text-center text-7xl font-black tracking-tighter focus:ring-0 placeholder:text-slate-100 dark:placeholder:text-zinc-800"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">{settings.currency === 'RUB' ? '₽' : '$'}</span>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Категория</p>
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">{CATEGORIES.find(c => c.id === selectedCategory)?.name}</p>
            </div>
            <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                  }}
                  className={`aspect-square rounded-[1.75rem] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-400'}`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className={`text-[10px] font-black tracking-tighter truncate w-full px-1 text-center ${selectedCategory === cat.id ? 'opacity-100' : 'opacity-40'}`}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-3xl px-6 py-4 flex items-center gap-4">
            <Edit3 size={18} className="text-slate-400 flex-shrink-0" />
            <input 
              name="note"
              type="text"
              placeholder="Что купили? (необязательно)"
              className="bg-transparent border-none w-full text-sm font-bold focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-zinc-700"
            />
          </div>

          <button type="submit" className="w-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black py-6 rounded-3xl shadow-xl transition-all active:scale-[0.98] mt-4">
            Подтвердить расход
          </button>
        </form>
      </Modal>

      {/* Modal: Premium Details */}
      <Modal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        title="Premium Тариф"
        dark
      >
        <div className="space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-500/40">
              <Star size={40} className="text-white fill-white/20" />
            </div>
            <p className="text-sm font-medium opacity-60">Разблокируйте все возможности</p>
          </div>

          <div className="space-y-5">
            {[
              { icon: Target, label: 'Финансовые цели', desc: 'Копите на отпуск или новый гаджет с наглядным прогрессом.' },
              { icon: History, label: 'Безлимитная история', desc: 'Просматривайте все свои траты за любой период без ограничений.' },
              { icon: PieChart, label: 'Глубокая аналитика', desc: 'Детализированные отчеты по всем категориям и привычкам.' },
              { icon: Download, label: 'Экспорт данных', desc: 'Выгружайте историю трат в CSV или PDF для личного учета.' },
              { icon: ShieldCheck, label: 'Безопасность и темы', desc: 'Дополнительная защита и кастомные темы интерфейса.' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 items-start animate-in fade-in slide-in-from-right duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center flex-shrink-0">
                  <feature.icon size={20} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{feature.label}</h4>
                  <p className="text-xs opacity-50 mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <button 
              onClick={handlePayment}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-3xl shadow-2xl shadow-blue-500/30 flex flex-col items-center justify-center transition-all active:scale-[0.98]"
            >
              <span className="text-lg">Оплатить {getPremiumPrice()}</span>
              <span className="text-[10px] uppercase tracking-widest opacity-60 mt-0.5">Единоразовый платеж</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Settings Edits (Currency, Income, Payday) */}
      <Modal 
        isOpen={isEditingSettings !== null} 
        onClose={() => setIsEditingSettings(null)} 
        title={
          isEditingSettings === 'currency' ? 'Выбор валюты' :
          isEditingSettings === 'income' ? 'Ваш доход' : 'День зарплаты'
        }
      >
        <div className="space-y-4">
          {isEditingSettings === 'currency' && (
            <div className="grid grid-cols-1 gap-3">
              {['RUB', 'USD'].map(curr => (
                <button 
                  key={curr}
                  onClick={() => {
                    setSettings({ ...settings, currency: curr as any });
                    setIsEditingSettings(null);
                  }}
                  className={`flex items-center justify-between p-6 rounded-3xl transition-all ${settings.currency === curr ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-zinc-800'}`}
                >
                  <span className="text-xl font-black">{curr === 'RUB' ? 'Рубль (₽)' : 'Доллар ($)'}</span>
                  {settings.currency === curr && <Check size={24} strokeWidth={4} />}
                </button>
              ))}
            </div>
          )}

          {isEditingSettings === 'income' && (
            <div className="space-y-6">
              <input 
                autoFocus
                type="number"
                defaultValue={settings.monthlyIncome}
                onChange={(e) => setSettings({ ...settings, monthlyIncome: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-zinc-800 border-none p-6 rounded-3xl text-3xl font-black text-center focus:ring-2 ring-blue-500"
              />
              <button 
                onClick={() => setIsEditingSettings(null)}
                className="w-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black py-6 rounded-3xl"
              >
                Сохранить
              </button>
            </div>
          )}

          {isEditingSettings === 'payday' && (
            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button 
                  key={day}
                  onClick={() => {
                    setSettings({ ...settings, paydayDay: day });
                    setIsEditingSettings(null);
                  }}
                  className={`aspect-square rounded-2xl flex items-center justify-center font-black transition-all ${settings.paydayDay === day ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-zinc-800'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
