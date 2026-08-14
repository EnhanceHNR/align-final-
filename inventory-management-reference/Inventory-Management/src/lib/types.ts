
import type { LucideIcon } from 'lucide-react';

export type StockEntry = {
  quantity: number;
  expiryDate: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  company: string;
  brandName: string;
  itemCount: number; // This will be the total quantity from all stock entries
  stock: StockEntry[];
  quantity: { // Represents the unit of a single item, not total quantity
    value: number;
    unit: 'ml' | 'kg' | 'gm' | 'pcs' | 'ltr' | 'cm' | 'mm';
  };
  dealer: string;
  dealerAvailability: boolean;
  costPerUnit: number;
  minQuantity: number;
  consumption?: {
    lastOrderDate: string;
    openingDate: string;
    closingDate: string;
    lastingTime: string; // e.g., "30 days"
  };
  cases: number;
  category: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  imageUrl?: string;
  genericName?: string;
  tags?: string[];
};

export type PurchaseOrder = {
  id: string;
  itemName: string;
  company?: string;
  quantity: number;
  dealer: string;
  price: number;
  estimatedArrival: string;
  orderDate: string;
  status: 'Pending Approval' | 'Pending' | 'Delivered' | 'Rejected' | 'Delayed';
  paymentStatus?: 'Unpaid' | 'Pending Statement' | 'Paid';
  placedBy?: string; // User ID
  placedByPhotoUrl?: string;
  notes?: string;
  dealerComparisons?: {
    dealerName: string;
    price: number;
    expiryDate?: string;
  }[];
};

export type Delivery = {
    id: string;
    orderRecordId: string;
    itemPhotoUrl: string;
    receiverPhotoUrl: string;
    deliveryPersonPhotoUrl?: string;
    billPhotoUrl: string;
    receiverId: string;
    actualPrice: number;
    quantityReceived: number;
    deliveryDate: string;
    isApproved: boolean;
    comments?: string;
    isPaid: boolean; 
    returnDetails?: {
      quantity: number;
      refundAmount: number;
      date: string;
      reason?: string;
      returnedByUserId?: string;
      returnedByUserName?: string;
      returnerPhotoUrl?: string;
      itemPhotoUrl?: string;
    }[];
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  icon: LucideIcon;
};

export type Dealer = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  suppliedItems: string[]; // Array of inventory item IDs
  itemPrices?: Record<string, number>; // Mapping of itemId -> price
  itemExpiries?: Record<string, string>; // Mapping of itemId -> expiry date string
};

export type Statement = {
    id: string;
    dealerId: string;
    dealerName: string;
    startDate: string;
    endDate: string;
    totalAmount: number;
    status: 'Pending' | 'Paid';
    deliveryIds: string[];
    generatedDate: string;
    paymentMode?: 'Card' | 'Cheque' | 'Cash' | 'UPI' | 'Other';
    paymentReference?: string;
};

export type ConsumptionRecord = {
    id: string;
    itemId: string;
    itemName: string;
    quantityConsumed: number;
    unit: string;
    consumedBy: string; // User ID
    consumedByName: string; // User's name/email for display
    consumptionDate: string;
};
  
export type StaffUser = {
  id: string;
  name: string;
  role: string;
  createdAt: string;
};

// --- SaaS B2B Marketplace Types ---

export type UserRole = 'clinic' | 'dealer' | 'admin';

export type AppUser = {
  uid: string;
  email: string;
  role: UserRole;
  businessName: string;
  createdAt: string;
};

export type MasterItem = {
  id: string;
  genericName: string;
  category: string;
  tags: string[];
  description?: string;
};

export type DealerOffer = {
  id: string; // Document ID
  dealerId: string;
  masterItemId: string;
  brandName: string;
  company: string;
  price: number;
  expiryDate?: string; // Can be a string like "2026-12" or "6 months"
  availableQuantity: number;
  lastUpdated: string;
};
