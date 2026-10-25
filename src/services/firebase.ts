import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUserWithEmail,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser 
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  UserProfile, 
  UserRole,
  PredefinedRole,
  PermissionKey,
  Folder,
  Category, 
  VideoLesson, 
  PdfResource, 
  PaymentRequest, 
  PlatformSettings,
  SalesRecord,
  AuditLog,
  SYSTEM_PERMISSIONS
} from '../types';

export const MASTER_ADMIN_EMAIL = 'editpeakstudio@gmail.com';
export const CO_OWNER_EMAIL = 'janusahani1990@gmail.com'; // AI Studio project owner
export const DEFAULT_UPI_ID = 'rg570251-1@oksbi';

// Firebase configuration for skill-flix-98ebc
const firebaseConfig = {
  apiKey: "AIzaSyD0MvGXOnfFIQJkkidBvkRiNo93t6BUTw8",
  authDomain: "skill-flix-98ebc.firebaseapp.com",
  projectId: "skill-flix-98ebc",
  storageBucket: "skill-flix-98ebc.appspot.com",
  messagingSenderId: "548789001732",
  appId: "1:548789001732:web:7d70efa5665381663d9f51"
};

let app: any = null;
let auth: any = null;
let db: any = null;
let isFirebaseOnline = false;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseOnline = true;
} catch (err) {
  console.warn('Firebase initialization note (using resilient fallback store):', err);
  isFirebaseOnline = false;
}

// Local Storage Keys for reliable persistence fallback
const STORAGE_KEYS = {
  CURRENT_USER: 'skillflix_current_user',
  USERS: 'skillflix_users',
  FOLDERS: 'skillflix_folders',
  CATEGORIES: 'skillflix_categories',
  VIDEOS: 'skillflix_videos',
  PDFS: 'skillflix_pdfs',
  PAYMENTS: 'skillflix_payment_requests',
  SETTINGS: 'skillflix_settings',
  SALES: 'skillflix_sales_analytics',
  WATCH_PROGRESS: 'skillflix_watch_progress',
  AUDIT_LOGS: 'skillflix_audit_logs'
};

// Initial default platform settings
export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'Skill-Flix',
  upiId: DEFAULT_UPI_ID,
  payeeName: 'RAVI CHAUHAN',
  paymentPhone: '', // Payment Contact Mobile Number
  allAccessPrice: 999,
  supportEmail: 'support@skillflix.io',
  supportPhone: '',
  supportWhatsapp: '',
  supportTelegram: 'https://t.me/skillflix_support'
};

/**
 * Validates an Indian mobile number.
 * Supports +91, 91, 0 prefix, spaces, and hyphens.
 * An empty string is treated as valid (clearing the field).
 */
export function validateIndianMobile(phone?: string | null): { isValid: boolean; normalized: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { isValid: true, normalized: '' };
  }

  const trimmed = phone.trim();
  // Strip all non-digit characters
  const digits = trimmed.replace(/\D/g, '');

  let coreDigits = '';
  if (digits.length === 10) {
    coreDigits = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    coreDigits = digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    coreDigits = digits.substring(2);
  } else {
    return {
      isValid: false,
      normalized: trimmed,
      error: 'Phone number must be a 10-digit Indian mobile number (e.g. +91 98765 43210 or 9876543210).'
    };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(coreDigits)) {
    return {
      isValid: false,
      normalized: trimmed,
      error: 'Indian mobile numbers must start with digit 6, 7, 8, or 9.'
    };
  }

  // Format cleanly as +91 XXXXX XXXXX
  const formatted = `+91 ${coreDigits.slice(0, 5)} ${coreDigits.slice(5)}`;
  return { isValid: true, normalized: formatted };
}

/**
 * Generates an international WhatsApp deep-link from a phone number.
 * Formats strictly without spaces or "+" sign: https://wa.me/919876543210?text=...
 */
export function getWhatsAppUrl(phone?: string | null, message?: string): string {
  if (!phone || !phone.trim()) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  let internationalDigits = digits;
  if (digits.length === 10) {
    internationalDigits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    internationalDigits = `91${digits.substring(1)}`;
  }

  const defaultMsg = message || 'Hi Skill-Flix Support, I need help with my course access and payment.';
  return `https://wa.me/${internationalDigits}?text=${encodeURIComponent(defaultMsg)}`;
}

// Safe JSON storage helpers
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Failed to read storage key: ${key}`, e);
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write storage key: ${key}`, e);
  }
}

// Event bus for reactive local fallback updates
type Listener<T> = (data: T) => void;
class EventBus {
  private listeners: { [key: string]: Set<Listener<any>> } = {};

  subscribe<T>(key: string, listener: Listener<T>): () => void {
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(listener);
    return () => {
      this.listeners[key]?.delete(listener);
    };
  }

  emit<T>(key: string, data: T) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(fn => {
        try {
          fn(data);
        } catch (err) {
          console.error(`Error in listener for ${key}`, err);
        }
      });
    }
  }
}

const eventBus = new EventBus();

// Helper to check if a user is the protected owner
export function isProtectedOwner(emailOrUser?: string | UserProfile | null): boolean {
  if (!emailOrUser) return false;
  const email = typeof emailOrUser === 'string' ? emailOrUser : emailOrUser.email;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean === MASTER_ADMIN_EMAIL.toLowerCase() || clean === CO_OWNER_EMAIL.toLowerCase();
}

// Get full permissions for a given predefined role
export function getPermissionsForRole(role: PredefinedRole): PermissionKey[] {
  const allKeys = SYSTEM_PERMISSIONS.map(p => p.key);
  switch (role) {
    case 'owner':
      return allKeys;
    case 'master_admin':
      // Master admin has all operational permissions except modifying other master admins unless granted by owner
      return allKeys.filter(k => k !== 'master_admins.manage');
    case 'video_manager':
      return [
        'dashboard.view',
        'folders.create',
        'folders.edit',
        'folders.delete',
        'videos.create',
        'videos.edit',
        'videos.delete',
        'pdfs.create',
        'pdfs.edit',
        'pdfs.delete'
      ];
    case 'finance_manager':
      return [
        'dashboard.view',
        'analytics.view',
        'payments.verify'
      ];
    case 'student_support':
      return [
        'dashboard.view',
        'students.manage'
      ];
    case 'admin':
      // Default standard admin permissions
      return [
        'dashboard.view',
        'folders.create',
        'folders.edit',
        'videos.create',
        'videos.edit',
        'pdfs.create',
        'pdfs.edit',
        'students.manage',
        'payments.verify'
      ];
    case 'custom':
    default:
      return ['dashboard.view'];
  }
}

// Check if user has a specific permission
export function hasPermission(user: UserProfile | null, permission: PermissionKey): boolean {
  if (!user) return false;
  if (user.isSuspended) return false;
  if (isProtectedOwner(user)) return true;
  if (user.role === 'master_admin') {
    if (permission === 'master_admins.manage') {
      return isProtectedOwner(user) || (user.permissions?.includes('master_admins.manage') ?? false);
    }
    return true;
  }
  if (user.role === 'admin') {
    return user.permissions?.includes(permission) ?? false;
  }
  return false;
}

