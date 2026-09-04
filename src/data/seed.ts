import type {
  BusinessProfile,
  Category,
  Customer,
  Product,
  Transaction,
} from "@/types";

export const INITIAL_BUSINESS_PROFILE: BusinessProfile = {
  businessName: "BEANNEL",
  ownerName: "Store Owner",
  currencySymbol: "$",
  ownerPin: "1234",
  isPinLocked: false,
  taxRate: 0,
  lowStockAlertEnabled: true,
  allowNegativeStock: false,
  receiptHeaderMsg: "Thank you for shopping with us!",
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-apparels", name: "Apparels", color: "#C4A35A" },
  { id: "cat-trousers", name: "Trousers", color: "#6B7C5E" },
  { id: "cat-tops", name: "Tops", color: "#8C6B4F" },
  { id: "cat-mens-shirts", name: "Men's shirts", color: "#3E4A5C" },
  { id: "cat-women", name: "Women", color: "#8A4A58" },
  { id: "cat-watches", name: "Watches", color: "#B0893A" },
  { id: "cat-shoes", name: "Shoes", color: "#5C4636" },
  { id: "cat-belts", name: "Belts", color: "#7A5C38" },
  { id: "cat-accessories", name: "Clothing accessories", color: "#9A7B4F" },
  { id: "cat-electronics", name: "Electronics", color: "#4A5A6A" },
  { id: "cat-jewellery", name: "Jewellery", color: "#C4A35A" },
  { id: "cat-necklaces", name: "Necklaces", color: "#D4AF37" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(11, 30, 0, 0);
  return d.toISOString();
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-101",
    name: "Unisex Cotton Graphic T-Shirt",
    sku: "TOP-TSH-001",
    category: "Men’s Top",
    buyPrice: 6.5,
    sellPrice: 18,
    stockQuantity: 35,
    minStockThreshold: 10,
    unit: "pcs",
    barcode: "890123456001",
    createdAt: daysAgo(15),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-102",
    name: "Casual Tailored Streetwear Shorts",
    sku: "APP-SHT-002",
    category: "Apparels",
    buyPrice: 8,
    sellPrice: 22,
    stockQuantity: 28,
    minStockThreshold: 8,
    unit: "pcs",
    barcode: "890123456002",
    createdAt: daysAgo(14),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-103",
    name: "Classic Denim Jeans Trousers",
    sku: "TRS-JNS-003",
    category: "Trousers",
    buyPrice: 15,
    sellPrice: 38,
    stockQuantity: 20,
    minStockThreshold: 5,
    unit: "pcs",
    barcode: "890123456003",
    createdAt: daysAgo(12),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-104",
    name: "Luxury Steel Chronograph Watch",
    sku: "WAT-CHR-004",
    category: "Watches",
    buyPrice: 35,
    sellPrice: 85,
    stockQuantity: 12,
    minStockThreshold: 4,
    unit: "pcs",
    barcode: "890123456004",
    createdAt: daysAgo(10),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-105",
    name: "Natural Gemstone Bead Bracelet",
    sku: "BRC-GEM-005",
    category: "Bracelet",
    buyPrice: 4.5,
    sellPrice: 14,
    stockQuantity: 4,
    minStockThreshold: 8,
    unit: "pcs",
    barcode: "890123456005",
    createdAt: daysAgo(9),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-106",
    name: "Gold Finished Statement Ring",
    sku: "RNG-GLD-006",
    category: "Rings",
    buyPrice: 6,
    sellPrice: 19.5,
    stockQuantity: 18,
    minStockThreshold: 6,
    unit: "pcs",
    barcode: "890123456006",
    createdAt: daysAgo(8),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-107",
    name: "Vintage Baseball Jersey Shirt",
    sku: "TOP-BSB-007",
    category: "Men’s Top",
    buyPrice: 11,
    sellPrice: 28,
    stockQuantity: 22,
    minStockThreshold: 6,
    unit: "pcs",
    barcode: "890123456007",
    createdAt: daysAgo(7),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-108",
    name: "Pro Athletic Ribbed Singlet",
    sku: "SNG-ATH-008",
    category: "Singlet",
    buyPrice: 5.5,
    sellPrice: 16,
    stockQuantity: 3,
    minStockThreshold: 8,
    unit: "pcs",
    barcode: "890123456008",
    createdAt: daysAgo(6),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-109",
    name: "Premium Allure Perfume Body Spray",
    sku: "SPR-ALR-009",
    category: "Sprays",
    buyPrice: 7,
    sellPrice: 22,
    stockQuantity: 19,
    minStockThreshold: 5,
    unit: "pcs",
    barcode: "890123456009",
    createdAt: daysAgo(5),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-110",
    name: "Genuine Leather Reversible Belt",
    sku: "BLT-LTH-010",
    category: "Belts",
    buyPrice: 8,
    sellPrice: 25,
    stockQuantity: 30,
    minStockThreshold: 6,
    unit: "pcs",
    barcode: "890123456010",
    createdAt: daysAgo(4),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-111",
    name: "Royal Heritage Carnival Costume",
    sku: "CST-RYL-011",
    category: "Costumes",
    buyPrice: 28,
    sellPrice: 75,
    stockQuantity: 8,
    minStockThreshold: 3,
    unit: "pcs",
    barcode: "890123456011",
    createdAt: daysAgo(3),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-112",
    name: "Slim Fit Stretch Chino Trousers",
    sku: "TRS-CHN-012",
    category: "Trousers",
    buyPrice: 14,
    sellPrice: 36,
    stockQuantity: 24,
    minStockThreshold: 6,
    unit: "pcs",
    barcode: "890123456012",
    createdAt: daysAgo(2),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Sarah Jenkins",
    phone: "+1 (555) 234-5678",
    email: "sarah.j@example.com",
    loyaltyPoints: 340,
    totalSpent: 1250,
    orderCount: 14,
    debtBalance: 0,
    tier: "Gold",
    lastVisit: "2 hours ago",
  },
  {
    id: "cust-2",
    name: "Marcus Vance",
    phone: "+1 (555) 876-5432",
    email: "marcus.v@example.com",
    loyaltyPoints: 890,
    totalSpent: 3400.5,
    orderCount: 28,
    debtBalance: 45,
    tier: "VIP",
    lastVisit: "Yesterday",
  },
  {
    id: "cust-3",
    name: "Elena Rostova",
    phone: "+1 (555) 432-1098",
    email: "elena.rostova@example.com",
    loyaltyPoints: 120,
    totalSpent: 420,
    orderCount: 5,
    debtBalance: 0,
    tier: "Silver",
    lastVisit: "3 days ago",
  },
  {
    id: "cust-4",
    name: "David Chen",
    phone: "+1 (555) 987-6543",
    email: "david.chen@example.com",
    loyaltyPoints: 45,
    totalSpent: 110,
    orderCount: 2,
    debtBalance: 0,
    tier: "Bronze",
    lastVisit: "1 week ago",
  },
];

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemoLedger(products: Product[]): Transaction[] {
  const rand = mulberry32(20260825);
  const customers = ["Sarah Jenkins", "Marcus Vance", "Elena Rostova", "David Chen", "Walk-in Customer"];
  const methods: Transaction["paymentMethod"][] = ["cash", "card", "mobile_money", "transfer"];

  const txs: Transaction[] = [
    {
      id: "tx-capital-1",
      type: "capital",
      amount: 5000,
      description: "Initial business startup capital",
      date: daysAgo(28),
      paymentMethod: "transfer",
      createdAt: daysAgo(28),
    },
    {
      id: "tx-exp-rent",
      type: "expense",
      amount: 450,
      category: "Rent & Space",
      description: "Monthly storefront lease",
      date: daysAgo(24),
      paymentMethod: "transfer",
      createdAt: daysAgo(24),
    },
    {
      id: "tx-exp-util",
      type: "expense",
      amount: 120,
      category: "Utilities",
      description: "Electricity and internet",
      date: daysAgo(18),
      paymentMethod: "card",
      createdAt: daysAgo(18),
    },
    {
      id: "tx-exp-ads",
      type: "expense",
      amount: 85,
      category: "Marketing",
      description: "Weekend flyer print run",
      date: daysAgo(6),
      paymentMethod: "cash",
      createdAt: daysAgo(6),
    },
  ];

  let seq = 0;
  for (let day = 20; day >= 0; day--) {
    const salesToday = 1 + Math.floor(rand() * 3);
    for (let s = 0; s < salesToday; s++) {
      const itemCount = 1 + Math.floor(rand() * 3);
      const items = [];
      let totalSell = 0;
      let totalBuy = 0;
      for (let i = 0; i < itemCount; i++) {
        const prod = products[Math.floor(rand() * products.length)];
        const qty = 1 + Math.floor(rand() * 2);
        const lineSell = prod.sellPrice * qty;
        const lineBuy = prod.buyPrice * qty;
        totalSell += lineSell;
        totalBuy += lineBuy;
        items.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitBuyPrice: prod.buyPrice,
          unitSellPrice: prod.sellPrice,
          totalSellPrice: lineSell,
          totalBuyPrice: lineBuy,
        });
      }
      seq += 1;
      const hour = 9 + Math.floor(rand() * 10);
      const d = new Date();
      d.setDate(d.getDate() - day);
      d.setHours(hour, Math.floor(rand() * 60), 0, 0);
      const iso = d.toISOString();
      const customerName = customers[Math.floor(rand() * customers.length)];
      txs.push({
        id: `tx-sale-${seq}`,
        type: "sale",
        amount: totalSell,
        cogs: totalBuy,
        grossProfit: totalSell - totalBuy,
        netProfit: totalSell - totalBuy,
        description: `Sale of ${items.reduce((n, it) => n + it.quantity, 0)} item(s)`,
        date: iso,
        paymentMethod: methods[Math.floor(rand() * methods.length)],
        customerName,
        items,
        createdAt: iso,
      });
    }
  }

  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
