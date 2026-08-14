# Credentials & Service Ownership Guidelines

## Ownership Rule
The Founder/Company MUST own the primary Google Cloud / Firebase project. Developers should be added as IAM members with 'Editor' or 'Firebase Admin' roles.

## Firebase Access
- **Billing**: Must be linked to the Founder's credit card.
- **Roles**: Founder should have 'Project Owner'.
- **Security**: 2FA must be enabled on the owner's Google Account.

## AI Service (Google Gemini / Genkit)
- **Billing**: Managed through the Google Cloud Console.
- **API Keys**: Stored in Environment Variables, NEVER hardcoded.
- **Rotation**: Keys should be rotated every 90 days for security.

## Source Control (GitHub)
- Repository should be under the Company Organization.
- Branch protection enabled for `main`.