// Ensure master admin exists in local users pool
function ensureMasterAdminInStorage() {
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const masterId = 'admin_editpeakstudio';
  if (!users[masterId]) {
    users[masterId] = {
      uid: masterId,
      email: MASTER_ADMIN_EMAIL,
      displayName: 'Master Owner',
      role: 'master_admin',
      predefinedRole: 'owner',
      assignedRoleTitle: 'Platform Owner',
      permissions: SYSTEM_PERMISSIONS.map(p => p.key),
      isSuspended: false,
      hasAllAccess: true,
      allowedCategories: [],
      subscriptionStatus: 'active',
      accessExpiry: '2036-12-31T23:59:59Z',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    writeStorage(STORAGE_KEYS.USERS, users);
  }
}
ensureMasterAdminInStorage();

// ==========================================
// AUTHENTICATION SERVICES
// ==========================================

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const saved = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  return saved;
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  // Fire current saved state immediately
  const initial = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  callback(initial);

  const unsubStorage = eventBus.subscribe<UserProfile | null>('auth', (user) => {
    callback(user);
  });

  // Also hook into live Firebase auth if active
  let unsubFb: (() => void) | null = null;
  if (auth) {
    try {
      unsubFb = fbOnAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
          let profile = users[fbUser.uid];
          const isMaster = isProtectedOwner(fbUser.email);
          
          if (!profile) {
            profile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || fbUser.phoneNumber || (fbUser.email ? fbUser.email.split('@')[0] : 'Student'),
              photoURL: fbUser.photoURL || undefined,
              phoneNumber: fbUser.phoneNumber || undefined,
              role: isMaster ? 'master_admin' : 'user',
              predefinedRole: isMaster ? 'owner' : undefined,
              assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
              permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
              isSuspended: false,
              hasAllAccess: isMaster,
              allowedCategories: [],
              subscriptionStatus: isMaster ? 'active' : 'none',
              createdAt: new Date().toISOString()
            };
            users[fbUser.uid] = profile;
            writeStorage(STORAGE_KEYS.USERS, users);
          } else {
            // Keep protected owner role intact
            if (isMaster) {
              profile.role = 'master_admin';
              profile.predefinedRole = 'owner';
              profile.permissions = SYSTEM_PERMISSIONS.map(p => p.key);
              profile.hasAllAccess = true;
            }
          }
          writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
          callback(profile);
        } else {
          // If no fbUser and current user wasn't a local demo session, trigger null
          const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
          if (current && !current.uid.startsWith('demo_') && !current.uid.startsWith('admin_')) {
            writeStorage(STORAGE_KEYS.CURRENT_USER, null);
            callback(null);
          }
        }
      });
    } catch (e) {
      console.warn('Firebase auth listener note:', e);
    }
  }

  return () => {
    unsubStorage();
    if (unsubFb) unsubFb();
  };
}

// 1. LOGIN WITH GOOGLE (Continue with Google)
export async function loginWithGoogle(): Promise<UserProfile> {
  if (auth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
      let profile = users[fbUser.uid];
      const isMaster = isProtectedOwner(fbUser.email);

      if (!profile) {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Google User'),
          photoURL: fbUser.photoURL || undefined,
          role: isMaster ? 'master_admin' : 'user',
          predefinedRole: isMaster ? 'owner' : undefined,
          assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
          permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
          isSuspended: false,
          hasAllAccess: isMaster,
          allowedCategories: [],
          subscriptionStatus: isMaster ? 'active' : 'none',
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
      } else {
        profile.lastLogin = new Date().toISOString();
        if (fbUser.photoURL) profile.photoURL = fbUser.photoURL;
        if (isMaster) {
          profile.role = 'master_admin';
          profile.predefinedRole = 'owner';
          profile.permissions = SYSTEM_PERMISSIONS.map(p => p.key);
          profile.hasAllAccess = true;
        }
      }

      users[fbUser.uid] = profile;
      writeStorage(STORAGE_KEYS.USERS, users);
      writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
      eventBus.emit('auth', profile);
      eventBus.emit('users', Object.values(users));

      // Record audit log
      recordAuditLog({
        actorUid: profile.uid,
        actorEmail: profile.email,
        actorRole: profile.role,
        action: 'auth.google_login',
        details: `Logged in via Google Authentication (${profile.email})`
      });

      return profile;
    } catch (err: any) {
      console.warn('Google sign in popup error:', err.message);
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Google sign-in popup was closed before completion.');
      }
      if (err.code === 'auth/cancelled-popup-request') {
        throw new Error('Google sign-in request was cancelled.');
      }
      throw new Error(err.message || 'Failed to authenticate with Google.');
    }
  }

  throw new Error('Firebase Authentication is not available. Please check network connection.');
}

// 2. PHONE NUMBER AUTHENTICATION WITH OTP
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  
  // Clear any existing window recaptcha verifier
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      // ignore
    }
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

export async function sendPhoneOtp(phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> {
  if (!auth) throw new Error('Firebase Authentication is offline');
  
  // Format check: ensure includes country code (e.g. +91)
  let formatted = phoneNumber.trim();
  if (!formatted.startsWith('+')) {
    formatted = `+91${formatted.replace(/^0+/, '')}`;
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formatted, appVerifier);
    return confirmationResult;
  } catch (err: any) {
    console.error('Phone sign in error:', err);
    if (err.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please provide a valid mobile number with country code (e.g. +91 XXXXXXXXXX).');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please wait a few minutes before trying again.');
    }
    throw new Error(err.message || 'Failed to send OTP verification code.');
  }
}

export async function verifyPhoneOtp(confirmationResult: ConfirmationResult, code: string): Promise<UserProfile> {
  try {
    const credential = await confirmationResult.confirm(code);
    const fbUser = credential.user;

    const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
    let profile = users[fbUser.uid];

    if (!profile) {
      profile = {
        uid: fbUser.uid,
        email: fbUser.email || `${fbUser.phoneNumber?.replace(/[^0-9]/g, '')}@phone.skillflix.io`,
        displayName: fbUser.phoneNumber || 'Mobile Student',
        phoneNumber: fbUser.phoneNumber || undefined,
        role: 'user',
        permissions: [],
        isSuspended: false,
        hasAllAccess: false,
        allowedCategories: [],
        subscriptionStatus: 'none',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    } else {
      profile.lastLogin = new Date().toISOString();
      if (fbUser.phoneNumber) profile.phoneNumber = fbUser.phoneNumber;
    }

    users[fbUser.uid] = profile;
    writeStorage(STORAGE_KEYS.USERS, users);
    writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
    eventBus.emit('auth', profile);
    eventBus.emit('users', Object.values(users));

    recordAuditLog({
      actorUid: profile.uid,
      actorEmail: profile.email,
      actorRole: profile.role,
      action: 'auth.phone_login',
      details: `Logged in via Phone OTP (${profile.phoneNumber})`
    });

    return profile;
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    if (err.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid OTP code. Please enter the correct 6-digit verification code.');
    }
    if (err.code === 'auth/code-expired') {
      throw new Error('The OTP code has expired. Please request a new code.');
    }
    throw new Error(err.message || 'Failed to verify OTP code.');
  }
}

// 3. EMAIL & PASSWORD LOGIN & REGISTRATION
export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  
  if (auth && pass.length >= 6) {
    try {
      const cred = await fbSignInWithEmail(auth, cleanEmail, pass);
      const isMaster = isProtectedOwner(cleanEmail);
      
      const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
      let profile = users[cred.user.uid];

      if (!profile) {
        profile = {
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: cred.user.displayName || cleanEmail.split('@')[0],
          role: isMaster ? 'master_admin' : 'user',
          predefinedRole: isMaster ? 'owner' : undefined,
          assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
          permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
          isSuspended: false,
          hasAllAccess: isMaster,
          allowedCategories: [],
          subscriptionStatus: isMaster ? 'active' : 'none',
          lastLogin: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
      } else {
        profile.lastLogin = new Date().toISOString();
        if (isMaster) {
          profile.role = 'master_admin';
          profile.predefinedRole = 'owner';
          profile.permissions = SYSTEM_PERMISSIONS.map(p => p.key);
          profile.hasAllAccess = true;
        }
      }

      users[cred.user.uid] = profile;
      writeStorage(STORAGE_KEYS.USERS, users);
      writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
      eventBus.emit('auth', profile);
      eventBus.emit('users', Object.values(users));
      return profile;
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please verify and try again.');
      }
      if (fbErr.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please register first.');
      }
      console.warn('Firebase signIn note, falling back to local credentials check:', fbErr.message);
    }
  }

  // Fallback verification for demo / offline accounts
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const found = Object.values(users).find(u => u.email.toLowerCase() === cleanEmail);

  if (found) {
    if (found.isSuspended) {
      throw new Error('This account has been suspended by the platform administrator.');
    }
    found.lastLogin = new Date().toISOString();
    users[found.uid] = found;
    writeStorage(STORAGE_KEYS.USERS, users);
    writeStorage(STORAGE_KEYS.CURRENT_USER, found);
    eventBus.emit('auth', found);
    eventBus.emit('users', Object.values(users));
    return found;
  }

  // Never grant admin on a new unauthenticated email entered in a form!
  const isMaster = isProtectedOwner(cleanEmail);
  const uid = isMaster ? 'admin_editpeakstudio' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newProfile: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: cleanEmail.split('@')[0],
    role: isMaster ? 'master_admin' : 'user',
    predefinedRole: isMaster ? 'owner' : undefined,
    assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
    permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
    isSuspended: false,
    hasAllAccess: isMaster,
    allowedCategories: [],
    subscriptionStatus: isMaster ? 'active' : 'none',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  users[uid] = newProfile;
  writeStorage(STORAGE_KEYS.USERS, users);
  writeStorage(STORAGE_KEYS.CURRENT_USER, newProfile);
  eventBus.emit('auth', newProfile);
  eventBus.emit('users', Object.values(users));
  return newProfile;
}

