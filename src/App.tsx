import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Transaction, BusinessProfile, FinancialSummary, Customer } from './types';
import {
  subscribeProducts,
  subscribeCategories,
  subscribeTransactions,
  subscribeProfile,
  subscribeCustomers,
  loadAuthorizedBusinessData,
  cleanupSupabaseRealtime,
} from './services/dbService';
import { usePWA, registerServiceWorker } from './services/pwaService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { TransactionsView } from './components/TransactionsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { QuickActionModal } from './components/QuickActionModal';
import { PinModal } from './components/PinModal';
import { CommandPalette } from './components/CommandPalette';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { CheckCircle2, Loader2, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { user, isLoading } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: 'BEANNEL',
    ownerName: 'Alex Owner',
    currencySymbol: '$',
    ownerPin: '1234',
    isPinLocked: false,
    taxRate: 0,
    lowStockAlertEnabled: true,
    allowNegativeStock: false,
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [inventoryLowStockFilter, setInventoryLowStockFilter] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Global CMD+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PWA Hook & SW registration
  const { canInstall, isInstalled, isOnline, isIOS, isAndroid, triggerInstall } = usePWA();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Subscribe to realtime Supabase PostgreSQL and local cache
  useEffect(() => {
    if (user) {
      loadAuthorizedBusinessData();
    }
    const unsubProd = subscribeProducts(setProducts);
    const unsubCat = subscribeCategories(setCategories);
    const unsubTx = subscribeTransactions(setTransactions);
    const unsubProf = subscribeProfile(setProfile);
    const unsubCust = subscribeCustomers(setCustomers);

    return () => {
      unsubProd();
      unsubCat();
      unsubTx();
      unsubProf();
      unsubCust();
      cleanupSupabaseRealtime();
    };
  }, [user]);

  // Auto hide notification toast after 3 seconds
  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3200);
  };

  // Financial calculations
  const summary: FinancialSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    let totalCapital = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'sale') {
        totalRevenue += tx.amount || 0;
        totalCOGS += tx.cogs || 0;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount || 0;
      } else if (tx.type === 'capital') {
        totalCapital += tx.amount || 0;
      }
    });

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;
    const totalInventoryValuation = products.reduce((acc, p) => acc + p.buyPrice * p.stockQuantity, 0);
    const totalPotentialRevenue = products.reduce((acc, p) => acc + p.sellPrice * p.stockQuantity, 0);
    const lowStockCount = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      totalCapital,
      totalInventoryValuation,
      totalPotentialRevenue,
      lowStockCount,
      outOfStockCount,
      transactionCount: transactions.length,
    };
  }, [transactions, products]);

  // Handle Tab change with security lock checks for owner-sensitive views
  const handleTabChange = (tab: NavTab) => {
    if ((tab === 'analytics' || tab === 'settings') && profile.isPinLocked && !isOwnerUnlocked) {
      setIsPinModalOpen(true);
      return;
    }
    setInventoryLowStockFilter(false);
    setActiveTab(tab);
  };

  const handleNavigateToLowStock = () => {
    setInventoryLowStockFilter(true);
    setActiveTab('inventory');
  };

  // If Supabase Auth is loading session
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#000000] text-slate-900 dark:text-slate-100 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-pulse">
          <Store className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-bold">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Connecting to Supabase Database...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, show Supabase Auth Screen
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="relative min-h-screen w-full flex bg-[#F2F2F7] dark:bg-[#000000] text-slate-900 dark:text-slate-100">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        profile={profile}
        isOnline={isOnline}
        lowStockCount={summary.lowStockCount}
        isOwnerUnlocked={isOwnerUnlocked}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleOwnerLock={() => {
          if (isOwnerUnlocked) {
            setIsOwnerUnlocked(false);
            showNotification('Owner Mode Locked');
          } else {
            setIsPinModalOpen(true);
          }
        }}
        onNavigateToLowStock={handleNavigateToLowStock}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Sticky App Header */}
        <Header
          profile={profile}
          isOnline={isOnline}
          lowStockCount={summary.lowStockCount}
          isOwnerUnlocked={isOwnerUnlocked}
          onToggleOwnerLock={() => {
            if (isOwnerUnlocked) {
              setIsOwnerUnlocked(false);
              showNotification('Owner Mode Locked');
            } else {
              setIsPinModalOpen(true);
            }
          }}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onNavigateToLowStock={handleNavigateToLowStock}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Dynamic Main Viewport with Smooth Motion Transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  products={products}
                  transactions={transactions}
                  customers={customers}
                  profile={profile}
                  summary={summary}
                  onNavigateToPOS={() => setActiveTab('pos')}
                  onNavigateToInventory={(filterLowStock) => {
                    if (filterLowStock) setInventoryLowStockFilter(true);
                    setActiveTab('inventory');
                  }}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToAnalytics={() => setActiveTab('analytics')}
                  onOpenQuickAction={() => setIsQuickActionOpen(true)}
                />
              )}

              {activeTab === 'pos' && (
                <POSView
                  products={products}
                  categories={categories}
                  profile={profile}
                  onSaleComplete={(msg) => showNotification(msg)}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryView
                  products={products}
                  categories={categories}
                  profile={profile}
                  initialFilterLowStock={inventoryLowStockFilter}
                  onNotification={(msg) => showNotification(msg)}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  products={products}
                  profile={profile}
                  summary={summary}
                  onNotification={(msg) => showNotification(msg)}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  transactions={transactions}
                  products={products}
                  categories={categories}
                  profile={profile}
                  summary={summary}
                  onNavigateToPOS={() => setActiveTab('pos')}
                  onNavigateToInventory={(filterLowStock) => {
                    if (filterLowStock) setInventoryLowStockFilter(true);
                    setActiveTab('inventory');
                  }}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView
                  customers={customers}
                  transactions={transactions}
                  products={products}
                  profile={profile}
                  onNavigateToPOS={() => setActiveTab('pos')}
                  onNotification={(msg) => showNotification(msg)}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  profile={profile}
                  isOwnerUnlocked={isOwnerUnlocked}
                  onLockOwner={() => setIsOwnerUnlocked(false)}
                  onUnlockOwnerRequest={() => setIsPinModalOpen(true)}
                  canInstallPwa={canInstall}
                  isPwaInstalled={isInstalled}
                  isIOS={isIOS}
                  isAndroid={isAndroid}
                  onInstallPwa={triggerInstall}
                  onNotification={(msg) => showNotification(msg)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          lowStockCount={summary.lowStockCount}
        />

        {/* Modals & Toasts */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          products={products}
          profile={profile}
          isOwnerUnlocked={isOwnerUnlocked}
          onSelectTab={handleTabChange}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onToggleOwnerLock={() => {
            if (isOwnerUnlocked) setIsOwnerUnlocked(false);
            else setIsPinModalOpen(true);
          }}
        />

        <QuickActionModal
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
          products={products}
          profile={profile}
          onSuccess={(msg) => showNotification(msg)}
        />

        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          correctPin={profile.ownerPin || '1234'}
          onSuccess={() => {
            setIsOwnerUnlocked(true);
            showNotification('Owner Mode Unlocked');
          }}
        />

        {/* Floating Notification Toast */}
        {notificationMsg && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-[#1C1C1E]/95 border border-black/[0.08] dark:border-white/[0.1] text-slate-900 dark:text-white px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
