import React from 'react';
import { Transaction, Product, BusinessProfile, FinancialSummary, Category } from '../types';
import { BusinessAdvisorView } from './BusinessAdvisorView';

interface AnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  categories?: Category[];
  profile: BusinessProfile;
  summary: FinancialSummary;
  onNavigateToPOS?: () => void;
  onNavigateToInventory?: (filterLowStock?: boolean) => void;
  onNavigateToTransactions?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = (props) => {
  return <BusinessAdvisorView {...props} />;
};

export { BusinessAdvisorView };