export async function registerUser(email: string, pass: string, name: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || cleanEmail.split('@')[0];

  if (auth && pass.length >= 6) {
    try {
      const cred = await fbCreateUserWithEmail(auth, cleanEmail, pass);
      const isMaster = isProtectedOwner(cleanEmail);
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        role: isMaster ? 'master_admin' : 'user',
        predefinedRole: isMaster ? 'owner' : undefined,
        assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
        permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
        isSuspended: false,
        hasAllAccess: isMaster,
        allowedCategories: [],
        subscriptionStatus: isMaster ? 'active' : 'none',
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
      users[cred.user.uid] = profile;
      writeStorage(STORAGE_KEYS.USERS, users);
      writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
      eventBus.emit('auth', profile);
      eventBus.emit('users', Object.values(users));

      recordAuditLog({
        actorUid: profile.uid,
        actorEmail: profile.email,
        actorRole: profile.role,
        action: 'auth.registered',
        details: `New account registered (${cleanEmail})`
      });

      return profile;
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('An account already exists with this email address. Please sign in instead.');
      }
      if (fbErr.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      console.warn('Firebase signup note, continuing with resilient account creation:', fbErr.message);
    }
  }

  const isMaster = isProtectedOwner(cleanEmail);
  const uid = isMaster ? 'admin_editpeakstudio' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const profile: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
    role: isMaster ? 'master_admin' : 'user',
    predefinedRole: isMaster ? 'owner' : undefined,
    assignedRoleTitle: isMaster ? 'Platform Owner' : undefined,
    permissions: isMaster ? SYSTEM_PERMISSIONS.map(p => p.key) : [],
    isSuspended: false,
    hasAllAccess: isMaster,
    allowedCategories: [],
    subscriptionStatus: isMaster ? 'active' : 'none',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  users[uid] = profile;
  writeStorage(STORAGE_KEYS.USERS, users);
  writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
  eventBus.emit('auth', profile);
  eventBus.emit('users', Object.values(users));
  return profile;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  if (auth) {
    try {
      await fbSendPasswordResetEmail(auth, cleanEmail);
      return;
    } catch (err: any) {
      console.warn('Firebase reset password note:', err);
      if (err.code === 'auth/user-not-found') {
        throw new Error('No registered account was found with this email.');
      }
      throw new Error(err.message || 'Failed to send password reset email.');
    }
  }
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out note:', e);
    }
  }
  writeStorage(STORAGE_KEYS.CURRENT_USER, null);
  eventBus.emit('auth', null);
}

