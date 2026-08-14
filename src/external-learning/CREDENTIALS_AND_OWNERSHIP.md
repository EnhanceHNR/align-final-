# Credentials & Service Ownership Checklist

This document outlines the authoritative ownership and credential management rules for the **Enhance-HNR** (Prosthetic Project Tracker) project.

---

## Rule: 
**Company must own all primary accounts. Developers and Designers are to be given delegated access as collaborators.**

---

## A. Source Control
- **Platform**: GitHub (or GitLab as applicable)
- **Ownership**: Repository owned by the Founder.
- **Access**: Developers added as Collaborators with appropriate push/pull permissions.
- **Admin Rights**: Verified to be held exclusively by the Founder.
- **Security**: 2FA (Two-Factor Authentication) **MUST** be enabled for all collaborators.

---

## B. Firebase
The project utilizes Firebase for Backend as a Service (BaaS) and Hosting.

- **Project Name**: `prosthetic-project-tracker`
- **Ownership**: The Founder MUST have the **Project Owner** role and **Billing Account Ownership**.
- **Access Requirements**:
  The Founder has access to:
  - Firestore Database
  - Firebase Authentication
  - Cloud Functions (if implemented later)
  - Firebase Hosting
  - Firebase Storage
  - API Keys
- **Artifact Exports Required**:
  The repository must contain up-to-date versions of:
  - `firebase.json`
  - Firestore security rules (`firestore.rules`)
  - Storage security rules (`storage.rules`)
  - Cloud Functions source code (if added)
  - `.firebaserc`

---

## C. AI Services
The project integrates AI capabilities utilizing Google's Generative AI (`@google/genai`).

- **Service**: Google Cloud / Google AI Studio (Gemini API)
- **Ownership**: 
  - Founder must own the associated billing account.
  - Founder must have dashboard access.
- **Security**:
  - API keys must be periodically rotated.
  - Keys **MUST** be stored locally in `.env` (or `.env.local`) files and **never** committed to version control.
- **Integration Documentation**:
  - **Model Used**: Gemini (via `@google/genai` v1.34.0)
  - **Prompt Logic**: Prompts are dynamically generated within the `geminiService.ts` for AI integration and data analysis.
  - **Rate Limits**: Refer to the standard Google Gemini API tier limits applied to the active billing account.
  - **Cost Assumptions**: Monitored and managed via Google Cloud Console based on API request volume.
