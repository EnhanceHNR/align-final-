# High-Level Architecture Documentation

## Frontend
- **Framework**: Next.js 15 (App Router)
- **State Management**: React `useState`/`useEffect` + Firebase real-time listeners (`onSnapshot`).
- **UI Components**: ShadCN UI (Radix UI primitives).

## Backend
- **Database**: Firebase Firestore (NoSQL).
- **Storage**: Firebase Storage (Image assets).
- **Functions**: (Optional) Ready for Firebase Cloud Functions for heavy background processing.

## Data Flow
1. **Creation**: User submits form (e.g., Create Order).
2. **Persistence**: Client-side Firebase SDK pushes data to Firestore.
3. **Sync**: Other clients receive updates via `onSnapshot` listeners.
4. **Verification**: `VerifyDelivery` uploads images to Storage, gets URLs, and updates Firestore atomically using `writeBatch`.

## Auth Flow
- Handled by Firebase Authentication.
- Persistent sessions via Firebase's internal token management.
- Protected routes implemented in `src/app/(main)/layout.tsx`.

## AI Integration
- **Platform**: Genkit.
- **Purpose**: Ready for inventory prediction, automated ordering suggestions, and image analysis of delivery bills.
