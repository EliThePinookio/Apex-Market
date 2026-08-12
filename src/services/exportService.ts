import { Transaction, Product, BusinessProfile, FinancialSummary } from '../types';

// Helper to trigger file download
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Escape CSV fields
function escapeCSV(str: string | number | undefined): string {
  if (str === undefined || str === null) return '""';
  const val = String(str).replace(/"/g, '""');
  return `"${val}"`;
}

// 1. Export Inventory to CSV (Excel compatible)
export function exportInventoryToCSV(products: Product[], currency = '$') {
  const headers = ['Product Name', 'SKU', 'Category', `Cost Price (${currency})`, `Selling Price (${currency})`, 'Stock Qty', 'Min Threshold', 'Stock Value (Cost)', 'Potential Revenue', 'Unit', 'Barcode', 'Last Updated'];
  
  const rows = products.map(p => {
    const costVal = (p.buyPrice * p.stockQuantity).toFixed(2);
    const revVal = (p.sellPrice * p.stockQuantity).toFixed(2);
    return [
      escapeCSV(p.name),
      escapeCSV(p.sku),
      escapeCSV(p.category),
      escapeCSV(p.buyPrice.toFixed(2)),
      escapeCSV(p.sellPrice.toFixed(2)),
      escapeCSV(p.stockQuantity),
      escapeCSV(p.minStockThreshold),
      escapeCSV(costVal),
      escapeCSV(revVal),
      escapeCSV(p.unit),
      escapeCSV(p.barcode || '-'),
      escapeCSV(new Date(p.updatedAt).toLocaleDateString()),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(csv, `Inventory_Report_${dateStr}.csv`);
}

// 2. Export Sales Transactions to CSV
export function exportSalesToCSV(transactions: Transaction[], currency = '$') {
  const sales = transactions.filter(t => t.type === 'sale');
  const headers = ['Date', 'Transaction ID', 'Customer', 'Items Sold', `Revenue (${currency})`, `COGS (${currency})`, `Gross Profit (${currency})`, 'Payment Method'];

  const rows = sales.map(t => {
    const itemsSummary = t.items ? t.items.map(i => `${i.productName} (x${i.quantity})`).join('; ') : t.description;
    return [
      escapeCSV(new Date(t.date).toLocaleString()),
      escapeCSV(t.id),
      escapeCSV(t.customerName || 'Walk-in Customer'),
      escapeCSV(itemsSummary),
      escapeCSV(t.amount.toFixed(2)),
      escapeCSV((t.cogs || 0).toFixed(2)),
      escapeCSV((t.grossProfit || 0).toFixed(2)),
      escapeCSV(t.paymentMethod || 'cash'),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(csv, `Sales_Report_${dateStr}.csv`);
}

// 3. Export Expenses to CSV
export function exportExpensesToCSV(transactions: Transaction[], currency = '$') {
  const expenses = transactions.filter(t => t.type === 'expense');
  const headers = ['Date', 'Expense ID', 'Category', 'Description', `Amount (${currency})`, 'Payment Method'];

  const rows = expenses.map(t => [
    escapeCSV(new Date(t.date).toLocaleString()),
    escapeCSV(t.id),
    escapeCSV(t.category || 'General'),
    escapeCSV(t.description),
    escapeCSV(t.amount.toFixed(2)),
    escapeCSV(t.paymentMethod || 'cash'),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCSV(csv, `Expenses_Report_${dateStr}.csv`);
}

// 4. Export Complete Master Financial Ledger CSV
export function exportFullBusinessReportCSV(
  transactions: Transaction[],
  products: Product[],
  profile: BusinessProfile,
  summary: FinancialSummary
) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const cur = profile.currencySymbol;

  let csvLines: string[] = [];
  
  csvLines.push(`BUSINESS FINANCIAL & INVENTORY MASTER REPORT`);
  csvLines.push(`Business Name: ${profile.businessName}`);
  csvLines.push(`Generated Date: ${new Date().toLocaleString()}`);
  csvLines.push(``);

  // Financial Summary Section
  csvLines.push(`KEY FINANCIAL SUMMARY METRICS`);
  csvLines.push(`Total Revenue,${cur}${summary.totalRevenue.toFixed(2)}`);
  csvLines.push(`Cost of Goods Sold (COGS),${cur}${summary.totalCOGS.toFixed(2)}`);
  csvLines.push(`Gross Profit,${cur}${summary.grossProfit.toFixed(2)}`);
  csvLines.push(`Total Operating Expenses,${cur}${summary.totalExpenses.toFixed(2)}`);
  csvLines.push(`Net Profit,${cur}${summary.netProfit.toFixed(2)}`);
  csvLines.push(`Total Capital Injected,${cur}${summary.totalCapital.toFixed(2)}`);
  csvLines.push(`Inventory Valuation (Cost),${cur}${summary.totalInventoryValuation.toFixed(2)}`);
  csvLines.push(`Potential Sales Value,${cur}${summary.totalPotentialRevenue.toFixed(2)}`);
  csvLines.push(`Low Stock Items Count,${summary.lowStockCount}`);
  csvLines.push(``);

  // ALL Transactions
  csvLines.push(`ALL TRANSACTIONS LOG`);
  csvLines.push(`Date,Type,ID,Category / Details,Amount (${cur}),COGS (${cur}),Profit (${cur}),Payment Method`);
  transactions.forEach(t => {
    csvLines.push([
      escapeCSV(new Date(t.date).toLocaleString()),
      escapeCSV(t.type.toUpperCase()),
      escapeCSV(t.id),
      escapeCSV(t.description),
      escapeCSV(t.amount.toFixed(2)),
      escapeCSV((t.cogs || 0).toFixed(2)),
      escapeCSV((t.netProfit || 0).toFixed(2)),
      escapeCSV(t.paymentMethod || 'cash'),
    ].join(','));
  });

  const csv = csvLines.join('\n');
  downloadCSV(csv, `${profile.businessName.replace(/\s+/g, '_')}_Master_Report_${dateStr}.csv`);
}

// Print Receipt helper
export function printReceipt(transaction: Transaction, profile: BusinessProfile) {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const cur = profile.currencySymbol;
  const itemsHtml = transaction.items
    ? transaction.items
        .map(
          i => `
          <tr style="border-bottom: 1px dashed #eee;">
            <td style="padding: 6px 0;">${i.productName}<br/><small style="color: #666;">${i.quantity} x ${cur}${i.unitSellPrice.toFixed(2)}</small></td>
            <td style="text-align: right; padding: 6px 0; vertical-align: top;">${cur}${i.totalSellPrice.toFixed(2)}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="2">${transaction.description}</td></tr>`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${transaction.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 13px; margin: 0; padding: 15px; color: #111; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0;">${profile.businessName}</h2>
          <p style="margin: 3px 0; color: #555;">${profile.receiptHeaderMsg || 'Receipt'}</p>
          <p style="margin: 3px 0; font-size: 11px;">${new Date(transaction.date).toLocaleString()}</p>
          <p style="margin: 3px 0; font-size: 11px;">Order #${transaction.id}</p>
        </div>
        
        <div class="divider"></div>
        
        <p style="margin: 5px 0;"><strong>Customer:</strong> ${transaction.customerName || 'Walk-in'}</p>
        <p style="margin: 5px 0;"><strong>Payment:</strong> ${(transaction.paymentMethod || 'Cash').toUpperCase()}</p>
        
        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; text-align: left;">
              <th>Item</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          <tr>
            <td class="bold">TOTAL PAID:</td>
            <td class="bold" style="text-align: right; font-size: 16px;">${cur}${transaction.amount.toFixed(2)}</td>
          </tr>
        </table>

        <div class="divider"></div>
        
        <div class="center" style="margin-top: 15px; font-size: 11px; color: #666;">
          Thank you for your business!
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
