import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  Award,
  ArrowUpRight,
  ChevronRight,
  X,
  CreditCard,
  DollarSign,
  TrendingUp,
  Star,
  Receipt,
  UserCheck,
  CheckCircle2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Transaction, BusinessProfile, Customer } from '../types';
import { AnimatedNumber } from './AnimatedNumber';
import { TiltCard } from './TiltCard';
import { saveCustomer, deleteCustomer, settleCustomerDebt } from '../services/dbService';

interface CustomersViewProps {
  customers: Customer[];
  transactions: Transaction[];
  products: Product[];
  profile: BusinessProfile;
  onNavigateToPOS: () => void;
  onNotification: (msg: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  transactions,
  profile,
  onNavigateToPOS,
  onNotification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // New Customer Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  const cur = profile.currencySymbol;

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === 'all' || c.tier.toLowerCase() === selectedTier.toLowerCase();
    return matchesSearch && matchesTier;
  });

  const totalSpentAll = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const totalDebtAll = customers.reduce((acc, c) => acc + c.debtBalance, 0);
  const vipCount = customers.filter((c) => c.tier === 'VIP' || c.tier === 'Gold').length;
  const avgLoyaltyPoints = customers.length > 0 ? Math.round(customers.reduce((a, b) => a + b.loyaltyPoints, 0) / customers.length) : 0;

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || isAddingCustomer) return;

    setIsAddingCustomer(true);
    try {
      await saveCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || 'N/A',
        email: newEmail.trim() || 'N/A',
        loyaltyPoints: 50, // Welcome points
        debtBalance: parseFloat(initialDebt) || 0,
        tier: 'Bronze',
        lastVisit: 'Just created',
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setInitialDebt('');
      onNotification(`Added customer "${newName.trim()}" (+50 welcome points)`);
    } catch (err: any) {
      console.error('Error adding customer:', err);
      alert('Failed to add customer');
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleSettleDebt = async (custId: string) => {
    await settleCustomerDebt(custId);
    if (selectedCustomer?.id === custId) {
      setSelectedCustomer((prev) => (prev ? { ...prev, debtBalance: 0 } : null));
    }
    onNotification('Customer debt balance cleared successfully');
  };

  const handleDeleteCustomer = async (custId: string, custName: string) => {
    if (confirm(`Delete customer "${custName}" permanently?`)) {
      await deleteCustomer(custId);
      if (selectedCustomer?.id === custId) setSelectedCustomer(null);
      onNotification(`Deleted customer "${custName}"`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Light & Friendly Customer Atmospheric Hero Bar */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[11px] font-bold tracking-wide uppercase mb-2">
              <Users className="w-3.5 h-3.5 text-teal-300" />
              <span>Customer Relationship Management (CRM)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Directory & Loyalty Rewards
            </h1>
            <p className="text-xs text-teal-200/80 mt-1 max-w-xl font-medium">
              Track customer purchase velocity, store credit accounts, loyalty reward points, and profile details.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-teal-400/20 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Customer</span>
          </motion.button>
        </div>
      </div>

      {/* CRM Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>Total Customers</span>
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              <AnimatedNumber value={customers.length} format={(v) => Math.round(v).toString()} />
            </div>
            <p className="text-[10px] text-teal-700 font-bold mt-1">{vipCount} VIP/Gold Tier</p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>Lifetime Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {cur}<AnimatedNumber value={totalSpentAll} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Across all profiles</p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>Outstanding Debt</span>
              <CreditCard className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {cur}<AnimatedNumber value={totalDebtAll} />
            </div>
            <p className="text-[10px] text-rose-600 font-bold mt-1">Store Credit Tab</p>
          </div>
        </TiltCard>

        <TiltCard className="rounded-2xl">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
              <span>Avg Loyalty Points</span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              <AnimatedNumber value={avgLoyaltyPoints} format={(v) => Math.round(v).toString()} /> pts
            </div>
            <p className="text-[10px] text-amber-700 font-bold mt-1">Active Rewards</p>
          </div>
        </TiltCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'VIP', 'Gold', 'Silver', 'Bronze'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                selectedTier === tier
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Cards Grid / Empty States */}
      {filteredCustomers.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {customers.length === 0 ? 'Your CRM is ready' : 'No matching customers found'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {customers.length === 0
                ? 'No customers have been added yet.'
                : 'Try adjusting your search query or tier filter.'}
            </p>
          </div>
          {customers.length === 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs inline-flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <motion.div
              key={cust.id}
              whileHover={{ y: -3 }}
              onClick={() => setSelectedCustomer(cust)}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 shadow-2xs transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-base border border-teal-200 shadow-xs">
                    {cust.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{cust.name}</h3>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{cust.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      cust.tier === 'VIP'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : cust.tier === 'Gold'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : cust.tier === 'Silver'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {cust.tier} Tier
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustomer(cust.id, cust.name);
                    }}
                    title="Delete Customer"
                    className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Spent</span>
                  <span className="text-xs font-black text-slate-900 font-mono">{cur}{cust.totalSpent.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Orders</span>
                  <span className="text-xs font-black text-teal-700 font-mono">{cust.orderCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Points</span>
                  <span className="text-xs font-black text-amber-700 font-mono">{cust.loyaltyPoints}</span>
                </div>
              </div>

              {cust.debtBalance > 0 && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
                  <span>Tab Debt: {cur}{cust.debtBalance.toFixed(2)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSettleDebt(cust.id);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-black text-[10px] hover:bg-rose-700"
                  >
                    Clear Debt
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Last visit: {cust.lastVisit}</span>
                <span className="text-teal-700 font-bold flex items-center space-x-1 group-hover:underline">
                  <span>Profile & Logs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Customer Detail Drawer Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-900 font-black flex items-center justify-center text-xl border border-teal-200 shadow-sm">
                    {selectedCustomer.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                    <p className="text-xs text-slate-500 font-medium">{selectedCustomer.phone} • {selectedCustomer.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-800 uppercase">Lifetime Spent</span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{cur}{selectedCustomer.totalSpent.toFixed(2)}</div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Reward Points</span>
                  <div className="text-xl font-black text-amber-900 font-mono mt-0.5">{selectedCustomer.loyaltyPoints} pts</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      onNavigateToPOS();
                    }}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Create POS Order</span>
                  </button>

                  {selectedCustomer.debtBalance > 0 ? (
                    <button
                      onClick={() => handleSettleDebt(selectedCustomer.id)}
                      className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Settle Debt ({cur}{selectedCustomer.debtBalance})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNotification('Customer account is in good standing')}
                      className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Account Good Standing</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Customer Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Add New Customer</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Store Debt Balance ({cur})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialDebt}
                    onChange={(e) => setInitialDebt(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    disabled={isAddingCustomer}
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingCustomer}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {isAddingCustomer ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Customer</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
