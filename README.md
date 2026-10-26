# Skill-Flix — Premium Video Editing Masterclass Platform & Admin Console

Skill-Flix is a high-performance course-selling and learning platform for mobile and desktop video editing creators (specializing in **Alight Motion**, **CapCut**, **Premiere Pro**, and **After Effects**).

The system includes a responsive student-facing portal, video player, curated PDF reader, payment proof submission workflow, and a fully functional Admin Console.

---

## 🚀 Key Features

### 🎓 1. Student Learning Platform
- **Category Collections**: Dedicated course tracks for Alight Motion, CapCut, Premiere Pro, and After Effects with unlocked/locked status indicators.
- **Masterclass Video Player**: High-fidelity video player supporting YouTube, MP4, and embed sources with episode navigation and progress tracking.
- **Curated PDF Library**: Protected study notes, shortcut blueprints, and preset documentation with download controls for authorized students.
- **Course Unlocking Workflow**:
  - Universal All-Access Pass (₹999) + Individual Category passes.
  - Official UPI ID: `rg570251-1@oksbi` (Payee: RAVI CHAUHAN).
  - Dynamic QR Code generation for instant scanning in PhonePe, Google Pay, Paytm, or BHIM.
  - One-tap UPI deep-links (`upi://pay?pa=...`).
  - Screenshot proof submission with 12-digit transaction UTR reference input.
  - Real-time submission tracking (`Pending Review`, `Approved`, `Rejected` with admin reason).
  - Direct WhatsApp / Telegram support channel.

### 🛡️ 2. Admin Console (authorized Firebase accounts)
- **Financial Sales Analytics**: Real-time sales ledger tracking gross revenue, active subscribers, and verified transactions.
- **Video & Lesson Management**: Upload, edit, delete, and toggle publication status (`Published` / `Draft`).
- **PDF & Material Management**: Upload, update, and manage document downloads.
- **Category & Pricing Management**: Create new categories, configure individual pass prices, and customize collection thumbnails.
- **User & Authority Management**:
  - Filter accounts by `All Accounts`, `Master Admins`, and `All Admins`.
  - Search by name, email, or UID.
  - Working **Multi-Category Access** controls: `Turn ON All`, `Turn OFF All`, and individual category status toggles.
  - Working **All-Access Pass** toggle button.
  - Appoint / Revoke roles (`Make Master Admin`, `Make Admin`, `Demote to Student`).
  - **Zero Infinite Loading**: All async actions wrapped in try/catch/finally with optimistic state updates and timeout protection.
- **Payment Requests Review**: Inspect student payment screenshots with zoom preview, verify UTR reference numbers, and 1-click **Approve** (unlocks student access instantly) or **Reject** with custom feedback notes.
- **Payment Settings**: Dynamically update UPI ID, Payee Name, All-Access Price, and WhatsApp support number.

---

## 🛠️ Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Motion, Canvas-Confetti.
- **Backend & Database**: Cloud Firestore, Firebase Authentication, and a zero-fail persistent local synchronization layer.
- **Security**: Granular Firestore security rules (`firestore.rules`) preventing unauthorized writes, privilege escalation, or self-approvals.

---

## 💻 Local Development & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```

---

## 🔐 Firebase Configuration & Console Setup

### Target Project Details
- **Project ID**: `skillflix-academy`

### Manual Firebase Console Setup Checklist
1. **Firebase Authentication**:
   - Navigate to [Firebase Console](https://console.firebase.google.com/) -> Build -> Authentication.
   - Enable **Email/Password**, **Google**, and **Phone** under **Sign-in method**.
   - Under **Settings → Authorized domains**, add `127.0.0.1` and `localhost` (hostnames only; no scheme or port).
2. **Cloud Firestore**:
   - In project `skillflix-academy`, check that the existing Firestore database and data are present. The app uses the default database and its existing collections; do not create replacement collections.
   - Review the current project rules against `firestore.rules` before publishing any changes so existing policies are not accidentally overwritten.
3. **Admin Account Setup**:
   - Register or sign in with the intended Firebase Authentication account.
   - Admin roles are assigned through authorized admin management. The protected owner identity is `editpeakstudio@gmail.com` only when Firebase Auth marks that exact email as verified; Firestore Rules enforce that signed token condition. See `docs/FIREBASE_AUTH_SETUP.md`.

---

## Testing Guide

Use a real Firebase Authentication student account to verify the student experience and payment flow. Verify admin actions with an account explicitly authorized as an admin in Firestore. Platform-owner actions require signing in as the verified `editpeakstudio@gmail.com` account. The website does not provide demo sign-in or account-switching shortcuts.
     - Click **Add New Video Lesson** to upload a new lesson.
