<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Enhance-HNR (Prosthetic Project Tracker)

## Project Overview
Enhance-HNR is a comprehensive prosthetic project tracker and workflow management web application. It is designed to assist teams in tracking the status of 3D prosthetic models, managing patient data, regulating multi-stage workflows, and utilizing Google GenAI for supplementary analysis and documentation generation. The application uses a robust Role-Based Access Control (RBAC) mechanism to separate administrative functionality from team member access.

## Tech Stack
* **Frontend framework**: React (v19.2.3)
* **Build tool**: Vite (v6.2.0)
* **Language**: TypeScript (v5.8.2)
* **Backend/Database**: Firebase (v12.7.0)
* **AI Integration**: Google GenAI (`@google/genai` v1.34.0)
* **Styling**: Tailwind CSS
* **Icons & Charts**: Lucide React (v0.562.0) / Recharts (v2.12.0)

## Architecture Summary
The application is a purely client-side React SPA (Single Page Application) that interfaces directly with a Firebase Backend-as-a-Service (BaaS). It utilizes Firebase Authentication for secure access, Firestore for real-time NoSQL data synchronization with offline persistence, and Firebase Storage for file management. The Google Gemini API is accessed to dynamically enhance textual functionality.

For an in-depth review and network graphs, please refer to the [Architecture Documentation](ARCHITECTURE.md).

For credentials, account roles, and service ownership specifications, see the [Credentials & Service Ownership Checklist](CREDENTIALS_AND_OWNERSHIP.md).

## Environment Documentation
* **Node Version**: v22.x (Recommended active LTS based on types schema)
* **Python Version**: N/A (Project entirely Node ecosystem based)
* **Package Manager**: npm (v10+)
* **Required Global Tools**: Git, Node.js, `npm`
* **Default Port Numbers**: 5173 (Vite development server)
* **Required OS Dependencies**: None (Cross-platform compatible via Node.js framework)

## Setup Steps (Fresh Machine)

### 4️⃣ Automated Setup on Fresh Machine Test (Critical)
To ensure the documentation is fully complete without hidden localized dependencies, this project requires a successful zero-knowledge setup test. Run the following on a fresh machine:

```bash
# 1. Clone the repository
git clone <repo_url>
cd ProsthoProject-management_google

# 2. Setup Environment Variables
# If an .env.example exists, copy it to create your local env file
cp .env.example .env.local

# Fill in the necessary values in .env.local (see Environment Variables List below)

# 3. Install Dependencies
npm install

# 4. Start the Development Server
npm run dev
```
If the app fails to start or throws permission errors after these exact steps, the setup documentation must be amended.

## Environment Variables List
You must provide these necessary variables in a `.env.local` or `.env` file at the root of the project before initializing:
* `GEMINI_API_KEY` - Your assigned Google Gemini AI API Key.
* `VITE_FIREBASE_API_KEY` - (Optional, if extracting from built-in constants) Firebase SDK settings.

> **Note**: Current structural setup parses Firebase configuration linearly via `firebase.ts`. However, to facilitate distinct environments, they may be decoupled into standard `VITE_FIREBASE_...` env vars.

## Database Schema Explanation
The database operates on Firebase Firestore NoSQL collections:

* **`users` Collection**: 
  * Documents represent individual provisioned users identified directly by Firebase Auth `uid`.
  * Fields: `firstName`, `lastName`, `email`, `role` (`admin` | `team_member`), `isActive` (boolean), `createdAt` (timestamp).
* **`projects` Collection**:
  * Documents dictate a solitary prosthetic order or patient's 3D workflow.
  * Fields: `patientName`, `assignedEmployeeIds` (array of document references to authorized users), tracking fields for the specific scan stage (processing vs uploaded), file URLs pointing to Firebase Storage, `createdAt`.

## Deployment Steps
The application is pre-configured to be built statically.
1. Formulate the production bundle:
   ```bash
   npm run build
   ```
2. The bundled `dist` directory can securely be deployed to Firebase Hosting, Vercel, or Netlify.
   For Firebase Hosting deployment:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting # Select the 'dist' folder and configure as a single-page app
   firebase deploy --only hosting
   ```

## Testing Instructions
* **Manual Feature Testing**: Execute `npm run dev` and navigate to `http://localhost:5173`. Authenticate via standard Google/Email login. Verify Roles behave as intended (e.g. users logged in with 'admin' in their handle actively gain access to the 'Analytics', 'Workflow', and 'Users' pages while others remain segregated).
* **Automated Setup Validation**: Repeatedly run the Zero-Knowledge Setup Test described above utilizing varied unlinked accounts to guarantee the repository builds completely isolated.
