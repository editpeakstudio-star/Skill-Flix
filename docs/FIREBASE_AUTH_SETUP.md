# Firebase authentication setup for Skill-Flix

The web client uses the Firebase project `skillflix-academy` configured in `src/services/firebase.ts`. The web API key is a public project identifier; never put a service-account key, Admin SDK credential, password, or privileged token in this frontend.

## Enable sign-in and local development

In Firebase Console, open project `skillflix-academy`:

1. Go to **Authentication → Sign-in method** and enable **Email/Password**, **Google**, and **Phone**.
2. Go to **Authentication → Settings → Authorized domains** and add `127.0.0.1` and `localhost` (hostnames only; omit scheme and port).
3. For Phone, configure the SMS region policy and billing/quota required by the project. Use Firebase test phone numbers for local tests to avoid sending real SMS.
4. The app stores a Firebase Auth profile in `users/{uid}` and uses existing collections: `folders`, `categories`, `videos`, `pdfs`, `paymentRequests`, `settings`, `audit_logs`, and `sales_analytics`.

## Protected platform owner

`editpeakstudio@gmail.com` receives owner access only when the currently authenticated Firebase user has this exact email and Firebase Auth reports it as verified. The frontend derives owner UI state from `FirebaseUser.email` and `emailVerified`; Firestore Rules independently enforce the signed token's `email` and `email_verified` claims. No frontend code can set these Firebase-signed claims.

If the owner signs in with Email/Password before verification, the app sends a Firebase verification email and keeps the account at student privileges until the link is followed and the owner signs out and signs in again. In Firebase Console, check **Authentication → Users** and confirm the account's **Email verified** status. Google sign-in generally arrives verified from the identity provider, but still confirm that status.

## Admin accounts and Firestore Rules

Normal admin accounts must have `role: 'admin'` or `role: 'master_admin'` in their own `users/{uid}` document and must not be suspended. Self-registration creates a student role; users cannot grant themselves an admin role. Review the rules in this repository against the target project's current rules before publishing. Do not deploy or overwrite production rules until the existing policies and data schema have been reviewed.