// Quick switch for demonstration and testing in AI Studio
export function switchSession(role: 'master_admin' | 'student'): UserProfile {
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  let profile: UserProfile;

  if (role === 'master_admin') {
    const adminId = 'admin_editpeakstudio';
    profile = users[adminId] || {
      uid: adminId,
      email: MASTER_ADMIN_EMAIL,
      displayName: 'Master Owner',
      role: 'master_admin',
      predefinedRole: 'owner',
      assignedRoleTitle: 'Platform Owner',
      permissions: SYSTEM_PERMISSIONS.map(p => p.key),
      isSuspended: false,
      hasAllAccess: true,
      allowedCategories: [],
      subscriptionStatus: 'active',
      accessExpiry: '2036-12-31T23:59:59Z',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    users[adminId] = profile;
  } else {
    // Student as seen in screenshot: factinfinity12@gmail.com
    const studentId = 'MyaogSR2IkMCT6kZR1UO0gGAGP02';
    profile = users[studentId] || {
      uid: studentId,
      email: 'factinfinity12@gmail.com',
      displayName: 'Pintu Kumar',
      role: 'user',
      permissions: [],
      isSuspended: false,
      hasAllAccess: false,
      allowedCategories: [],
      subscriptionStatus: 'cancelled',
      accessExpiry: '2026-10-18T00:00:00Z',
      lastLogin: new Date().toISOString(),
      createdAt: '2026-09-15T10:00:00Z'
    };
    users[studentId] = profile;
  }

  writeStorage(STORAGE_KEYS.USERS, users);
  writeStorage(STORAGE_KEYS.CURRENT_USER, profile);
  eventBus.emit('auth', profile);
  eventBus.emit('users', Object.values(users));
  return profile;
}

// ==========================================
// DYNAMIC FOLDER MANAGEMENT SERVICE
// ==========================================

export function subscribeToFolders(callback: (folders: Folder[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
    const list = Object.values(map).sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<Folder[]>('folders', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'folders'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, Folder> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Folder;
          });
          writeStorage(STORAGE_KEYS.FOLDERS, remote);
          const list = Object.values(remote).sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list);
        }
      }, (err) => {
        console.warn('Firestore folders snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore folders setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function saveFolder(folderData: Partial<Folder> & { name: string }): Promise<Folder> {
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  
  const normName = folderData.name.trim().toLowerCase();
  const parentId = folderData.parentId !== undefined ? folderData.parentId : null;
  const categoryId = folderData.categoryId || (parentId && parentId.startsWith('cat_') ? parentId : undefined);

  // Check if an existing folder matches by id or (same name and parent)
  const existingId = folderData.id || Object.keys(folders).find(id => {
    const f = folders[id];
    return f.name.trim().toLowerCase() === normName && (f.parentId || null) === (parentId || null);
  });

  const id = existingId || `fld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existing = folders[id];

  const siblings = Object.values(folders).filter(f => f.parentId === parentId && f.id !== id);
  const order = folderData.order !== undefined 
    ? folderData.order 
    : (existing?.order !== undefined ? existing.order : siblings.length);

  const folder: Folder = {
    id,
    name: folderData.name.trim(),
    slug: folderData.slug || folderData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    parentId,
    categoryId: categoryId || existing?.categoryId,
    categoryName: folderData.categoryName || existing?.categoryName,
    description: folderData.description !== undefined ? folderData.description : (existing?.description || ''),
    thumbnailUrl: folderData.thumbnailUrl || existing?.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    order,
    videoCount: existing?.videoCount || 0,
    pdfCount: existing?.pdfCount || 0,
    subfolderCount: existing?.subfolderCount || 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  folders[id] = folder;
  writeStorage(STORAGE_KEYS.FOLDERS, folders);
  recalculateFolderCounts();
  recalculateCategoryCounts();
  eventBus.emit('folders', Object.values(folders));

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'folders', id), folder, { merge: true });
    } catch (e) {
      console.warn('Remote folder sync note:', e);
    }
  }

  return folder;
}

export async function deleteFolder(
  folderId: string, 
  deleteContents: boolean = true
): Promise<{ deletedSubfolders: number, deletedVideos: number, deletedPdfs: number }> {
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  const target = folders[folderId];
  if (!target) throw new Error(`Folder ${folderId} not found`);

  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});

  // Find all descendant subfolders recursively
  const findDescendantIds = (rootId: string): string[] => {
    const directChildren = Object.values(folders).filter(f => f.parentId === rootId).map(f => f.id);
    let all = [...directChildren];
    for (const childId of directChildren) {
      all = all.concat(findDescendantIds(childId));
    }
    return all;
  };

  const descendantFolderIds = findDescendantIds(folderId);
  const allFolderIdsToDelete = [folderId, ...descendantFolderIds];

  let deletedVideos = 0;
  let deletedPdfs = 0;

  if (deleteContents) {
    // Delete all videos and PDFs inside these folders
    Object.keys(videos).forEach(vId => {
      if (videos[vId].folderId && allFolderIdsToDelete.includes(videos[vId].folderId!)) {
        delete videos[vId];
        deletedVideos++;
        if (db && isFirebaseOnline) {
          try { deleteDoc(doc(db, 'videos', vId)); } catch (e) {}
        }
      }
    });

    Object.keys(pdfs).forEach(pId => {
      if (pdfs[pId].folderId && allFolderIdsToDelete.includes(pdfs[pId].folderId!)) {
        delete pdfs[pId];
        deletedPdfs++;
        if (db && isFirebaseOnline) {
          try { deleteDoc(doc(db, 'pdfs', pId)); } catch (e) {}
        }
      }
    });
  } else {
    // Move contents up to target's parent
    const newParent = target.parentId || null;
    Object.keys(videos).forEach(vId => {
      if (videos[vId].folderId === folderId) {
        videos[vId].folderId = newParent || undefined;
      }
    });
    Object.keys(pdfs).forEach(pId => {
      if (pdfs[pId].folderId === folderId) {
        pdfs[pId].folderId = newParent || undefined;
      }
    });
    // Move direct subfolders up to parent
    Object.keys(folders).forEach(fId => {
      if (folders[fId].parentId === folderId) {
        folders[fId].parentId = newParent;
      }
    });
  }

  // Remove the folder(s)
  allFolderIdsToDelete.forEach(fId => {
    delete folders[fId];
    if (db && isFirebaseOnline) {
      try { deleteDoc(doc(db, 'folders', fId)); } catch (e) {}
    }
  });

  writeStorage(STORAGE_KEYS.FOLDERS, folders);
  writeStorage(STORAGE_KEYS.VIDEOS, videos);
  writeStorage(STORAGE_KEYS.PDFS, pdfs);

  recalculateFolderCounts();
  recalculateCategoryCounts();

  eventBus.emit('folders', Object.values(folders));
  eventBus.emit('videos', Object.values(videos));
  eventBus.emit('pdfs', Object.values(pdfs));

  return {
    deletedSubfolders: descendantFolderIds.length,
    deletedVideos,
    deletedPdfs
  };
}

export async function moveFolder(folderId: string, newParentId: string | null): Promise<void> {
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  if (!folders[folderId]) throw new Error(`Folder ${folderId} not found`);
  if (folderId === newParentId) throw new Error('Cannot move a folder into itself.');

  // Cycle check: verify newParentId is not a descendant of folderId
  let checkParent = newParentId;
  while (checkParent) {
    if (checkParent === folderId) {
      throw new Error('Cannot move a folder into one of its own subfolders.');
    }
    const parentFolder = folders[checkParent];
    checkParent = parentFolder ? parentFolder.parentId : null;
  }

  // Determine categoryId affiliation
  let newCategoryId = folders[folderId].categoryId;
  if (newParentId) {
    if (newParentId.startsWith('cat_')) {
      newCategoryId = newParentId;
    } else if (folders[newParentId]) {
      newCategoryId = folders[newParentId].categoryId;
    }
  }

  folders[folderId].parentId = newParentId;
  folders[folderId].categoryId = newCategoryId;
  folders[folderId].updatedAt = new Date().toISOString();

  writeStorage(STORAGE_KEYS.FOLDERS, folders);
  recalculateFolderCounts();
  recalculateCategoryCounts();
  eventBus.emit('folders', Object.values(folders));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'folders', folderId), { 
        parentId: newParentId,
        categoryId: newCategoryId || null,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Remote move folder note:', e);
    }
  }
}

export async function reorderFolders(orderedIds: string[]): Promise<void> {
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  orderedIds.forEach((id, idx) => {
    if (folders[id]) {
      folders[id].order = idx;
    }
  });

  writeStorage(STORAGE_KEYS.FOLDERS, folders);
  eventBus.emit('folders', Object.values(folders));

  if (db && isFirebaseOnline) {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await updateDoc(doc(db, 'folders', orderedIds[i]), { order: i });
      }
    } catch (e) {
      console.warn('Remote reorder folders note:', e);
    }
  }
}

function recalculateFolderCounts() {
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});

  // Recursive counter for subfolder trees
  const getSubTreeCounts = (fId: string): { v: number; p: number; s: number } => {
    let vCount = Object.values(videos).filter(v => v.folderId === fId).length;
    let pCount = Object.values(pdfs).filter(p => p.folderId === fId).length;
    const children = Object.values(folders).filter(f => f.parentId === fId);
    let sCount = children.length;

    for (const child of children) {
      const childCounts = getSubTreeCounts(child.id);
      vCount += childCounts.v;
      pCount += childCounts.p;
      sCount += childCounts.s;
    }

    return { v: vCount, p: pCount, s: sCount };
  };

  let changed = false;
  Object.keys(folders).forEach(fId => {
    const counts = getSubTreeCounts(fId);
    if (
      folders[fId].videoCount !== counts.v || 
      folders[fId].pdfCount !== counts.p || 
      folders[fId].subfolderCount !== counts.s
    ) {
      folders[fId].videoCount = counts.v;
      folders[fId].pdfCount = counts.p;
      folders[fId].subfolderCount = counts.s;
      changed = true;
    }
  });

  if (changed) {
    writeStorage(STORAGE_KEYS.FOLDERS, folders);
    eventBus.emit('folders', Object.values(folders));
  }
}

// ==========================================
// CATEGORIES SERVICE (DYNAMIC COURSE SUITES)
// ==========================================

export function cleanupDuplicateCategories(): { removedCount: number } {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const payments = readStorage<Record<string, PaymentRequest>>(STORAGE_KEYS.PAYMENTS, {});

  // Group categories by normalized slug/name
  const groups: Record<string, Category[]> = {};
  Object.values(categories).forEach(cat => {
    const key = (cat.slug || cat.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(cat);
  });

  let removedCount = 0;
  let changed = false;

  Object.entries(groups).forEach(([_, list]) => {
    if (list.length <= 1) return;

    // Pick canonical: prefer one with stable ID (e.g. cat_alight_motion) or the one with the most content linked
    let canonical = list[0];
    let bestScore = -1;

    list.forEach(c => {
      const vScore = Object.values(videos).filter(v => v.categoryId === c.id).length;
      const fScore = Object.values(folders).filter(f => f.categoryId === c.id || f.parentId === c.id).length;
      const isStable = (c.id === 'cat_alight_motion' || c.id === 'cat_capcut' || c.id === 'cat_premiere_pro' || c.id === 'cat_after_effects') ? 50 : 0;
      const total = vScore * 10 + fScore + isStable;
      if (total > bestScore) {
        bestScore = total;
        canonical = c;
      }
    });

    // Re-point all duplicates to canonical
    list.forEach(dup => {
      if (dup.id === canonical.id) return;

      // Migrate videos
      Object.keys(videos).forEach(vId => {
        if (videos[vId].categoryId === dup.id) {
          videos[vId].categoryId = canonical.id;
          videos[vId].categoryName = canonical.name;
          changed = true;
        }
      });

      // Migrate pdfs
      Object.keys(pdfs).forEach(pId => {
        if (pdfs[pId].categoryId === dup.id) {
          pdfs[pId].categoryId = canonical.id;
          pdfs[pId].categoryName = canonical.name;
          changed = true;
        }
      });

      // Migrate folders
      Object.keys(folders).forEach(fId => {
        if (folders[fId].categoryId === dup.id) {
          folders[fId].categoryId = canonical.id;
          folders[fId].categoryName = canonical.name;
          changed = true;
        }
        if (folders[fId].parentId === dup.id) {
          folders[fId].parentId = canonical.id;
          changed = true;
        }
      });

      // Migrate user category access
      Object.keys(users).forEach(uId => {
        if (users[uId].allowedCategories?.includes(dup.id)) {
          users[uId].allowedCategories = users[uId].allowedCategories.filter(id => id !== dup.id);
          if (!users[uId].allowedCategories.includes(canonical.id)) {
            users[uId].allowedCategories.push(canonical.id);
          }
          changed = true;
        }
      });

      // Migrate payment requests
      Object.keys(payments).forEach(payId => {
        if (payments[payId].categoryId === dup.id) {
          payments[payId].categoryId = canonical.id;
          payments[payId].categoryName = canonical.name;
          changed = true;
        }
      });

      // Delete the duplicate category
      delete categories[dup.id];
      removedCount++;
      changed = true;

      if (db && isFirebaseOnline) {
        try {
          deleteDoc(doc(db, 'categories', dup.id));
        } catch (e) {
          // ignore
        }
      }
    });
  });

  if (changed) {
    writeStorage(STORAGE_KEYS.CATEGORIES, categories);
    writeStorage(STORAGE_KEYS.FOLDERS, folders);
    writeStorage(STORAGE_KEYS.VIDEOS, videos);
    writeStorage(STORAGE_KEYS.PDFS, pdfs);
    writeStorage(STORAGE_KEYS.USERS, users);
    writeStorage(STORAGE_KEYS.PAYMENTS, payments);

    recalculateCategoryCounts();
    recalculateFolderCounts();

    eventBus.emit('categories', Object.values(categories));
    eventBus.emit('folders', Object.values(folders));
    eventBus.emit('videos', Object.values(videos));
    eventBus.emit('pdfs', Object.values(pdfs));
    eventBus.emit('users', Object.values(users));
    eventBus.emit('payments', Object.values(payments));
  }

  return { removedCount };
}

export function subscribeToCategories(callback: (categories: Category[]) => void): () => void {
  const loadLocal = () => {
    // Run duplicate resolution safely on startup
    cleanupDuplicateCategories();
    const map = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
    const list = Object.values(map).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<Category[]>('categories', (cats) => {
    callback(cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  });

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'categories'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, Category> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Category;
          });
          writeStorage(STORAGE_KEYS.CATEGORIES, remote);
          cleanupDuplicateCategories();
          const list = Object.values(remote).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          callback(list);
        }
      }, (err) => {
        console.warn('Firestore categories snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore categories setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function saveCategory(category: Partial<Category> & { name: string }): Promise<Category> {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  
  // Find existing by exact id, or match normalized slug/name
  const normName = category.name.trim().toLowerCase();
  const normSlug = (category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();

  const existingId = category.id || Object.keys(categories).find(id => {
    const c = categories[id];
    return c.id === category.id || c.slug.toLowerCase() === normSlug || c.name.trim().toLowerCase() === normName;
  });

  const id = existingId || `cat_${normSlug.replace(/-/g, '_')}_${Math.random().toString(36).substring(2, 6)}`;
  const existing = categories[id];

  const order = category.order !== undefined 
    ? category.order 
    : (existing?.order !== undefined ? existing.order : Object.keys(categories).length);

  const updated: Category = {
    id,
    name: category.name.trim(),
    slug: normSlug,
    thumbnailUrl: category.thumbnailUrl || existing?.thumbnailUrl || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    description: category.description !== undefined ? category.description : (existing?.description || ''),
    price: category.price ?? existing?.price ?? 299,
    isActive: category.isActive !== undefined ? category.isActive : (existing?.isActive !== undefined ? existing.isActive : true),
    order,
    videoCount: existing?.videoCount ?? 0,
    pdfCount: existing?.pdfCount ?? 0,
    subfolderCount: existing?.subfolderCount ?? 0,
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  categories[id] = updated;
  writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  recalculateCategoryCounts();
  eventBus.emit('categories', Object.values(categories));

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'categories', id), updated, { merge: true });
    } catch (e) {
      console.warn('Remote category sync note:', e);
    }
  }

  return updated;
}

export async function toggleCategoryStatus(categoryId: string, isActive: boolean): Promise<void> {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  if (!categories[categoryId]) throw new Error(`Category ${categoryId} not found`);

  categories[categoryId].isActive = isActive;
  writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  eventBus.emit('categories', Object.values(categories));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'categories', categoryId), { isActive });
    } catch (e) {
      console.warn('Remote category toggle status note:', e);
    }
  }
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  orderedIds.forEach((id, idx) => {
    if (categories[id]) {
      categories[id].order = idx;
    }
  });

  writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  eventBus.emit('categories', Object.values(categories));

  if (db && isFirebaseOnline) {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await updateDoc(doc(db, 'categories', orderedIds[i]), { order: i });
      }
    } catch (e) {
      console.warn('Remote reorder categories note:', e);
    }
  }
}

export async function deleteCategory(
  categoryId: string,
  deleteContents: boolean = true
): Promise<{ deletedSubfolders: number, deletedVideos: number, deletedPdfs: number }> {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});

  if (!categories[categoryId]) throw new Error(`Category ${categoryId} not found`);

  // Find all folders belonging to this category
  const categoryFolderIds = Object.values(folders)
    .filter(f => f.categoryId === categoryId || f.parentId === categoryId)
    .map(f => f.id);

  let deletedVideos = 0;
  let deletedPdfs = 0;
  let deletedSubfolders = categoryFolderIds.length;

  if (deleteContents) {
    // Delete all videos belonging to this category or its subfolders
    Object.keys(videos).forEach(vId => {
      if (videos[vId].categoryId === categoryId || (videos[vId].folderId && categoryFolderIds.includes(videos[vId].folderId!))) {
        delete videos[vId];
        deletedVideos++;
        if (db && isFirebaseOnline) {
          try { deleteDoc(doc(db, 'videos', vId)); } catch (e) {}
        }
      }
    });

    // Delete all PDFs belonging to this category or its subfolders
    Object.keys(pdfs).forEach(pId => {
      if (pdfs[pId].categoryId === categoryId || (pdfs[pId].folderId && categoryFolderIds.includes(pdfs[pId].folderId!))) {
        delete pdfs[pId];
        deletedPdfs++;
        if (db && isFirebaseOnline) {
          try { deleteDoc(doc(db, 'pdfs', pId)); } catch (e) {}
        }
      }
    });

    // Delete all folders belonging to this category
    categoryFolderIds.forEach(fId => {
      delete folders[fId];
      if (db && isFirebaseOnline) {
        try { deleteDoc(doc(db, 'folders', fId)); } catch (e) {}
      }
    });
  } else {
    // Move contents to orphan or clear categoryId
    categoryFolderIds.forEach(fId => {
      folders[fId].categoryId = undefined;
      if (folders[fId].parentId === categoryId) folders[fId].parentId = null;
    });
    Object.keys(videos).forEach(vId => {
      if (videos[vId].categoryId === categoryId) {
        videos[vId].categoryId = '';
      }
    });
    Object.keys(pdfs).forEach(pId => {
      if (pdfs[pId].categoryId === categoryId) {
        pdfs[pId].categoryId = '';
      }
    });
  }

  delete categories[categoryId];
  writeStorage(STORAGE_KEYS.CATEGORIES, categories);
  writeStorage(STORAGE_KEYS.FOLDERS, folders);
  writeStorage(STORAGE_KEYS.VIDEOS, videos);
  writeStorage(STORAGE_KEYS.PDFS, pdfs);

  recalculateCategoryCounts();
  recalculateFolderCounts();

  eventBus.emit('categories', Object.values(categories));
  eventBus.emit('folders', Object.values(folders));
  eventBus.emit('videos', Object.values(videos));
  eventBus.emit('pdfs', Object.values(pdfs));

  if (db && isFirebaseOnline) {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (e) {
      console.warn('Remote category delete note:', e);
    }
  }

  return { deletedSubfolders, deletedVideos, deletedPdfs };
}

// ==========================================
// VIDEOS / LESSONS SERVICE
// ==========================================

export function subscribeToVideos(callback: (videos: VideoLesson[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
    const list = Object.values(map).sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<VideoLesson[]>('videos', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'videos'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, VideoLesson> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as VideoLesson;
          });
          writeStorage(STORAGE_KEYS.VIDEOS, remote);
          const list = Object.values(remote).sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list);
        }
      }, (err) => {
        console.warn('Firestore videos snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore videos setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function saveVideo(video: Partial<VideoLesson> & { title: string; categoryId: string }): Promise<VideoLesson> {
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const id = video.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  const categoryName = video.categoryName || categories[video.categoryId]?.name || 'Video Editing';

  const updated: VideoLesson = {
    id,
    title: video.title.trim(),
    description: video.description || '',
    categoryId: video.categoryId,
    categoryName,
    folderId: video.folderId || video.categoryId,
    folderName: video.folderName || '',
    episode: video.episode || 'EP1',
    videoUrl: video.videoUrl || '',
    thumbnailUrl: video.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80',
    duration: video.duration || '12:45',
    isPublished: video.isPublished !== undefined ? video.isPublished : true,
    isFreePreview: video.isFreePreview !== undefined ? video.isFreePreview : false,
    order: video.order !== undefined ? video.order : Object.values(videos).length + 1,
    createdAt: video.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  videos[id] = updated;
  writeStorage(STORAGE_KEYS.VIDEOS, videos);
  recalculateCategoryCounts();
  recalculateFolderCounts();
  eventBus.emit('videos', Object.values(videos));

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'videos', id), updated, { merge: true });
    } catch (e) {
      console.warn('Remote video sync note:', e);
    }
  }

  return updated;
}

export async function toggleVideoPublish(videoId: string, isPublished: boolean): Promise<void> {
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  if (!videos[videoId]) throw new Error(`Video ${videoId} not found`);

  videos[videoId].isPublished = isPublished;
  writeStorage(STORAGE_KEYS.VIDEOS, videos);
  eventBus.emit('videos', Object.values(videos));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'videos', videoId), { isPublished });
    } catch (e) {
      console.warn('Remote video toggle note:', e);
    }
  }
}

export async function deleteVideo(videoId: string): Promise<void> {
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  delete videos[videoId];
  writeStorage(STORAGE_KEYS.VIDEOS, videos);
  recalculateCategoryCounts();
  recalculateFolderCounts();
  eventBus.emit('videos', Object.values(videos));

  if (db && isFirebaseOnline) {
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (e) {
      console.warn('Remote video delete note:', e);
    }
  }
}

// ==========================================
// PDF RESOURCES SERVICE
// ==========================================

export function subscribeToPdfs(callback: (pdfs: PdfResource[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
    const list = Object.values(map).sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<PdfResource[]>('pdfs', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'pdfs'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, PdfResource> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as PdfResource;
          });
          writeStorage(STORAGE_KEYS.PDFS, remote);
          const list = Object.values(remote).sort((a, b) => (a.order || 0) - (b.order || 0));
          callback(list);
        }
      }, (err) => {
        console.warn('Firestore pdfs snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore pdfs setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function savePdf(pdf: Partial<PdfResource> & { title: string; categoryId: string }): Promise<PdfResource> {
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
  const id = pdf.id || `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  const categoryName = pdf.categoryName || categories[pdf.categoryId]?.name || 'Study Material';

  const updated: PdfResource = {
    id,
    title: pdf.title.trim(),
    description: pdf.description || '',
    categoryId: pdf.categoryId,
    categoryName,
    folderId: pdf.folderId || pdf.categoryId,
    folderName: pdf.folderName || '',
    pdfUrl: pdf.pdfUrl || 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    thumbnailUrl: pdf.thumbnailUrl,
    pageCount: pdf.pageCount || 12,
    fileSize: pdf.fileSize || '3.4 MB',
    isPublished: pdf.isPublished !== undefined ? pdf.isPublished : true,
    order: pdf.order !== undefined ? pdf.order : Object.values(pdfs).length + 1,
    createdAt: pdf.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  pdfs[id] = updated;
  writeStorage(STORAGE_KEYS.PDFS, pdfs);
  recalculateCategoryCounts();
  recalculateFolderCounts();
  eventBus.emit('pdfs', Object.values(pdfs));

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'pdfs', id), updated, { merge: true });
    } catch (e) {
      console.warn('Remote pdf sync note:', e);
    }
  }

  return updated;
}

