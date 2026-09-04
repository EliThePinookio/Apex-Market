import type { BusinessProfile, FinancialSummary, Product, Transaction } from "@/types";
import { escapeHtml, money } from "@/lib/apex/money";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number | undefined): string {
  const v = value === undefined || value === null ? "" : String(value).replace(/"/g, '""');
  return `"${v}"`;
}

export function exportLedgerCsv(transactions: Transaction[], currency: string) {
  const header = [
    "Date",
    "Type",
    "ID",
    "Description",
    `Amount (${currency})`,
    `COGS (${currency})`,
    `Profit (${currency})`,
    "Payment",
    "Customer",
  ];
  const rows = transactions.map((t) =>
    [
      csvEscape(new Date(t.date).toLocaleString()),
      csvEscape(t.type),
      csvEscape(t.id),
      csvEscape(t.description),
      csvEscape(t.amount.toFixed(2)),
      csvEscape((t.cogs || 0).toFixed(2)),
      csvEscape((t.grossProfit || t.netProfit || 0).toFixed(2)),
      csvEscape(t.paymentMethod || ""),
      csvEscape(t.customerName || ""),
    ].join(","),
  );
  download(
    `BEANNEL_Ledger_${new Date().toISOString().slice(0, 10)}.csv`,
    "\uFEFF" + [header.join(","), ...rows].join("\n"),
    "text/csv;charset=utf-8;",
  );
}

export function exportInventoryCsv(products: Product[], currency: string) {
  const header = [
    "Name",
    "SKU",
    "Category",
    `Cost (${currency})`,
    `Sell (${currency})`,
    "Qty",
    "Min",
    "Value",
    "Barcode",
  ];
  const rows = products.map((p) =>
    [
      csvEscape(p.name),
      csvEscape(p.sku),
      csvEscape(p.category),
      csvEscape(p.buyPrice.toFixed(2)),
      csvEscape(p.sellPrice.toFixed(2)),
      csvEscape(p.stockQuantity),
      csvEscape(p.minStockThreshold),
      csvEscape((p.buyPrice * p.stockQuantity).toFixed(2)),
      csvEscape(p.barcode || ""),
    ].join(","),
  );
  download(
    `BEANNEL_Inventory_${new Date().toISOString().slice(0, 10)}.csv`,
    "\uFEFF" + [header.join(","), ...rows].join("\n"),
    "text/csv;charset=utf-8;",
  );
}

export function exportMasterReport(
  transactions: Transaction[],
  products: Product[],
  profile: BusinessProfile,
  summary: FinancialSummary,
) {
  const cur = profile.currencySymbol;
  const lines = [
    "BEANNEL BUSINESS MASTER REPORT",
    `Business,${csvEscape(profile.businessName)}`,
    `Generated,${csvEscape(new Date().toLocaleString())}`,
    "",
    "SUMMARY",
    `Revenue,${cur}${summary.totalRevenue.toFixed(2)}`,
    `COGS,${cur}${summary.totalCOGS.toFixed(2)}`,
    `Gross Profit,${cur}${summary.grossProfit.toFixed(2)}`,
    `Expenses,${cur}${summary.totalExpenses.toFixed(2)}`,
    `Net Profit,${cur}${summary.netProfit.toFixed(2)}`,
    `Capital,${cur}${summary.totalCapital.toFixed(2)}`,
    `Inventory (cost),${cur}${summary.totalInventoryValuation.toFixed(2)}`,
    "",
    "LEDGER",
  ];
  lines.push("Date,Type,Description,Amount,COGS,Profit");
  for (const t of transactions) {
    lines.push(
      [
        csvEscape(new Date(t.date).toLocaleString()),
        csvEscape(t.type),
        csvEscape(t.description),
        csvEscape(t.amount.toFixed(2)),
        csvEscape((t.cogs || 0).toFixed(2)),
        csvEscape((t.grossProfit || 0).toFixed(2)),
      ].join(","),
    );
  }
  download(
    `${profile.businessName.replace(/\s+/g, "_")}_Master_${new Date().toISOString().slice(0, 10)}.csv`,
    "\uFEFF" + lines.join("\n"),
    "text/csv;charset=utf-8;",
  );
}

export function printReceipt(transaction: Transaction, profile: BusinessProfile) {
  const printWindow = window.open("", "_blank", "width=400,height=640");
  if (!printWindow) return;
  const cur = profile.currencySymbol;
  const itemsHtml = transaction.items
    ? transaction.items
        .map(
          (i) => `
        <tr>
          <td>${escapeHtml(i.productName)}<br/><small>${i.quantity} × ${escapeHtml(money(i.unitSellPrice, cur))}</small></td>
          <td style="text-align:right">${escapeHtml(money(i.totalSellPrice, cur))}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="2">${escapeHtml(transaction.description)}</td></tr>`;

  printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt ${escapeHtml(transaction.id)}</title>
    <style>
      body { font-family: ui-monospace, Menlo, monospace; font-size: 13px; padding: 16px; color: #111; }
      .center { text-align: center; }
      table { width: 100%; border-collapse: collapse; }
      .divider { border-top: 1px dashed #111; margin: 10px 0; }
    </style></head><body>
    <div class="center">
      <h2 style="margin:0">${escapeHtml(profile.businessName)}</h2>
      <p>${escapeHtml(profile.receiptHeaderMsg || "Receipt")}</p>
      <p>${escapeHtml(new Date(transaction.date).toLocaleString())}</p>
      <p>Order ${escapeHtml(transaction.id)}</p>
    </div>
    <div class="divider"></div>
    <p>Customer: ${escapeHtml(transaction.customerName || "Walk-in")}</p>
    <p>Payment: ${escapeHtml((transaction.paymentMethod || "cash").toUpperCase())}</p>
    <div class="divider"></div>
    <table><tbody>${itemsHtml}</tbody></table>
    <div class="divider"></div>
    <p style="font-weight:700;display:flex;justify-content:space-between">
      <span>TOTAL</span><span>${escapeHtml(money(transaction.amount, cur))}</span>
    </p>
    <p class="center">Thank you for your business.</p>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close()},400)}</script>
    </body></html>`);
  printWindow.document.close();
}
