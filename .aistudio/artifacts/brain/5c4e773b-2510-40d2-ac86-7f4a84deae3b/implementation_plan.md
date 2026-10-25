# Implementation Plan: Skill-Flix Platform Rebuild

Skill-Flix is a high-performance, dark-themed learning and video masterclass platform inspired by the reference architecture, redesigned with premium visual hierarchy, robust Firebase backend integration, responsive mobile-first UI, and an enterprise-grade Admin Console.

---

## 1. System Architecture & Foundation

### 1.1 Tech Stack & UI Styling
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Motion animations.
- **Visual Design**:
  - Palette: Deep midnight background (`#05070D`), navy card surfaces (`#0c101d`), electric blue accents (`#2563EB` / `#3B82F6`), golden crowns (`#F59E0B`), and vibrant emerald status badges (`#10B981`).
  - Mobile-First: Bottom persistent navigation (`Home`, `Videos`, `PDFs`, `Admin`, `Profile`) matching reference screenshots, paired with responsive desktop navigation.
  - Resilient UI: High-contrast typography, crisp status badges, zero layout shift, skeleton loaders, and interactive toast notifications.

### 1.2 Dual-Mode Firebase Backend with Fail-Safe Persistence
- **Firebase Project**: Configured for `skill-flix-98ebc` with Auth, Firestore, and Storage.
- **Fail-Safe Local Persistence**: In development and preview mode, an automatic synchronization layer guarantees that all operations (admin logins, user registrations, course additions, ON/OFF toggle switches, payment proof approvals) execute flawlessly without blocking or infinite spinners, synchronizing directly with Firestore when connected.
- **Roles & Authority**:
  - `Master Admin`: Owner (`editpeakstudio@gmail.com`) with full platform control, user authority management, and financial analytics.
  - `Admin`: Upload/edit videos & PDFs, toggle user subscriptions, review payments.
  - `User / Student`: Access unlocked lessons, view PDFs, track progress, submit payment proofs.

---

## 2. Student Portal & Learning Experience

### 2.1 Discovery & Category Hub
- **Dynamic Category Collections**: Category tiles for Alight Motion, CapCut, Premiere Pro, After Effects, and custom folders created via Admin.
- **Progress Badges**: Clean badge indicating video count and access status (`11 Videos [✓]` unlocked or `[🔒 Locked]`).
- **Search & Filters**: Real-time search across categories, masterclass titles, and episode tags.

### 2.2 Video Masterclass Player
- Responsive video player supporting YouTube, MP4, Vimeo, and video stream URLs with play/pause, volume, speed, and fullscreen controls.
- Episode navigation sidebar/drawer with episode numbers (e.g., `EP1`, `EP2` ... `FULL COURSE`).
- Lesson progress tracking automatically saved per user.

### 2.3 Curated PDF Reader & Learning Materials
- PDF resources list with preview, page counts, topic descriptions, and secure access gates.
- Download and read capabilities for students with approved access.

### 2.4 Subscription & Payment Workflow
- **Flexible Unlocking**: Universal All-Access Pass (₹999) + Individual Category passes.
- **UPI Integration**: Pre-configured UPI ID `rg570251-1@oksbi` (Payee: Ravi Chauhan / Skill-Flix).
- **Direct UPI App Launchers**: One-tap payment links for PhonePe, Google Pay, Paytm, and BHIM (`upi://pay?pa=...`).
- **Dynamic QR Code**: Real-time high-res QR code for scanning from mobile screens or desktop.
- **Payment Proof Submission**: Students can upload their screenshot, enter their transaction UTR/reference number, and immediately monitor approval status (`Pending`, `Approved`, `Rejected`).
- **WhatsApp Support Link**: Quick assistance routing directly to admin support channel.

---

## 3. High-Reliability Admin Console (`editpeakstudio@gmail.com`)

### 3.1 Financial Sales Analytics & Ledger
- Live real-time ledger displaying gross revenue, monthly revenue, total subscribers, and category revenue share.
- Quick action buttons: `+ Upload Video`, `+ Upload PDF`.

### 3.2 Video & Lesson Management
- Clean creation and editing modal: Title, Category, Episode tag (e.g. `EP1`), Video URL, Thumbnail URL, Description, Duration, and Publication Status toggle.
- Direct inline delete with confirmation, and editing capabilities.

### 3.3 PDF & Resource Management
- Upload & update PDF titles, download links, page counts, and assigned categories.

### 3.4 Categories & Pricing Management
- Create, rename, price, and toggle availability for category collections.

### 3.5 User & Admin Authority Management (Matching Screenshot 1)
- Account filters: `All Accounts`, `Master Admins`, `All Admins`.
- Real-time search by user name, email, or UID.
- User Card details:
  - Account info, Subscription status, Access Expiry date, and Last Login.
  - Multi-Category Access controls: `✨ Turn ON All`, `⏻ Turn OFF All`, and per-category toggle switches.
  - Authority appointments: `👑 Make Master Admin`, `🛡️ Make Admin`.
- **Rock-Solid ON/OFF Toggles**:
  - Optimistic UI updates with instant feedback.
  - Async persistence to database with automatic rollback on error.
  - Zero stuck loading states or unhandled promise rejections.

### 3.6 Payment Requests Review & Verification
- List of submitted proofs with user email, selected pass/category, transaction reference, amount, and timestamp.
- Proof image zoom modal to inspect receipt details.
- `Approve` action: Instantly grants the student lifetime or category access, updates subscription dates, and records in sales ledger.
- `Reject` action: Includes custom admin reason/note visible to the student.

### 3.7 Payment & General Settings
- Configurable UPI ID, recipient name, All-Access Pass price, WhatsApp support number, and platform branding.

---

## 4. Verification & Testing Protocol

1. **Compilation & Syntax**: Build with TypeScript and Vite without warnings or errors.
2. **Authentication Flow**: Student registration, login, logout, and persistent session across reloads.
3. **Role Enforcement**: Master Admin access restricted to `editpeakstudio@gmail.com` and appointed admins; student access denied from admin routes.
4. **Admin Content Operations**: Add new categories, upload videos, add PDFs, publish/unpublish toggles, verify persistence after refresh.
5. **Payment Submission & Approval**: Test proof submission by student -> approve in Admin Console -> verify student content immediately unlocks.
6. **Mobile Responsiveness**: Test touch navigation, bottom bar, modal sheets, and card layouts on mobile viewport dimensions.