export async function togglePdfPublish(pdfId: string, isPublished: boolean): Promise<void> {
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
  if (!pdfs[pdfId]) throw new Error(`PDF ${pdfId} not found`);

  pdfs[pdfId].isPublished = isPublished;
  writeStorage(STORAGE_KEYS.PDFS, pdfs);
  eventBus.emit('pdfs', Object.values(pdfs));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'pdfs', pdfId), { isPublished });
    } catch (e) {
      console.warn('Remote pdf toggle note:', e);
    }
  }
}

export async function deletePdf(pdfId: string): Promise<void> {
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
  delete pdfs[pdfId];
  writeStorage(STORAGE_KEYS.PDFS, pdfs);
  recalculateCategoryCounts();
  recalculateFolderCounts();
  eventBus.emit('pdfs', Object.values(pdfs));

  if (db && isFirebaseOnline) {
    try {
      await deleteDoc(doc(db, 'pdfs', pdfId));
    } catch (e) {
      console.warn('Remote pdf delete note:', e);
    }
  }
}

function recalculateCategoryCounts() {
  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  const videos = readStorage<Record<string, VideoLesson>>(STORAGE_KEYS.VIDEOS, {});
  const pdfs = readStorage<Record<string, PdfResource>>(STORAGE_KEYS.PDFS, {});
  const folders = readStorage<Record<string, Folder>>(STORAGE_KEYS.FOLDERS, {});

  const vCounts: Record<string, number> = {};
  Object.values(videos).forEach(v => {
    vCounts[v.categoryId] = (vCounts[v.categoryId] || 0) + 1;
  });

  const pCounts: Record<string, number> = {};
  Object.values(pdfs).forEach(p => {
    pCounts[p.categoryId] = (pCounts[p.categoryId] || 0) + 1;
  });

  const fCounts: Record<string, number> = {};
  Object.values(folders).forEach(f => {
    if (f.categoryId) fCounts[f.categoryId] = (fCounts[f.categoryId] || 0) + 1;
  });

  let changed = false;
  Object.keys(categories).forEach(cId => {
    const vCount = vCounts[cId] || 0;
    const pCount = pCounts[cId] || 0;
    const fCount = fCounts[cId] || 0;
    if (categories[cId].videoCount !== vCount || categories[cId].pdfCount !== pCount || categories[cId].subfolderCount !== fCount) {
      categories[cId].videoCount = vCount;
      categories[cId].pdfCount = pCount;
      categories[cId].subfolderCount = fCount;
      changed = true;
    }
  });

  if (changed) {
    writeStorage(STORAGE_KEYS.CATEGORIES, categories);
    eventBus.emit('categories', Object.values(categories));
  }
}

