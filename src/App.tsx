import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, Transaction, BusinessProfile, FinancialSummary } from './types';
import {
  subscribeProducts,
  subscribeCategories,
  subscribeTransactions,
  subscribeProfile,
} from './services/dbService';
import { usePWA, registerServiceWorker } from './services/pwaService';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { TransactionsView } from './components/TransactionsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { QuickActionModal } from './components/QuickActionModal';
import { PinModal } from './components/PinModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
  const [inventoryLowStockFilter, setInventoryLowStockFilter] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // PWA Hook & SW registration
  const { canInstall, isInstalled, isOnline, triggerInstall } = usePWA();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Subscribe to realtime Firebase Firestore
  useEffect(() => {
    const unsubProd = subscribeProducts(setProducts);
    const unsubCat = subscribeCategories(setCategories);
    const unsubTx = subscribeTransactions(setTransactions);
    const unsubProf = subscribeProfile(setProfile);

    return () => {
      unsubProd();
      unsubCat();
      unsubTx();
      unsubProf();
    };
  }, []);

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
    <div className="relative min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black pb-16 overflow-x-hidden">
      {/* Background Active Floating Light Orbs Canvas */}
      <BackgroundCanvas />

      {/* Main Container Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
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
        />

        {/* Main View Area */}
        <main className="flex-1 max-w-xl w-full mx-auto">
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

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              isOwnerUnlocked={isOwnerUnlocked}
              onLockOwner={() => setIsOwnerUnlocked(false)}
              onUnlockOwnerRequest={() => setIsPinModalOpen(true)}
              canInstallPwa={canInstall}
              isPwaInstalled={isInstalled}
              onInstallPwa={triggerInstall}
              onNotification={(msg) => showNotification(msg)}
            />
          )}
        </main>

        {/* Floating Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          lowStockCount={summary.lowStockCount}
        />

        {/* Modals & Toasts */}
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
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0F172A]/90 border border-emerald-400/50 text-emerald-300 px-5 py-3 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] backdrop-blur-xl flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

