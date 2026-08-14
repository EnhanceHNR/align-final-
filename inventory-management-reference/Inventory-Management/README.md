# Enhance Inventory - Dental Inventory & Procurement Management System

## Project Overview
Enhance Inventory is a comprehensive solution designed for dental clinics to manage their clinical supplies, track consumption, handle purchase orders, and verify deliveries. It ensures stock levels are maintained, expiry dates are tracked, and procurement is streamlined through a consolidated billing and payment system.

## Tech Stack
- **Frontend**: Next.js 15.3 (App Router), React 18
- **Styling**: Tailwind CSS, ShadCN UI
- **Icons**: Lucide React
- **Backend/BaaS**: Firebase (Authentication, Firestore, Storage)
- **AI Integration**: Genkit (Ready for expansion)
- **PDF/Data Export**: jsPDF, jsPDF-AutoTable, CSV utility

## Architecture Summary
The application follows a modern serverless architecture:
- **Client Tier**: React functional components with Tailwind/ShadCN. Uses Firebase SDK for real-time data synchronization.
- **Logic Tier**: Next.js Server Actions for complex mutations (e.g., generating statements).
- **Data Tier**: 
  - **Firestore**: NoSQL database for relational data (Items, Orders, Deliveries).
  - **Storage**: Blob storage for delivery verification images (Bills, Item photos).
  - **Authentication**: Firebase Auth (Email/Password).

## Setup Steps (Fresh Machine)
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd enhance-inventory
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Create a `.env` file in the root (see Environment Variables list).
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
5. **Access the app**: Open [http://localhost:9002](http://localhost:9002)

## Environment Variables
The application relies on the following variables (configured in `src/firebase/config.ts` for the prototype):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Database Schema Explanation
Detailed schema can be found in `docs/backend.json`.
- **Items**: Inventory items with nested `stock` batches (expiry tracking).
- **OrderRecords**: Purchase orders linked to items and dealers.
- **Deliveries**: Proof-of-delivery records with image URLs and actual costs.
- **Statements**: Monthly or batch bills for dealers.
- **ConsumptionHistory**: Log of item usage for reporting.

## Deployment Steps
1. **Build**: `npm run build`
2. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting,firestore,storage
   ```

## Testing Instructions
- **Auth**: Test login/logout flows.
- **Inventory**: Add items, adjust stock (add/use).
- **Procurement**: Create order -> Verify delivery -> Check inventory update.
- **Billing**: Generate statement from approved deliveries -> Mark as paid.

---

### Zero-Knowledge Setup Test
Successfully tested on Node v20+ with NPM 10+. Ensure you have the `firebase-tools` global package for deployment: `npm install -g firebase-tools`.