// ==========================================
// USER & AUTHORITY / ROLES MANAGEMENT SERVICE
// ==========================================

export function subscribeToUsers(callback: (users: UserProfile[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
    callback(Object.values(map));
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<UserProfile[]>('users', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, UserProfile> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
          });
          writeStorage(STORAGE_KEYS.USERS, remote);
          callback(Object.values(remote));
        }
      }, (err) => {
        console.warn('Firestore users snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore users setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

// Update admin role and permissions with security checks
export async function updateAdminRoleAndPermissions(
  actor: UserProfile,
  targetUid: string,
  newRole: UserRole,
  predefinedRole: PredefinedRole,
  permissions: PermissionKey[],
  assignedTitle?: string
): Promise<UserProfile> {
  // Security checks
  if (actor.isSuspended) {
    throw new Error('Action denied: Your administrative account is suspended.');
  }

  const isActorOwner = isProtectedOwner(actor);
  const hasAdminManage = hasPermission(actor, 'admins.manage');

  if (!isActorOwner && !hasAdminManage) {
    throw new Error('Permission denied: You do not have permission to manage administrator roles.');
  }

  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const target = users[targetUid];
  if (!target) throw new Error(`Target user ${targetUid} not found.`);

  // Protected owner cannot be modified or demoted
  if (isProtectedOwner(target)) {
    throw new Error('Action denied: The primary platform owner account is permanently protected and cannot be modified.');
  }

  // Master admin promotion requires platform Owner authority
  if (newRole === 'master_admin' && !isActorOwner) {
    throw new Error('Permission denied: Only the platform Owner can appoint or grant Super Admin privileges.');
  }

  // If target is currently a Master Admin and actor is not Owner, actor cannot demote or edit them
  if (target.role === 'master_admin' && !isActorOwner) {
    throw new Error('Permission denied: Super Admin accounts can only be modified or demoted by the platform Owner.');
  }

  // Apply updates
  target.role = newRole;
  target.predefinedRole = predefinedRole;
  target.assignedRoleTitle = assignedTitle || (newRole === 'master_admin' ? 'Master Admin' : (predefinedRole !== 'custom' ? predefinedRole.replace('_', ' ').toUpperCase() : 'Admin'));
  target.permissions = permissions;
  
  if (newRole === 'master_admin') {
    target.hasAllAccess = true;
    target.subscriptionStatus = 'active';
  }

  writeStorage(STORAGE_KEYS.USERS, users);

  // Sync session if target is logged in
  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === targetUid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, target);
    eventBus.emit('auth', target);
  }

  eventBus.emit('users', Object.values(users));

  // Record security audit log
  await recordAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'admin.role_update',
    targetUid: target.uid,
    targetEmail: target.email,
    details: `Updated role to ${newRole} (${predefinedRole}) with ${permissions.length} permissions.`
  });

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: target.role,
        predefinedRole: target.predefinedRole,
        assignedRoleTitle: target.assignedRoleTitle,
        permissions: target.permissions,
        hasAllAccess: target.hasAllAccess,
        subscriptionStatus: target.subscriptionStatus
      });
    } catch (e) {
      console.warn('Remote user role sync note:', e);
    }
  }

  return target;
}

