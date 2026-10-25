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

### 🛡️ 2. Admin Console (`editpeakstudio@gmail.com`)
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
- **Project ID**: `skill-flix-98ebc`
- **Owner / Master Admin Email**: `editpeakstudio@gmail.com`

### Manual Firebase Console Setup Checklist
1. **Firebase Authentication**:
   - Navigate to [Firebase Console](https://console.firebase.google.com/) -> Build -> Authentication.
   - Enable the **Email/Password** sign-in provider under the "Sign-in method" tab.
   - (Optional) Enable **Google Sign-In** provider if desired.
2. **Cloud Firestore**:
   - Navigate to Build -> Firestore Database -> Create Database.
   - Select your preferred cloud region (e.g. `asia-south1` or `us-central1`).
   - Copy the contents of `firestore.rules` into the "Rules" tab in Firestore Console and click **Publish**.
3. **Admin Account Appointment**:
   - Register or sign in with `editpeakstudio@gmail.com`.
   - The platform automatically assigns `master_admin` privileges and universal access to this address.

---

## 🧪 Testing Guide

1. **Testing Student Experience**:
   - Open the app. Click **Sign In** -> select **Demo Student** (`factinfinity12@gmail.com`).
   - Browse the homepage and click on any category collection.
   - Click **Get All-Access** to open the checkout modal.
   - Select a sample screenshot file, enter a sample UTR (e.g. `429618039218`), and click **Upload Proof**.
2. **Testing Admin Verification & ON/OFF Toggles**:
   - Open profile or navbar -> click **Switch to Master Admin** (`editpeakstudio@gmail.com`).
   - Open **Admin Console** from the top bar.
   - Navigate to **Payment Requests**: Click **Inspect Screenshot** on the student's submission -> click **Approve & Unlock**.
   - Navigate to **Users (Authority & Subscription)**:
     - Notice the student's status is now active!
     - Test the individual category toggles (`TURN ON` / `TURN OFF`) — updates are instant with zero hanging spinners.
     - Test `Turn ON All` and `Turn OFF All`.
   - Navigate to **Videos (Upload & Manage)**:
     - Click the `Published / Draft` pill — notice the instantaneous toggle and persisted status.
     - Click **Add New Video Lesson** to upload a new lesson.
