export type UserRole = 'master_admin' | 'admin' | 'user';

export type PredefinedRole = 
  | 'owner'
  | 'master_admin'
  | 'admin'
  | 'video_manager'
  | 'finance_manager'
  | 'student_support'
  | 'custom';

export type PermissionKey =
  | 'dashboard.view'
  | 'analytics.view'
  | 'folders.create'
  | 'folders.edit'
  | 'folders.delete'
  | 'videos.create'
  | 'videos.edit'
  | 'videos.delete'
  | 'pdfs.create'
  | 'pdfs.edit'
  | 'pdfs.delete'
  | 'students.manage'
  | 'payments.verify'
  | 'settings.manage'
  | 'admins.manage'
  | 'master_admins.manage'
  | 'audit.view';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  group: 'Dashboard' | 'Content Management' | 'Media' | 'Students & Access' | 'Finance' | 'Administration';
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  { key: 'dashboard.view', label: 'View Dashboard & Stats', description: 'Access basic dashboard metrics and counters', group: 'Dashboard' },
  { key: 'analytics.view', label: 'Financial & Sales Analytics', description: 'View financial charts, revenue numbers, and sales records', group: 'Dashboard' },
  { key: 'folders.create', label: 'Create Folders & Subfolders', description: 'Add new nested content categories and subfolders', group: 'Content Management' },
  { key: 'folders.edit', label: 'Edit & Move Folders', description: 'Rename folders, change thumbnails, and move nesting hierarchy', group: 'Content Management' },
  { key: 'folders.delete', label: 'Delete Folders', description: 'Delete folders and choose whether to retain or purge contents', group: 'Content Management' },
  { key: 'videos.create', label: 'Add & Upload Videos', description: 'Add new video lessons and embed URLs', group: 'Media' },
  { key: 'videos.edit', label: 'Edit & Reorder Videos', description: 'Change titles, descriptions, video links, thumbnails, and orders', group: 'Media' },
  { key: 'videos.delete', label: 'Delete Videos', description: 'Remove video lessons from the platform', group: 'Media' },
  { key: 'pdfs.create', label: 'Upload PDF Materials', description: 'Add study guides, cheat sheets, and blueprints', group: 'Media' },
  { key: 'pdfs.edit', label: 'Edit & Update PDFs', description: 'Modify PDF titles, categories, and documents', group: 'Media' },
  { key: 'pdfs.delete', label: 'Delete PDFs', description: 'Remove PDF documents from library', group: 'Media' },
  { key: 'students.manage', label: 'Manage Students & Access', description: 'View student directory, unlock categories, toggle all-access passes', group: 'Students & Access' },
  { key: 'payments.verify', label: 'Verify Payments & Receipts', description: 'Approve or reject UPI screenshots and credit course access', group: 'Finance' },
  { key: 'settings.manage', label: 'Platform & UPI Gateway Settings', description: 'Modify UPI ID, payee names, support contacts, and pass prices', group: 'Administration' },
  { key: 'admins.manage', label: 'Manage & Appoint Admins', description: 'Create normal admins, assign permission roles, and suspend admins', group: 'Administration' },
  { key: 'master_admins.manage', label: 'Manage Master Admins (Owner Only)', description: 'Appoint or remove Master Admins (strictly restricted to owner)', group: 'Administration' },
  { key: 'audit.view', label: 'View Security Audit Logs', description: 'Inspect timestamped records of administrative actions and role changes', group: 'Administration' }
];

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  predefinedRole?: PredefinedRole;
  assignedRoleTitle?: string;
  permissions?: PermissionKey[];
  isSuspended?: boolean;
  hasAllAccess: boolean;
  allowedCategories: string[]; // List of category/root folder IDs user can access
  allowedFolders?: string[]; // Specific subfolder overrides if applicable
  subscriptionStatus: SubscriptionStatus;
  accessExpiry?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  slug?: string;
  parentId: string | null; // null = root course/category
  categoryId?: string; // root course affiliation for access entitlement
  categoryName?: string;
  description?: string;
  thumbnailUrl?: string;
  order: number;
  videoCount?: number;
  pdfCount?: number;
  subfolderCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string;
  description?: string;
  price: number; // e.g. 299 for individual category pass
  videoCount?: number;
  pdfCount?: number;
  subfolderCount?: number;
  isActive: boolean;
  order?: number;
  createdAt: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  folderId?: string; // Subfolder ID if nested, defaults to categoryId
  folderName?: string;
  episode: string; // e.g. "EP1", "EP2", "FULL COURSE"
  videoUrl: string; // YouTube, MP4, Vimeo, embed URL
  thumbnailUrl: string;
  duration: string; // e.g. "14:20"
  isPublished: boolean;
  isFreePreview: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PdfResource {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  folderId?: string; // Subfolder ID if nested, defaults to categoryId
  folderName?: string;
  pdfUrl: string;
  thumbnailUrl?: string;
  pageCount: number;
  fileSize?: string;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRequest {
  id: string;
  uid: string;
  userEmail: string;
  userName: string;
  planType: 'all_access' | 'category';
  categoryId?: string;
  categoryName?: string;
  amount: number;
  utr: string; // Transaction reference / UTR
  proofUrl: string; // Base64 data URI or remote image URL
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  submittedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PlatformSettings {
  platformName: string;
  upiId: string;
  payeeName: string;
  paymentPhone?: string; // Payment Contact Mobile Number
  allAccessPrice: number;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportTelegram: string;
}

export interface SalesRecord {
  id: string;
  requestId: string;
  amount: number;
  userEmail: string;
  planType: string;
  categoryName?: string;
  date: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string; // e.g. "role.promote", "permissions.update", "admin.suspend", "folder.create", "video.delete"
  targetUid?: string;
  targetEmail?: string;
  details: string;
}