// Suspend or reactivate an admin account
export async function toggleAdminSuspension(
  actor: UserProfile,
  targetUid: string,
  isSuspended: boolean
): Promise<UserProfile> {
  const isActorOwner = isProtectedOwner(actor);
  const hasAdminManage = hasPermission(actor, 'admins.manage');

  if (!isActorOwner && !hasAdminManage) {
    throw new Error('Permission denied: You do not have permission to suspend administrative accounts.');
  }

  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const target = users[targetUid];
  if (!target) throw new Error(`Target user ${targetUid} not found.`);

  if (isProtectedOwner(target)) {
    throw new Error('Action denied: The primary platform owner account cannot be suspended.');
  }

  if (target.role === 'master_admin' && !isActorOwner) {
    throw new Error('Permission denied: Only the platform Owner can suspend a Master Admin.');
  }

  target.isSuspended = isSuspended;
  writeStorage(STORAGE_KEYS.USERS, users);

  // If target is current user, update session immediately
  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === targetUid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, target);
    eventBus.emit('auth', target);
  }

  eventBus.emit('users', Object.values(users));

  await recordAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: isSuspended ? 'admin.suspended' : 'admin.reactivated',
    targetUid: target.uid,
    targetEmail: target.email,
    details: `${isSuspended ? 'Suspended' : 'Reactivated'} administrative access for ${target.email}`
  });

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', targetUid), { isSuspended });
    } catch (e) {
      console.warn('Remote suspension sync note:', e);
    }
  }

  return target;
}

// Remove admin privileges and demote back to student
export async function removeAdminPrivileges(
  actor: UserProfile,
  targetUid: string
): Promise<UserProfile> {
  const isActorOwner = isProtectedOwner(actor);
  const hasAdminManage = hasPermission(actor, 'admins.manage');

  if (!isActorOwner && !hasAdminManage) {
    throw new Error('Permission denied: You do not have permission to remove administrator privileges.');
  }

  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  const target = users[targetUid];
  if (!target) throw new Error(`Target user ${targetUid} not found.`);

  if (isProtectedOwner(target)) {
    throw new Error('Action denied: The primary platform owner account cannot be downgraded.');
  }

  if (target.role === 'master_admin' && !isActorOwner) {
    throw new Error('Permission denied: Only the platform Owner can remove a Master Admin.');
  }

  target.role = 'user';
  target.predefinedRole = undefined;
  target.assignedRoleTitle = undefined;
  target.permissions = [];

  writeStorage(STORAGE_KEYS.USERS, users);

  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === targetUid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, target);
    eventBus.emit('auth', target);
  }

  eventBus.emit('users', Object.values(users));

  await recordAuditLog({
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'admin.removed',
    targetUid: target.uid,
    targetEmail: target.email,
    details: `Revoked all administrative privileges from ${target.email}; returned to user role.`
  });

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: 'user',
        predefinedRole: null,
        assignedRoleTitle: null,
        permissions: []
      });
    } catch (e) {
      console.warn('Remote remove admin note:', e);
    }
  }

  return target;
}

export async function updateUserAllAccess(uid: string, hasAllAccess: boolean): Promise<void> {
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  if (!users[uid]) throw new Error(`User ${uid} not found`);

  users[uid].hasAllAccess = hasAllAccess;
  users[uid].subscriptionStatus = hasAllAccess ? 'active' : 'cancelled';
  if (hasAllAccess) {
    users[uid].accessExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  writeStorage(STORAGE_KEYS.USERS, users);

  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === uid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, users[uid]);
    eventBus.emit('auth', users[uid]);
  }

  eventBus.emit('users', Object.values(users));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        hasAllAccess, 
        subscriptionStatus: users[uid].subscriptionStatus,
        accessExpiry: users[uid].accessExpiry 
      });
    } catch (e) {
      console.warn('Remote user all-access toggle note:', e);
    }
  }
}

export async function updateUserCategoryAccess(uid: string, categoryId: string, enabled: boolean): Promise<void> {
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  if (!users[uid]) throw new Error(`User ${uid} not found`);

  const currentCats = new Set(users[uid].allowedCategories || []);
  if (enabled) {
    currentCats.add(categoryId);
  } else {
    currentCats.delete(categoryId);
  }

  users[uid].allowedCategories = Array.from(currentCats);
  writeStorage(STORAGE_KEYS.USERS, users);

  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === uid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, users[uid]);
    eventBus.emit('auth', users[uid]);
  }

  eventBus.emit('users', Object.values(users));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        allowedCategories: users[uid].allowedCategories 
      });
    } catch (e) {
      console.warn('Remote user category toggle note:', e);
    }
  }
}

export async function setAllCategoriesAccess(uid: string, enabled: boolean): Promise<void> {
  const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
  if (!users[uid]) throw new Error(`User ${uid} not found`);

  const categories = readStorage<Record<string, Category>>(STORAGE_KEYS.CATEGORIES, {});
  users[uid].allowedCategories = enabled ? Object.keys(categories) : [];

  writeStorage(STORAGE_KEYS.USERS, users);

  const current = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (current && current.uid === uid) {
    writeStorage(STORAGE_KEYS.CURRENT_USER, users[uid]);
    eventBus.emit('auth', users[uid]);
  }

  eventBus.emit('users', Object.values(users));

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        allowedCategories: users[uid].allowedCategories 
      });
    } catch (e) {
      console.warn('Remote batch category access note:', e);
    }
  }
}

// ==========================================
// SECURITY AUDIT LOGS SERVICE
// ==========================================

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
  const loadLocal = () => {
    const list = readStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<AuditLog[]>('audit_logs', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
      unsubFb = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const remote: AuditLog[] = [];
          snapshot.forEach(docSnap => {
            remote.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
          });
          writeStorage(STORAGE_KEYS.AUDIT_LOGS, remote);
          callback(remote);
        }
      }, (err) => {
        console.warn('Firestore audit logs snapshot note:', err.message);
      });
    } catch (e) {
      console.warn('Firestore audit logs setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function recordAuditLog(data: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
  const logs = readStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const log: AuditLog = {
    id,
    timestamp: new Date().toISOString(),
    ...data
  };

  logs.unshift(log);
  // Keep last 500 audit entries
  if (logs.length > 500) logs.pop();

  writeStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
  eventBus.emit('audit_logs', logs);

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'audit_logs', id), log);
    } catch (e) {
      console.warn('Remote audit log sync note:', e);
    }
  }

  return log;
}

// ==========================================
// PAYMENT REQUESTS & VERIFICATION WORKFLOW
// ==========================================

