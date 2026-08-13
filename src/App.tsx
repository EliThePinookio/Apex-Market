import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Transaction, BusinessProfile, FinancialSummary, Customer } from './types';
import {
  subscribeProducts,
  subscribeCategories,
  subscribeTransactions,
  subscribeProfile,
  subscribeCustomers,
} from './services/dbService';
import { usePWA, registerServiceWorker } from './services/pwaService';
import { BackgroundCanvas, triggerCelebration } from './components/BackgroundCanvas';
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
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: 'Apex Retail & Supplies',
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

  // Subscribe to realtime Firebase Firestore
  useEffect(() => {
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
    };
  }, []);

  // Auto hide notification toast after 3 seconds
  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    triggerCelebration();
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

    transactions.forEach((t) => {
      if (t.type === 'sale') {
        totalRevenue += t.amount || 0;
        totalCOGS += t.cogs || 0;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount || 0;
      } else if (t.type === 'capital') {
        totalCapital += t.amount || 0;
      }
    });

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    let totalInventoryValuation = 0;
    let totalPotentialRevenue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalInventoryValuation += p.buyPrice * p.stockQuantity;
      totalPotentialRevenue += p.sellPrice * p.stockQuantity;
      if (p.stockQuantity <= p.minStockThreshold && p.stockQuantity > 0) {
        lowStockCount++;
      }
      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      }
    });

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
  }, [products, transactions]);

  // Tab Navigation Guard (PIN Protection)
  const handleTabChange = (tab: NavTab) => {
    if (
      profile.isPinLocked &&
      !isOwnerUnlocked &&
      (tab === 'analytics' || tab === 'settings')
    ) {
      setIsPinModalOpen(true);
      return;
    }
    if (tab !== 'inventory') {
      setInventoryLowStockFilter(false);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLowStock = () => {
    setInventoryLowStockFilter(true);
    setActiveTab('inventory');
  };

  return (
    <div className="relative min-h-screen bg-transparent text-slate-900 flex font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Background Active Light Canvas */}
      <BackgroundCanvas activeTab={activeTab} />

      {/* Desktop Sidebar */}
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
          if (isOwnerUnlocked) setIsOwnerUnlocked(false);
          else setIsPinModalOpen(true);
        }}
        onNavigateToLowStock={handleNavigateToLowStock}
      />

      {/* Main Layout Container */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen min-w-0">
        {/* App Header Bar */}
        <Header
          profile={profile}
          isOnline={isOnline}
          lowStockCount={summary.lowStockCount}
          isOwnerUnlocked={isOwnerUnlocked}
          onToggleOwnerLock={() => {
            if (isOwnerUnlocked) setIsOwnerUnlocked(false);
            else setIsPinModalOpen(true);
          }}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onNavigateToLowStock={handleNavigateToLowStock}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 md:py-6 pb-24 md:pb-12 overflow-x-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6, scale: 0.994 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.994 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  summary={summary}
                  profile={profile}
                  products={products}
                  transactions={transactions}
                  onNavigateToPOS={() => setActiveTab('pos')}
                  onNavigateToInventory={(filterLow) => {
                    setInventoryLowStockFilter(!!filterLow);
                    setActiveTab('inventory');
                  }}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToAnalytics={() => handleTabChange('analytics')}
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
                  profile={profile}
                  summary={summary}
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
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white/95 border border-emerald-300 text-emerald-900 px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/10 backdrop-blur-md flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}