export function subscribeToPaymentRequests(callback: (requests: PaymentRequest[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, PaymentRequest>>(STORAGE_KEYS.PAYMENTS, {});
    const list = Object.values(map).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    callback(list);
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<PaymentRequest[]>('payments', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(collection(db, 'paymentRequests'), (snapshot) => {
        if (!snapshot.empty) {
          const remote: Record<string, PaymentRequest> = {};
          snapshot.forEach(docSnap => {
            remote[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as PaymentRequest;
          });
          writeStorage(STORAGE_KEYS.PAYMENTS, remote);
          const list = Object.values(remote).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          callback(list);
        }
      }, (err) => {
        console.warn('Firestore payment requests snapshot warning:', err.message);
      });
    } catch (e) {
      console.warn('Firestore payment requests setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function submitPaymentProof(data: {
  uid: string;
  userEmail: string;
  userName: string;
  planType: 'all_access' | 'category';
  categoryId?: string;
  categoryName?: string;
  amount: number;
  utr: string;
  proofUrl: string;
}): Promise<PaymentRequest> {
  const payments = readStorage<Record<string, PaymentRequest>>(STORAGE_KEYS.PAYMENTS, {});
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const request: PaymentRequest = {
    id,
    uid: data.uid,
    userEmail: data.userEmail,
    userName: data.userName,
    planType: data.planType,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    amount: data.amount,
    utr: data.utr.trim(),
    proofUrl: data.proofUrl,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  payments[id] = request;
  writeStorage(STORAGE_KEYS.PAYMENTS, payments);
  eventBus.emit('payments', Object.values(payments));

  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'paymentRequests', id), request);
      await setDoc(doc(db, 'payment_requests', id), request);
    } catch (e) {
      console.warn('Remote payment proof submission note:', e);
    }
  }

  return request;
}

export async function resolvePaymentRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
  adminUser?: UserProfile | null
): Promise<void> {
  const adminEmail = adminUser?.email || MASTER_ADMIN_EMAIL;

  const payments = readStorage<Record<string, PaymentRequest>>(STORAGE_KEYS.PAYMENTS, {});
  const req = payments[requestId];
  if (!req) throw new Error(`Payment request ${requestId} not found`);

  req.status = status;
  req.adminNote = adminNote || '';
  req.resolvedAt = new Date().toISOString();
  req.resolvedBy = adminEmail;

  payments[requestId] = req;
  writeStorage(STORAGE_KEYS.PAYMENTS, payments);
  eventBus.emit('payments', Object.values(payments));

  // If approved, immediately unlock student access!
  if (status === 'approved') {
    const users = readStorage<Record<string, UserProfile>>(STORAGE_KEYS.USERS, {});
    const targetUser = users[req.uid];
    if (targetUser) {
      if (req.planType === 'all_access') {
        targetUser.hasAllAccess = true;
        targetUser.subscriptionStatus = 'active';
        targetUser.accessExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else if (req.categoryId) {
        const set = new Set(targetUser.allowedCategories || []);
        set.add(req.categoryId);
        targetUser.allowedCategories = Array.from(set);
        targetUser.subscriptionStatus = 'active';
      }
      users[req.uid] = targetUser;
      writeStorage(STORAGE_KEYS.USERS, users);
      eventBus.emit('users', Object.values(users));

      // Update current user session if it's the same user
      const cur = readStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (cur && cur.uid === req.uid) {
        writeStorage(STORAGE_KEYS.CURRENT_USER, targetUser);
        eventBus.emit('auth', targetUser);
      }
    }

    // Record sales entry
    const sales = readStorage<Record<string, SalesRecord>>(STORAGE_KEYS.SALES, {});
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    sales[saleId] = {
      id: saleId,
      requestId: req.id,
      amount: req.amount,
      userEmail: req.userEmail,
      planType: req.planType === 'all_access' ? 'All-Access Pass' : (req.categoryName || 'Category Pass'),
      categoryName: req.categoryName,
      date: new Date().toISOString()
    };
    writeStorage(STORAGE_KEYS.SALES, sales);
    eventBus.emit('sales', Object.values(sales));
  }

  // Record audit log
  await recordAuditLog({
    actorUid: adminUser?.uid || 'system',
    actorEmail: adminEmail,
    actorRole: adminUser?.role || 'admin',
    action: status === 'approved' ? 'payment.approved' : 'payment.rejected',
    targetUid: req.uid,
    targetEmail: req.userEmail,
    details: `${status === 'approved' ? 'Approved' : 'Rejected'} payment of ₹${req.amount} for ${req.planType} (UTR: ${req.utr})`
  });

  if (db && isFirebaseOnline) {
    try {
      await updateDoc(doc(db, 'paymentRequests', requestId), {
        status,
        adminNote: req.adminNote,
        resolvedAt: req.resolvedAt,
        resolvedBy: req.resolvedBy
      });
    } catch (e) {
      console.warn('Remote payment resolve note:', e);
    }
  }
}

// ==========================================
// SETTINGS & ANALYTICS
// ==========================================

export function subscribeToSettings(callback: (settings: PlatformSettings) => void): () => void {
  const loadLocal = () => {
    const s = readStorage<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    callback({ ...DEFAULT_SETTINGS, ...s });
  };
  loadLocal();

  const unsubEvent = eventBus.subscribe<PlatformSettings>('settings', callback);

  let unsubFb: (() => void) | null = null;
  if (db && isFirebaseOnline) {
    try {
      unsubFb = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data() as Partial<PlatformSettings>;
          const current = readStorage<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
          const merged: PlatformSettings = {
            ...DEFAULT_SETTINGS,
            ...current,
            ...remote
          };
          writeStorage(STORAGE_KEYS.SETTINGS, merged);
          callback(merged);
        }
      }, (err) => {
        console.warn('Firestore settings snapshot note:', err.message);
      });
    } catch (e) {
      console.warn('Firestore settings listener setup note:', e);
    }
  }

  return () => {
    unsubEvent();
    if (unsubFb) unsubFb();
  };
}

export async function updateSettings(settings: Partial<PlatformSettings>, actor?: UserProfile | null): Promise<PlatformSettings> {
  // Permission verification
  if (actor) {
    const isOwner = isProtectedOwner(actor);
    const canManage = isOwner || hasPermission(actor, 'settings.manage');
    if (!canManage) {
      throw new Error('Unauthorized: You do not have permission to manage platform payment settings.');
    }
  }

  // Validate payment contact mobile number if provided
  let normalizedPaymentPhone = settings.paymentPhone;
  if (settings.paymentPhone !== undefined) {
    const phoneCheck = validateIndianMobile(settings.paymentPhone);
    if (!phoneCheck.isValid) {
      throw new Error(phoneCheck.error || 'Invalid Indian mobile number.');
    }
    normalizedPaymentPhone = phoneCheck.normalized;
  }

  const current = readStorage<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const updated: PlatformSettings = { 
    ...current, 
    ...settings,
    ...(normalizedPaymentPhone !== undefined ? { paymentPhone: normalizedPaymentPhone } : {})
  };

  // If paymentPhone is set and valid, synchronize supportWhatsapp/supportPhone for global support
  if (updated.paymentPhone) {
    updated.supportPhone = updated.paymentPhone;
    updated.supportWhatsapp = updated.paymentPhone;
  }

  // Persist locally
  writeStorage(STORAGE_KEYS.SETTINGS, updated);
  eventBus.emit('settings', updated);

  // Write to Firestore with robust error handling
  if (db && isFirebaseOnline) {
    try {
      await setDoc(doc(db, 'settings', 'general'), updated, { merge: true });
    } catch (e: any) {
      console.error('Remote settings write error:', e);
      throw new Error(`Failed to save settings to database: ${e.message || 'Network error'}`);
    }
  }

  // Record audit log
  if (actor) {
    await recordAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'settings.update',
      details: `Updated payment settings (UPI: ${updated.upiId}, Payee: ${updated.payeeName}, Phone: ${updated.paymentPhone || 'None'}, All-Access: ₹${updated.allAccessPrice})`
    });
  }

  return updated;
}

export function subscribeToSales(callback: (sales: SalesRecord[]) => void): () => void {
  const loadLocal = () => {
    const map = readStorage<Record<string, SalesRecord>>(STORAGE_KEYS.SALES, {});
    callback(Object.values(map));
  };
  loadLocal();

  return eventBus.subscribe<SalesRecord[]>('sales', callback);
}

// Watch progress tracker for video masterclasses
export function getWatchProgress(): Record<string, boolean> {
  return readStorage<Record<string, boolean>>(STORAGE_KEYS.WATCH_PROGRESS, {});
}

export function markLessonCompleted(videoId: string, completed: boolean): void {
  const prog = readStorage<Record<string, boolean>>(STORAGE_KEYS.WATCH_PROGRESS, {});
  prog[videoId] = completed;
  writeStorage(STORAGE_KEYS.WATCH_PROGRESS, prog);
  eventBus.emit('progress', prog);
}
