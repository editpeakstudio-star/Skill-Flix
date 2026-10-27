import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  PlayCircle, 
  FileText, 
  Layers, 
  Users, 
  CreditCard, 
  Settings, 
  ArrowLeft, 
  LogOut, 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Lock, 
  Sparkles, 
  Power, 
  Tag, 
  ShieldCheck, 
  Calendar,
  Image as ImageIcon,
  Crown,
  Shield,
  Zap,
  PlaySquare,
  Folder as FolderIcon,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  History,
  AlertTriangle,
  UserCheck,
  UserX,
  Move,
  KeyRound,
  Eye,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  FolderTree,
  Phone,
  UserMinus,
  UserPlus,
  CheckCircle2,
  ChevronUp
} from 'lucide-react';
import { 
  UserProfile, 
  Category, 
  Folder,
  VideoLesson, 
  PdfResource, 
  PaymentRequest, 
  PlatformSettings, 
  SalesRecord,
  AuditLog,
  PredefinedRole,
  PermissionKey,
  SYSTEM_PERMISSIONS
} from '../types';
import { 
  isProtectedOwner,
  hasPermission,
  getPermissionsForRole,
  saveCategory, 
  toggleCategoryStatus, 
  reorderCategories,
  deleteCategory,
  saveFolder,
  deleteFolder,
  moveFolder,
  reorderFolders,
  saveVideo, 
  toggleVideoPublish, 
  deleteVideo,
  savePdf, 
  togglePdfPublish, 
  deletePdf,
  updateAdminRoleAndPermissions,
  toggleAdminSuspension,
  removeAdminPrivileges,
  updateUserAllAccess, 
  updateUserCategoryAccess, 
  setAllCategoriesAccess,
  resolvePaymentRequest, 
  updateSettings,
  validateIndianMobile,
  logoutUser,
  recordAuditLog
} from '../services/firebase';
import { useToast } from '../components/Toast';

interface AdminViewProps {
  currentUser: UserProfile | null;
  categories: Category[];
  folders: Folder[];
  videos: VideoLesson[];
  pdfs: PdfResource[];
  users: UserProfile[];
  paymentRequests: PaymentRequest[];
  settings: PlatformSettings;
  sales: SalesRecord[];
  auditLogs: AuditLog[];
  onNavigate: (view: string) => void;
  onSeedDefaults: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  categories,
  folders,
  videos,
  pdfs,
  users,
  paymentRequests,
  settings,
  sales,
  auditLogs,
  onNavigate,
  onSeedDefaults
}) => {
  const { showToast } = useToast();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'folders' | 'videos' | 'pdfs' | 'categories' | 'users' | 'roles' | 'audit' | 'payments' | 'payment-settings' | 'general'
  >('folders');

  // Operation locks per item ID
  const [operatingIds, setOperatingIds] = useState<Record<string, boolean>>({});

  // Modals for CRUD
  const [editingFolder, setEditingFolder] = useState<Partial<Folder> | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteFolderContents, setDeleteFolderContents] = useState(true);

  // Category safe delete modal
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteCategoryContents, setDeleteCategoryContents] = useState(true);

  // Folder Move Modal
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null);
  const [destinationParentId, setDestinationParentId] = useState<string | null>(null);

  const [editingVideo, setEditingVideo] = useState<Partial<VideoLesson> | null>(null);
  const [editingPdf, setEditingPdf] = useState<Partial<PdfResource> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [viewingProof, setViewingProof] = useState<PaymentRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Role & Permissions Modal & Mobile Bottom Sheet
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [selectedRoleType, setSelectedRoleType] = useState<PredefinedRole>('admin');
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);

  // Mobile-First Manage Role Bottom Sheet & Confirmation
  const [manageRoleTarget, setManageRoleTarget] = useState<UserProfile | null>(null);
  const [roleSheetStep, setRoleSheetStep] = useState<'actions' | 'confirm' | 'permissions'>('actions');
  const [pendingRoleAction, setPendingRoleAction] = useState<{
    type: 'make_admin' | 'make_super_admin' | 'demote_super_admin' | 'remove_admin' | 'suspend' | 'reactivate';
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'blue' | 'purple' | 'amber' | 'rose' | 'emerald';
  } | null>(null);
  const [isSavingRoleAction, setIsSavingRoleAction] = useState(false);
  const [categoryToggling, setCategoryToggling] = useState<Record<string, boolean>>({});
  const [expandedUserCategories, setExpandedUserCategories] = useState<Record<string, boolean>>({});

  // Folder Browser Active State
  const [activeBrowserFolderId, setActiveBrowserFolderId] = useState<string | null>(null);

  // Search & Filters
  const [folderSearch, setFolderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'owner' | 'master' | 'admin' | 'student'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [pdfSearch, setPdfSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Settings form
  const [settingsForm, setSettingsForm] = useState<PlatformSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  // Check authorization & status
  const isOwner = isProtectedOwner(currentUser);
  const isMasterAdmin = isOwner || currentUser?.role === 'master_admin';
  const isSuspended = currentUser?.isSuspended;

  // Granular permissions check for UI display
  const canViewAnalytics = hasPermission(currentUser, 'analytics.view') || hasPermission(currentUser, 'dashboard.view');
  const canManageFolders = hasPermission(currentUser, 'folders.create') || hasPermission(currentUser, 'folders.edit') || hasPermission(currentUser, 'folders.delete');
  const canManageVideos = hasPermission(currentUser, 'videos.create') || hasPermission(currentUser, 'videos.edit') || hasPermission(currentUser, 'videos.delete');
  const canManagePdfs = hasPermission(currentUser, 'pdfs.create') || hasPermission(currentUser, 'pdfs.edit') || hasPermission(currentUser, 'pdfs.delete');
  const canManageStudents = hasPermission(currentUser, 'students.manage');
  const canManageAdmins = isOwner || hasPermission(currentUser, 'admins.manage');
  const canViewAudit = isOwner || hasPermission(currentUser, 'audit.view');
  const canVerifyPayments = hasPermission(currentUser, 'payments.verify');
  const canManageSettings = isOwner || hasPermission(currentUser, 'settings.manage');

  if (isSuspended) {
    return (
      <div className="p-8 rounded-2xl bg-[#090D16] border border-rose-500/30 text-center max-w-md mx-auto my-12 text-zinc-100">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-2">Account Suspended</h2>
        <p className="text-xs text-zinc-400 mb-5">
          Your administrative privileges have been temporarily suspended by the platform administrator.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
        >
          Return to Learning Hub
        </button>
      </div>
    );
  }

  if (!currentUser || (currentUser.role === 'user' && !isOwner)) {
    return (
      <div className="p-8 rounded-2xl bg-[#090D16] border border-red-500/30 text-center max-w-md mx-auto my-12 text-zinc-100">
        <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-zinc-400 mb-5">
          Your account does not have administrator privileges.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs shadow-md cursor-pointer"
        >
          Return to Learning Hub
        </button>
      </div>
    );
  }

  const setOperating = (id: string, busy: boolean) => {
    setOperatingIds(prev => ({ ...prev, [id]: busy }));
  };

  // ==========================================================
  // FOLDER MANAGEMENT HANDLERS
  // ==========================================================
  // ==========================================================
  // CATEGORY & FOLDER MANAGEMENT HANDLERS
  // ==========================================================
  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name?.trim()) {
      showToast('Please enter a course suite name.', 'error');
      return;
    }

    try {
      const saved = await saveCategory(editingCategory as any);
      showToast(`Category / Suite "${saved.name}" saved!`, 'success');
      setEditingCategory(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save course suite.', 'error');
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const result = await deleteCategory(categoryToDelete.id, deleteCategoryContents);
      showToast(`Category "${categoryToDelete.name}" deleted (${result.deletedVideos} videos, ${result.deletedSubfolders} folders removed).`, 'info');
      setCategoryToDelete(null);
      if (activeBrowserFolderId === categoryToDelete.id) {
        setActiveBrowserFolderId(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category.', 'error');
    }
  };

  const handleMoveCategoryOrder = async (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex(c => c.id === catId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const reordered = [...sorted];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, removed);

    try {
      await reorderCategories(reordered.map(c => c.id));
      showToast(`Moved "${removed.name}" ${direction}!`, 'success');
    } catch (err: any) {
      showToast('Failed to update category order.', 'error');
    }
  };

  const handleSaveFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder?.name?.trim()) {
      showToast('Please enter a folder name.', 'error');
      return;
    }

    try {
      const saved = await saveFolder({
        ...editingFolder,
        name: editingFolder.name.trim()
      });
      showToast(`Folder "${saved.name}" saved successfully!`, 'success');
      setEditingFolder(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save folder.', 'error');
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      const result = await deleteFolder(folderToDelete.id, deleteFolderContents);
      showToast(`Folder deleted (${result.deletedSubfolders} subfolders, ${result.deletedVideos} videos removed).`, 'info');
      setFolderToDelete(null);
      if (activeBrowserFolderId === folderToDelete.id) {
        setActiveBrowserFolderId(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete folder.', 'error');
    }
  };

  const handleMoveFolderOrder = async (folderId: string, direction: 'up' | 'down') => {
    const current = folders.find(f => f.id === folderId);
    if (!current) return;
    const siblings = folders
      .filter(f => f.parentId === current.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = siblings.findIndex(f => f.id === folderId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const reordered = [...siblings];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, removed);

    try {
      await reorderFolders(reordered.map(f => f.id));
      showToast(`Moved folder "${removed.name}" ${direction}!`, 'success');
    } catch (err: any) {
      showToast('Failed to update folder order.', 'error');
    }
  };

  const handleExecuteMoveFolder = async () => {
    if (!folderToMove) return;
    try {
      await moveFolder(folderToMove.id, destinationParentId);
      const parentName = destinationParentId 
        ? (categories.find(c => c.id === destinationParentId)?.name || folders.find(f => f.id === destinationParentId)?.name || 'Target')
        : 'Root Library';
      showToast(`Moved "${folderToMove.name}" to ${parentName}!`, 'success');
      setFolderToMove(null);
      setDestinationParentId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to move folder.', 'error');
    }
  };

  // Breadcrumbs for admin folder browser (handles both root categories & subfolders)
  const getAdminBreadcrumbs = () => {
    if (!activeBrowserFolderId) return [];
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Root Categories' }];
    
    // Check if current is a category directly
    const cat = categories.find(c => c.id === activeBrowserFolderId);
    if (cat) {
      return [...crumbs, { id: cat.id, name: cat.name }];
    }

    let cur = folders.find(f => f.id === activeBrowserFolderId);
    const path: { id: string; name: string }[] = [];
    while (cur) {
      path.unshift({ id: cur.id, name: cur.name });
      if (cur.parentId) {
        const parentCat = categories.find(c => c.id === cur!.parentId);
        if (parentCat) {
          path.unshift({ id: parentCat.id, name: parentCat.name });
          break;
        }
        cur = folders.find(f => f.id === cur!.parentId);
      } else {
        cur = undefined;
      }
    }
    return [...crumbs, ...path];
  };

  // ==========================================================
  // ROLES & PERMISSIONS MANAGEMENT HANDLERS (Mobile-First)
  // ==========================================================
  const handleOpenManageRoleSheet = (user: UserProfile) => {
    setManageRoleTarget(user);
    setRoleSheetStep('actions');
    setPendingRoleAction(null);
    const roleType: PredefinedRole = user.predefinedRole || (user.role === 'master_admin' ? 'master_admin' : 'admin');
    setSelectedRoleType(roleType);
    setCustomPermissions(user.permissions || getPermissionsForRole(roleType));
  };

  const handleOpenRoleModal = (user: UserProfile) => {
    handleOpenManageRoleSheet(user);
  };

  const handleInitiateRoleAction = (
    type: 'make_admin' | 'make_super_admin' | 'demote_super_admin' | 'remove_admin' | 'suspend' | 'reactivate',
    title: string,
    description: string,
    confirmLabel: string,
    variant: 'blue' | 'purple' | 'amber' | 'rose' | 'emerald'
  ) => {
    setPendingRoleAction({
      type,
      title,
      description,
      confirmLabel,
      variant
    });
    setRoleSheetStep('confirm');
  };

  const handleConfirmRoleAction = async () => {
    if (!manageRoleTarget || !pendingRoleAction || !currentUser) return;
    setIsSavingRoleAction(true);
    try {
      if (pendingRoleAction.type === 'make_admin') {
        await updateAdminRoleAndPermissions(
          currentUser,
          manageRoleTarget.uid,
          'admin',
          'admin',
          getPermissionsForRole('admin')
        );
        showToast(`Appointed ${manageRoleTarget.displayName || manageRoleTarget.email} as Administrator!`, 'success');
      } else if (pendingRoleAction.type === 'make_super_admin') {
        await updateAdminRoleAndPermissions(
          currentUser,
          manageRoleTarget.uid,
          'master_admin',
          'master_admin',
          getPermissionsForRole('master_admin')
        );
        showToast(`Appointed ${manageRoleTarget.displayName || manageRoleTarget.email} as Super Administrator!`, 'success');
      } else if (pendingRoleAction.type === 'demote_super_admin') {
        await updateAdminRoleAndPermissions(
          currentUser,
          manageRoleTarget.uid,
          'admin',
          'admin',
          getPermissionsForRole('admin')
        );
        showToast(`Demoted ${manageRoleTarget.displayName || manageRoleTarget.email} to standard Administrator.`, 'info');
      } else if (pendingRoleAction.type === 'remove_admin') {
        await removeAdminPrivileges(currentUser, manageRoleTarget.uid);
        showToast(`Revoked all administrative privileges from ${manageRoleTarget.displayName || manageRoleTarget.email}.`, 'info');
      } else if (pendingRoleAction.type === 'suspend' || pendingRoleAction.type === 'reactivate') {
        const nextState = pendingRoleAction.type === 'suspend';
        await toggleAdminSuspension(currentUser, manageRoleTarget.uid, nextState);
        showToast(nextState ? `Suspended administrative privileges for ${manageRoleTarget.displayName || manageRoleTarget.email}.` : `Reactivated access for ${manageRoleTarget.displayName || manageRoleTarget.email}.`, 'info');
      }
      setManageRoleTarget(null);
      setPendingRoleAction(null);
      setRoleSheetStep('actions');
    } catch (err: any) {
      showToast(err.message || 'Operation failed.', 'error');
    } finally {
      setIsSavingRoleAction(false);
    }
  };

  const handleSaveGranularPermissions = async () => {
    if (!manageRoleTarget || !currentUser) return;
    setIsSavingRoleAction(true);
    try {
      const assignedRole: 'master_admin' | 'admin' = selectedRoleType === 'master_admin' ? 'master_admin' : 'admin';
      const permsToSave = selectedRoleType === 'custom' ? customPermissions : getPermissionsForRole(selectedRoleType);

      await updateAdminRoleAndPermissions(
        currentUser,
        manageRoleTarget.uid,
        assignedRole,
        selectedRoleType,
        permsToSave
      );
      showToast(`Updated permissions for ${manageRoleTarget.displayName || manageRoleTarget.email}!`, 'success');
      setManageRoleTarget(null);
      setRoleSheetStep('actions');
    } catch (err: any) {
      showToast(err.message || 'Failed to update permissions.', 'error');
    } finally {
      setIsSavingRoleAction(false);
    }
  };

  const handleToggleCategoryAccess = async (userUid: string, categoryId: string, currentEnabled: boolean) => {
    const opKey = `${userUid}_${categoryId}`;
    if (categoryToggling[opKey]) return;
    setCategoryToggling(prev => ({ ...prev, [opKey]: true }));
    try {
      await updateUserCategoryAccess(userUid, categoryId, !currentEnabled);
    } catch (err: any) {
      showToast(err.message || 'Failed to update category access.', 'error');
    } finally {
      setCategoryToggling(prev => ({ ...prev, [opKey]: false }));
    }
  };

  const handleBulkCategoryAccess = async (userUid: string, enableAll: boolean) => {
    const opKey = `${userUid}_all`;
    if (categoryToggling[opKey]) return;
    setCategoryToggling(prev => ({ ...prev, [opKey]: true }));
    try {
      await setAllCategoriesAccess(userUid, enableAll);
      showToast(enableAll ? 'Turned ON all course categories for student' : 'Turned OFF all course categories for student', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update category access.', 'error');
    } finally {
      setCategoryToggling(prev => ({ ...prev, [opKey]: false }));
    }
  };

  const handleToggleUserCategoriesAccordion = (uid: string) => {
    setExpandedUserCategories(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const handleToggleSuspension = async (user: UserProfile) => {
    if (!currentUser) return;
    const nextState = !user.isSuspended;
    try {
      await toggleAdminSuspension(currentUser, user.uid, nextState);
      showToast(nextState ? `Suspended administrative access for ${user.displayName}` : `Reactivated access for ${user.displayName}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle suspension.', 'error');
    }
  };

  const handleRemoveAdmin = async (user: UserProfile) => {
    if (!currentUser) return;
    if (!confirm(`Are you sure you want to revoke all admin privileges from ${user.displayName}?`)) return;

    try {
      await removeAdminPrivileges(currentUser, user.uid);
      showToast(`Revoked admin privileges from ${user.displayName}.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke admin privileges.', 'error');
    }
  };

  const handleToggleUserAllAccess = async (user: UserProfile) => {
    if (operatingIds[user.uid]) return;
    const targetState = !user.hasAllAccess;
    setOperating(user.uid, true);

    try {
      await updateUserAllAccess(user.uid, targetState);
      showToast(targetState ? `Turned ON All-Access for ${user.displayName}` : `Turned OFF All-Access for ${user.displayName}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update All-Access status.', 'error');
    } finally {
      setOperating(user.uid, false);
    }
  };

  // Video toggle
  const handleToggleVideo = async (video: VideoLesson) => {
    if (operatingIds[video.id]) return;
    const targetState = !video.isPublished;
    setOperating(video.id, true);

    try {
      await toggleVideoPublish(video.id, targetState);
      showToast(targetState ? 'Published video' : 'Unpublished video', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle video.', 'error');
    } finally {
      setOperating(video.id, false);
    }
  };

  // Video Save Submit
  const handleSaveVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo?.title?.trim() || !editingVideo?.categoryId) {
      showToast('Title and Category are required.', 'error');
      return;
    }

    try {
      await saveVideo(editingVideo as any);
      showToast('Video lesson saved successfully!', 'success');
      setEditingVideo(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save video.', 'error');
    }
  };

  // PDF Save Submit
  const handleSavePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPdf?.title?.trim() || !editingPdf?.categoryId) {
      showToast('Title and Category are required.', 'error');
      return;
    }

    try {
      await savePdf(editingPdf as any);
      showToast('PDF guide saved successfully!', 'success');
      setEditingPdf(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save PDF.', 'error');
    }
  };

  // Payment Resolution
  const handleResolvePayment = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await resolvePaymentRequest(requestId, status, rejectNote, currentUser);
      showToast(status === 'approved' ? 'Payment approved & courses unlocked!' : 'Payment rejected.', 'success');
      setViewingProof(null);
      setRejectNote('');
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve payment.', 'error');
    }
  };

  // Platform Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number if entered
    if (settingsForm.paymentPhone && settingsForm.paymentPhone.trim()) {
      const phoneValidation = validateIndianMobile(settingsForm.paymentPhone);
      if (!phoneValidation.isValid) {
        showToast(phoneValidation.error || 'Please enter a valid Indian mobile number.', 'error');
        return;
      }
    }

    try {
      setIsSavingSettings(true);
      const updated = await updateSettings(settingsForm, currentUser);
      setSettingsForm(updated);
      showToast('Payment gateway and platform settings saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save platform settings.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered lists
  const filteredVideos = videos.filter(v => {
    if (!videoSearch) return true;
    const q = videoSearch.toLowerCase();
    return v.title.toLowerCase().includes(q) || v.categoryName.toLowerCase().includes(q) || (v.folderName && v.folderName.toLowerCase().includes(q));
  });

  const filteredPdfs = pdfs.filter(p => {
    if (!pdfSearch) return true;
    const q = pdfSearch.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter(u => {
    if (userRoleFilter === 'owner' && !isProtectedOwner(u)) return false;
    if (userRoleFilter === 'master' && u.role !== 'master_admin') return false;
    if (userRoleFilter === 'admin' && (u.role !== 'admin' || isProtectedOwner(u))) return false;
    if (userRoleFilter === 'student' && u.role !== 'user') return false;
    if (userSearch) {
      const q = userSearch.toLowerCase();
      return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || (u.phoneNumber && u.phoneNumber.includes(q));
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(l => {
    if (!auditSearch) return true;
    const q = auditSearch.toLowerCase();
    return l.actorEmail.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || (l.targetEmail && l.targetEmail.toLowerCase().includes(q)) || l.details.toLowerCase().includes(q);
  });

  // Calculate stats
  const totalRevenue = sales.reduce((acc, s) => acc + (s.amount || 0), 0);
  const pendingPaymentsCount = paymentRequests.filter(p => p.status === 'pending').length;

  const studentCount = users.filter(u => u.role === 'user' && !isProtectedOwner(u)).length;
  const adminCount = users.filter(u => u.role === 'admin' && !isProtectedOwner(u)).length;
  const masterCount = users.filter(u => u.role === 'master_admin' && !isProtectedOwner(u)).length;
  const allAccessCount = users.filter(u => u.hasAllAccess).length;

  // Role badge renderer matching brand specifications:
  // Gold for Owner, Purple for Super Admin, Blue for Admin, Neutral for Student
  const renderRoleBadge = (u: UserProfile) => {
    if (isProtectedOwner(u)) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
          <Crown className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
          <span>OWNER</span>
        </span>
      );
    }
    if (u.role === 'master_admin') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
          <Sparkles className="w-2.5 h-2.5 text-purple-300" />
          <span>SUPER ADMIN</span>
        </span>
      );
    }
    if (u.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
          <Shield className="w-2.5 h-2.5 text-blue-300" />
          <span>{u.assignedRoleTitle ? u.assignedRoleTitle.toUpperCase() : 'ADMIN'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
        <Users className="w-2.5 h-2.5 text-zinc-400" />
        <span>STUDENT</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[85vh] bg-[#05070D] rounded-2xl sm:rounded-3xl border border-blue-500/15 overflow-hidden shadow-2xl">
      
      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION (Mobile-First + Desktop Sidebar)      */}
      {/* ======================================================== */}
      <aside className="w-full lg:w-64 bg-[#090D16] border-b lg:border-b-0 lg:border-r border-blue-500/15 flex flex-col justify-between p-3 sm:p-4 shrink-0">
        <div className="space-y-3">
          
          {/* Admin Identity Header */}
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#05070D] border border-blue-500/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-1.5 flex items-center justify-center text-black shadow-md shadow-yellow-500/30 shrink-0">
                <Crown className="w-5 h-5 fill-black text-black" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-tight">Admin Console</span>
                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                    isOwner 
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40' 
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {isOwner ? 'OWNER' : (currentUser?.assignedRoleTitle || currentUser?.role?.toUpperCase())}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono truncate block mt-0.5 break-all">
                  {currentUser?.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="lg:hidden p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white shrink-0"
              title="Return to Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Horizontal Scrollable Tab Pills (Visible ONLY on mobile/tablet) */}
          <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-1.5 py-1 -mx-1 px-1">
            {canManageStudents && (
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Users & Access ({users.length})</span>
              </button>
            )}

            {canManageFolders && (
              <button
                type="button"
                onClick={() => { setActiveTab('folders'); setActiveBrowserFolderId(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'folders' || activeTab === 'categories'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                <span>Categories</span>
              </button>
            )}

            {canManageVideos && (
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'videos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <PlaySquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Videos ({videos.length})</span>
              </button>
            )}

            {canManagePdfs && (
              <button
                type="button"
                onClick={() => setActiveTab('pdfs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pdfs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>PDFs ({pdfs.length})</span>
              </button>
            )}

            {canManageAdmins && (
              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'roles'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-bold'
                    : 'bg-[#05070D] border border-zinc-800 text-amber-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Roles Hierarchy</span>
              </button>
            )}

            {canVerifyPayments && (
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'payments'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payments {pendingPaymentsCount > 0 ? `(${pendingPaymentsCount})` : ''}</span>
              </button>
            )}

            {canManageSettings && (
              <button
                type="button"
                onClick={() => setActiveTab('payment-settings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'payment-settings'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Gateway & UPI</span>
              </button>
            )}

            {canViewAnalytics && (
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Analytics</span>
              </button>
            )}

            {canViewAudit && (
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audit</span>
              </button>
            )}
          </div>

          {/* Desktop Navigation Links (Visible ONLY on lg: screens) */}
          <nav className="hidden lg:block space-y-1 text-xs">
            {canViewAnalytics && (
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>Financial Analytics</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">₹{totalRevenue}</span>
              </button>
            )}

            {canManageFolders && (
              <button
                type="button"
                onClick={() => { setActiveTab('folders'); setActiveBrowserFolderId(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'folders' || activeTab === 'categories'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderTree className="w-4 h-4 text-cyan-400" />
                  <span>Categories & Folders</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 font-mono text-zinc-400">
                  {categories.length} Cat • {folders.length} Fld
                </span>
              </button>
            )}

            {canManageVideos && (
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'videos'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PlaySquare className="w-4 h-4" />
                  <span>Video Manager</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 font-mono text-zinc-400">{videos.length}</span>
              </button>
            )}

            {canManagePdfs && (
              <button
                type="button"
                onClick={() => setActiveTab('pdfs')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'pdfs'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>PDF Publications</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 font-mono text-zinc-400">{pdfs.length}</span>
              </button>
            )}

            {canManageStudents && (
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Student & Access</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 font-mono text-zinc-400">{users.length}</span>
              </button>
            )}

            {canManageAdmins && (
              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'roles'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-bold'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Roles & Hierarchy</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 font-bold">SECURE</span>
              </button>
            )}

            {canViewAudit && (
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4" />
                  <span>Security Audit Logs</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 font-mono text-zinc-400">{auditLogs.length}</span>
              </button>
            )}

            {canVerifyPayments && (
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'payments'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Payment Proofs</span>
                </div>
                {pendingPaymentsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-black animate-pulse">
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>
            )}

            {canManageSettings && (
              <button
                type="button"
                onClick={() => setActiveTab('payment-settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                  activeTab === 'payment-settings'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>Payment Gateway</span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4" />
                <span>General Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Footer Navigation Back Button */}
        <div className="hidden lg:block pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Learning Hub</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT WORKSPACE                                   */}
      {/* ======================================================== */}
      <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto min-w-0 pb-36 sm:pb-24 overflow-x-hidden">
        
        {/* ======================================================== */}
        {/* TAB 1: FINANCIAL ANALYTICS                               */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && canViewAnalytics && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Financial & Sales Analytics</h2>
                <p className="text-xs text-zinc-400">Real-time revenue monitoring and transactions registry.</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Sales</span>
                <p className="text-xl font-extrabold text-amber-400 font-mono mt-1">₹{totalRevenue}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Transactions</span>
                <p className="text-xl font-extrabold text-white font-mono mt-1">{sales.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Active Students</span>
                <p className="text-xl font-extrabold text-cyan-400 font-mono mt-1">{users.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Pending Proofs</span>
                <p className="text-xl font-extrabold text-rose-400 font-mono mt-1">{pendingPaymentsCount}</p>
              </div>
            </div>

            {/* Sales Table */}
            <div className="rounded-2xl bg-[#090D16] border border-blue-500/20 overflow-hidden">
              <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Recent Sales History</span>
              </div>
              {sales.length > 0 ? (
                <div className="divide-y divide-zinc-800/80">
                  {sales.map((sale) => (
                    <div key={sale.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{sale.planType}</span>
                        <span className="text-[10px] text-zinc-400 font-mono block">{sale.userEmail}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-400">₹{sale.amount}</span>
                        <span className="text-[10px] text-zinc-500 block">{new Date(sale.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">No sales recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MANAGE CATEGORIES & FOLDERS (UNIFIED HIERARCHY)   */}
        {/* ======================================================== */}
        {(activeTab === 'folders' || activeTab === 'categories') && canManageFolders && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Top Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-cyan-400" />
                  <span>Manage Categories & Folders</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Organize root course suites and unlimited nested subfolders with real-time video counts and ordering.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory({ isActive: true, price: 299, order: categories.length })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Category / Suite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingFolder({
                    parentId: activeBrowserFolderId || (categories[0]?.id || null),
                    categoryId: activeBrowserFolderId 
                      ? (categories.some(c => c.id === activeBrowserFolderId) ? activeBrowserFolderId : folders.find(f => f.id === activeBrowserFolderId)?.categoryId)
                      : (categories[0]?.id || undefined)
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  <FolderPlus className="w-4 h-4 text-cyan-400" />
                  <span>+ New Subfolder</span>
                </button>
              </div>
            </div>

            {/* Search and Navigation Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  placeholder="Filter categories and folders by name or keyword..."
                  className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#090D16] border border-blue-500/15 focus:border-cyan-400 text-xs text-white placeholder-zinc-500 outline-none"
                />
                {folderSearch && (
                  <button onClick={() => setFolderSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer">
                    ✕
                  </button>
                )}
              </div>

              {activeBrowserFolderId && (
                <button
                  type="button"
                  onClick={() => setActiveBrowserFolderId(null)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Root Categories</span>
                </button>
              )}
            </div>

            {/* Breadcrumb Trail */}
            {activeBrowserFolderId && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-[#090D16] border border-blue-500/20 text-xs text-zinc-300 overflow-x-auto">
                {getAdminBreadcrumbs().map((crumb, idx, arr) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                    <button
                      type="button"
                      onClick={() => setActiveBrowserFolderId(crumb.id)}
                      className={`cursor-pointer transition-colors whitespace-nowrap ${
                        idx === arr.length - 1 ? 'text-cyan-400 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* LEVEL 1: ROOT CATEGORIES & MAIN FOLDERS (When activeBrowserFolderId is null) */}
            {!activeBrowserFolderId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Main Course Suites & Categories ({categories.length})
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    Click "Browse Contents" to manage subfolders and lessons.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories
                    .filter(c => !folderSearch || c.name.toLowerCase().includes(folderSearch.toLowerCase()) || (c.description && c.description.toLowerCase().includes(folderSearch.toLowerCase())))
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((cat, idx, arr) => {
                      const catVideos = videos.filter(v => v.categoryId === cat.id);
                      const catFolders = folders.filter(f => f.categoryId === cat.id || f.parentId === cat.id);

                      return (
                        <div
                          key={cat.id}
                          className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20 hover:border-cyan-400/40 transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Card Top: Image + Info */}
                            <div className="flex items-start gap-3 mb-3">
                              <img
                                src={cat.thumbnailUrl}
                                alt={cat.name}
                                className="w-14 h-14 rounded-xl object-cover bg-zinc-900 border border-white/5 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors">
                                    {cat.name}
                                  </h4>
                                  {/* Active / Disabled Toggle Pill */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoryStatus(cat.id, !cat.isActive)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                      cat.isActive 
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900' 
                                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                                    }`}
                                    title={cat.isActive ? 'Active on Home (Click to hide)' : 'Disabled / Hidden (Click to show)'}
                                  >
                                    {cat.isActive ? 'Active' : 'Disabled'}
                                  </button>
                                </div>
                                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                                  {cat.description || 'No description provided.'}
                                </p>
                              </div>
                            </div>

                            {/* Card Metrics & Price */}
                            <div className="flex items-center justify-between py-2 border-y border-zinc-800/80 text-[11px] text-zinc-400">
                              <span className="font-mono text-cyan-300">
                                {catVideos.length} Videos • {catFolders.length} Folders
                              </span>
                              <span className="font-mono font-bold text-amber-400">
                                Pass: ₹{cat.price || 299}
                              </span>
                            </div>
                          </div>

                          {/* Card Actions & Ordering */}
                          <div className="mt-3 pt-2 flex items-center justify-between gap-1.5 text-xs">
                            {/* Reorder Buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveCategoryOrder(cat.id, 'up')}
                                className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"
                                title="Move Up in Home Display"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1}
                                onClick={() => handleMoveCategoryOrder(cat.id, 'down')}
                                className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"
                                title="Move Down in Home Display"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Center Action: Open & Drill */}
                            <button
                              type="button"
                              onClick={() => setActiveBrowserFolderId(cat.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Browse Contents →
                            </button>

                            {/* Right Actions: Edit & Safe Delete */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingCategory(cat)}
                                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryToDelete(cat);
                                  setDeleteCategoryContents(true);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* LEVEL 2+: INSIDE A SPECIFIC CATEGORY OR SUBFOLDER */
              <div className="space-y-5">
                {/* Current Folder Context Banner */}
                {(() => {
                  const curCat = categories.find(c => c.id === activeBrowserFolderId);
                  const curFld = folders.find(f => f.id === activeBrowserFolderId);
                  const name = curCat?.name || curFld?.name || 'Folder';
                  const desc = curCat?.description || curFld?.description || '';
                  const thumb = curCat?.thumbnailUrl || curFld?.thumbnailUrl;

                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#090D16] to-[#05070D] border border-blue-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                          {thumb ? (
                            <img src={thumb} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <FolderOpen className="w-6 h-6 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{name}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono">
                              {curCat ? 'Root Category' : 'Subfolder'}
                            </span>
                          </div>
                          {desc && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{desc}</p>}
                        </div>
                      </div>

                      {/* Quick Add Inside This Folder */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingFolder({
                            parentId: activeBrowserFolderId,
                            categoryId: curCat?.id || curFld?.categoryId
                          })}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>+ Subfolder</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingVideo({
                            categoryId: curCat?.id || curFld?.categoryId || categories[0]?.id,
                            categoryName: curCat?.name || curFld?.categoryName || categories[0]?.name,
                            folderId: activeBrowserFolderId,
                            folderName: name,
                            isPublished: true,
                            isFreePreview: false
                          })}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-cyan-400" />
                          <span>+ Video Lesson</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingPdf({
                            categoryId: curCat?.id || curFld?.categoryId || categories[0]?.id,
                            categoryName: curCat?.name || curFld?.categoryName || categories[0]?.name,
                            folderId: activeBrowserFolderId,
                            folderName: name,
                            isPublished: true
                          })}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-red-400" />
                          <span>+ PDF Guide</span>
                        </button>

                        {curFld && (
                          <button
                            type="button"
                            onClick={() => {
                              setFolderToMove(curFld);
                              setDestinationParentId(curFld.parentId || null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer flex items-center gap-1"
                            title="Move this folder to another parent"
                          >
                            <Move className="w-3.5 h-3.5" />
                            <span>Move</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Subfolders Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                    Nested Subfolders
                  </h4>

                  {(() => {
                    const subfolders = folders.filter(f => {
                      if (!folderSearch) {
                        return f.parentId === activeBrowserFolderId || (!f.parentId && f.categoryId === activeBrowserFolderId);
                      }
                      return (f.parentId === activeBrowserFolderId || (!f.parentId && f.categoryId === activeBrowserFolderId)) &&
                        (f.name.toLowerCase().includes(folderSearch.toLowerCase()) || (f.description && f.description.toLowerCase().includes(folderSearch.toLowerCase())));
                    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                    if (subfolders.length === 0) {
                      return (
                        <div className="p-6 rounded-2xl bg-[#090D16] border border-zinc-800 text-center">
                          <FolderIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-zinc-300">No subfolders inside this level</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Click "+ Subfolder" above to create one.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subfolders.map((folder, idx) => {
                          const childSubs = folders.filter(sf => sf.parentId === folder.id).length;
                          const childVideos = videos.filter(v => v.folderId === folder.id).length;

                          return (
                            <div
                              key={folder.id}
                              className="p-3.5 rounded-2xl bg-[#090D16] border border-blue-500/20 hover:border-cyan-400/40 transition-all flex flex-col justify-between group"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div
                                    onClick={() => setActiveBrowserFolderId(folder.id)}
                                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center shrink-0">
                                      <FolderIcon className="w-4 h-4 text-cyan-400" />
                                    </div>
                                    <span className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition-colors">
                                      {folder.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveFolderOrder(folder.id, 'up')}
                                      className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 hover:text-white cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === subfolders.length - 1}
                                      onClick={() => handleMoveFolderOrder(folder.id, 'down')}
                                      className="p-1 rounded bg-zinc-800/80 hover:bg-zinc-700 disabled:opacity-30 text-zinc-400 hover:text-white cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFolderToMove(folder);
                                        setDestinationParentId(folder.parentId || null);
                                      }}
                                      className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 cursor-pointer"
                                      title="Move Folder"
                                    >
                                      <Move className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingFolder(folder)}
                                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                                      title="Edit Folder"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFolderToDelete(folder);
                                        setDeleteFolderContents(true);
                                      }}
                                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                                      title="Delete Folder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {folder.description && (
                                  <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                                    {folder.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                                <span>{childVideos} Videos • {childSubs} Subfolders</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveBrowserFolderId(folder.id)}
                                  className="text-cyan-400 font-bold hover:underline cursor-pointer"
                                >
                                  Open Folder →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Videos in this Current Level */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Videos in this Folder
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      Direct lessons attached to this level.
                    </span>
                  </div>

                  {(() => {
                    const levelVideos = videos.filter(v => {
                      const curCat = categories.find(c => c.id === activeBrowserFolderId);
                      if (curCat) {
                        return v.categoryId === curCat.id && (!v.folderId || v.folderId === curCat.id);
                      }
                      return v.folderId === activeBrowserFolderId;
                    });

                    if (levelVideos.length === 0) {
                      return (
                        <div className="p-6 rounded-2xl bg-[#090D16] border border-zinc-800 text-center">
                          <PlaySquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-zinc-300">No videos directly in this folder</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Use "+ Video Lesson" above to add one.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {levelVideos.map((video) => (
                          <div
                            key={video.id}
                            className="p-3 rounded-2xl bg-[#090D16] border border-zinc-800 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-12 h-8 rounded-lg object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-xs truncate">{video.title}</h5>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {video.episode || 'EP1'} • {video.duration || '15:00'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleVideo(video)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  video.isPublished ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                                }`}
                              >
                                {video.isPublished ? 'Live' : 'Draft'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingVideo(video)}
                                className="p-1 rounded text-zinc-400 hover:text-white"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Delete video "${video.title}"?`)) {
                                    await deleteVideo(video.id);
                                    showToast('Video deleted', 'info');
                                  }
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: VIDEO MANAGEMENT (Matching Screenshot 3)           */}
        {/* ======================================================== */}
        {activeTab === 'videos' && canManageVideos && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Video Lesson Management</h2>
                <p className="text-xs text-zinc-400">Upload lessons, configure preview locks, and toggle publish status.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo({
                    categoryId: categories[0]?.id || '',
                    categoryName: categories[0]?.name || '',
                    folderId: activeBrowserFolderId || categories[0]?.id,
                    isPublished: true,
                    isFreePreview: false
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Video Lesson</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
                placeholder="Search videos by title or category..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#090D16] border border-blue-500/15 text-xs text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Video List (Matching Screenshot 3) */}
            <div className="space-y-2">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="p-3 rounded-2xl bg-[#090D16] border border-zinc-800/80 hover:border-blue-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[8px] font-mono bg-black/80 text-white">
                        {video.duration || '16:9'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate max-w-sm">{video.title}</span>
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-blue-950 text-cyan-300 border border-blue-800/50">
                          {video.categoryName}
                        </span>
                        {video.folderName && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                            📁 {video.folderName}
                          </span>
                        )}
                        {video.isFreePreview && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold">
                            FREE PREVIEW
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
                        {video.episode} • Added {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Published Toggle (Matching Screenshot 3) */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={operatingIds[video.id]}
                      onClick={() => handleToggleVideo(video)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        video.isPublished
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${video.isPublished ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                      <span>{video.isPublished ? 'Published' : 'Draft'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingVideo(video)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer"
                      title="Edit Video"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete video "${video.title}"?`)) deleteVideo(video.id);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: PDF PUBLICATIONS                                  */}
        {/* ======================================================== */}
        {activeTab === 'pdfs' && canManagePdfs && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">PDF Publications & Study Guides</h2>
                <p className="text-xs text-zinc-400">Manage downloadable notes, formulas, and presets.</p>
              </div>

              <button
                type="button"
                onClick={() => setEditingPdf({
                  categoryId: categories[0]?.id || '',
                  categoryName: categories[0]?.name || '',
                  isPublished: true,
                  pageCount: 10
                })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Upload PDF Guide</span>
              </button>
            </div>

            <div className="space-y-2">
              {filteredPdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="p-3 rounded-2xl bg-[#090D16] border border-zinc-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{pdf.title}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {pdf.categoryName} • {pdf.pageCount} Pages • {pdf.fileSize}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePdfPublish(pdf.id, !pdf.isPublished)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pdf.isPublished ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {pdf.isPublished ? 'Published' : 'Hidden'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPdf(pdf)}
                      className="p-1 rounded text-zinc-400 hover:text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete PDF "${pdf.title}"?`)) deletePdf(pdf.id);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ======================================================== */}
        {/* TAB 6: STUDENT & ACCESS MANAGEMENT (Mobile-First)        */}
        {/* ======================================================== */}
        {activeTab === 'users' && canManageStudents && (
          <div className="space-y-4 animate-in fade-in duration-150 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>User & Access Management</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Assign administrative roles, manage category permissions, and configure student passes.
                </p>
              </div>
            </div>

            {/* Search and Role Filter Bar (Responsive for 320px–430px) */}
            <div className="space-y-2.5">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#090D16] border border-blue-500/20 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400 transition-colors"
                />
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Pills (Mobile horizontal scrollable) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                {[
                  { id: 'all', label: `All Users (${users.length})` },
                  { id: 'student', label: `Students (${studentCount})` },
                  { id: 'admin', label: `Admins (${adminCount})` },
                  { id: 'master', label: `Super Admins (${masterCount})` },
                  { id: 'owner', label: 'Owner (1)' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setUserRoleFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      userRoleFilter === f.id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-[#090D16] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Metrics Chip Summary */}
            <div className="p-3 rounded-xl bg-[#090D16] border border-blue-500/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Showing {filteredUsers.length} of {users.length} Users</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-semibold">{allAccessCount} All-Access</span>
              </div>
              <span className="text-zinc-500 font-mono text-[10px]">
                {adminCount + masterCount + 1} System Authorities
              </span>
            </div>

            {/* User Management Cards (Mobile-First Single Column) */}
            <div className="space-y-3.5">
              {filteredUsers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#090D16] border border-zinc-800 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-zinc-300">No users match your search criteria</p>
                  <p className="text-[11px] text-zinc-500">Try clearing the search query or changing the role filter.</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isUserOwner = isProtectedOwner(user);
                  const isUserMaster = user.role === 'master_admin';
                  const isUserAdmin = user.role === 'admin';
                  const userCatsCount = user.hasAllAccess 
                    ? categories.length 
                    : (user.allowedCategories?.length || 0);

                  return (
                    <div
                      key={user.uid}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[#090D16] border border-blue-500/20 space-y-3.5 shadow-xl min-w-0 overflow-hidden"
                    >
                      {/* Top User Identity Section */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar with Role-themed Accent */}
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl p-0.5 shrink-0 shadow-md ${
                          isUserOwner
                            ? 'bg-gradient-to-tr from-amber-500 to-yellow-400'
                            : isUserMaster
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-500'
                              : isUserAdmin
                                ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                                : 'bg-zinc-800 border border-zinc-700'
                        }`}>
                          <div className="w-full h-full rounded-[14px] bg-[#05070D] flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <span className={
                                isUserOwner ? 'text-amber-300 font-extrabold' :
                                isUserMaster ? 'text-purple-300 font-extrabold' :
                                isUserAdmin ? 'text-blue-300 font-bold' :
                                'text-cyan-400 font-bold'
                              }>
                                {user.displayName?.[0] || 'U'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Name, Role Badge, Email, Phone */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-white break-words">
                              {user.displayName || 'Anonymous Student'}
                            </span>
                            {renderRoleBadge(user)}
                            {user.isSuspended && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                                SUSPENDED
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-zinc-400 font-mono break-all block mt-0.5">
                            {user.email}
                          </span>

                          {user.phoneNumber && (
                            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{user.phoneNumber}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Permissions Summary & All-Access Status Row */}
                      <div className="p-2.5 rounded-xl bg-[#05070D] border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        {/* Summary description */}
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                            Authority & Privileges
                          </span>
                          <span className="text-xs text-zinc-300 font-medium truncate block">
                            {isUserOwner ? (
                              <span className="text-amber-300 font-semibold">Immutable Platform Owner (Full Control)</span>
                            ) : isUserMaster ? (
                              <span className="text-purple-300 font-semibold">Super Administrator (Unrestricted Access)</span>
                            ) : isUserAdmin ? (
                              <span className="text-blue-300 font-semibold">
                                {user.assignedRoleTitle || 'Administrator'} • {user.permissions?.length || 0} Permissions Configured
                              </span>
                            ) : (
                              <span>
                                {user.hasAllAccess 
                                  ? 'All-Access Pass Holder (All Courses Unlocked)' 
                                  : `${userCatsCount} of ${categories.length} Categories Unlocked`}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* All-Access Badge */}
                        <div className="shrink-0">
                          {user.hasAllAccess ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>All-Access Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700">
                              <span>Standard Pass</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Touch-Friendly Action Buttons Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Manage Role Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenManageRoleSheet(user)}
                          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4 text-cyan-300" />
                          <span>Manage Role</span>
                        </button>

                        {/* All-Access Quick Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserAllAccess(user)}
                          disabled={operatingIds[user.uid]}
                          className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            operatingIds[user.uid]
                              ? 'opacity-60 cursor-not-allowed bg-zinc-800 text-zinc-500'
                              : user.hasAllAccess
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {operatingIds[user.uid] ? (
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                          ) : user.hasAllAccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Turn OFF All-Access</span>
                            </>
                          ) : (
                            <>
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              <span>Grant All-Access Pass</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Category Access Controls (Vertically Stacked Mobile Cards) */}
                      <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs font-bold text-white">Course Category Access</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-cyan-300">
                              {userCatsCount}/{categories.length} ON
                            </span>
                          </div>

                          {/* Quick Batch Controls (Turn ON / OFF All) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleBulkCategoryAccess(user.uid, true)}
                              disabled={categoryToggling[`${user.uid}_all`]}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                            >
                              Turn ON All
                            </button>
                            <span className="text-zinc-600 text-xs">•</span>
                            <button
                              type="button"
                              onClick={() => handleBulkCategoryAccess(user.uid, false)}
                              disabled={categoryToggling[`${user.uid}_all`]}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-400 hover:text-white border border-zinc-700 transition-all cursor-pointer"
                            >
                              Turn OFF All
                            </button>
                          </div>
                        </div>

                        {/* Responsive Category Access Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {categories.map((cat) => {
                            const hasCat = user.hasAllAccess || user.allowedCategories?.includes(cat.id);
                            const isTogglingThis = categoryToggling[`${user.uid}_${cat.id}`];

                            return (
                              <div
                                key={cat.id}
                                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 min-w-0 ${
                                  hasCat 
                                    ? 'bg-[#091522] border-emerald-500/35 text-white' 
                                    : 'bg-[#05070D] border-zinc-800/80 text-zinc-400'
                                }`}
                              >
                                {/* Left Category Info */}
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold text-white truncate block">
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-mono block">
                                    ₹{cat.price || 299} • {cat.videoCount || 0} Lessons
                                  </span>
                                </div>

                                {/* Right: Accessible Touch-Friendly Toggle Switch */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={hasCat}
                                  onClick={() => handleToggleCategoryAccess(user.uid, cat.id, hasCat)}
                                  disabled={isTogglingThis}
                                  className={`flex items-center gap-1.5 shrink-0 cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors ${
                                    isTogglingThis ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title={`${hasCat ? 'Disable' : 'Enable'} access to ${cat.name}`}
                                >
                                  <span className={`text-[10px] font-extrabold uppercase ${
                                    hasCat ? 'text-emerald-400' : 'text-zinc-500'
                                  }`}>
                                    {hasCat ? 'ON' : 'OFF'}
                                  </span>

                                  {/* Switch Track */}
                                  <div className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                                    hasCat ? 'bg-emerald-600 justify-end' : 'bg-zinc-700 justify-start'
                                  }`}>
                                    {isTogglingThis ? (
                                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                                    )}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: ROLES & PERMISSIONS SECTION                       */}
        {/* ======================================================== */}
        {activeTab === 'roles' && canManageAdmins && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Roles & Administrator Hierarchy</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Manage administrator authorities, assign predefined roles, and configure granular permissions.
                </p>
              </div>
            </div>

            {/* Protected Owner Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5 fill-black" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Protected Platform Owner</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-400 text-black">
                      PERMANENT
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">Authorized by verified Firebase owner email</span>
                </div>
              </div>
              <span className="text-[11px] text-amber-300 font-semibold hidden sm:inline">
                Full Immutable System Authority
              </span>
            </div>

            {/* Administrator Management Table */}
            <div className="space-y-2.5">
              {users.filter(u => u.role !== 'user' || isProtectedOwner(u)).map((admin) => {
                const isTargetOwner = isProtectedOwner(admin);
                const isTargetMaster = admin.role === 'master_admin';

                return (
                  <div
                    key={admin.uid}
                    className="p-3.5 rounded-2xl bg-[#090D16] border border-blue-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isTargetOwner
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-extrabold'
                          : isTargetMaster
                            ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-extrabold'
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold'
                      }`}>
                        {admin.displayName?.[0] || 'A'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-white break-words">{admin.displayName}</span>
                          {renderRoleBadge(admin)}
                          {admin.isSuspended && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono break-all block mt-0.5">
                          {admin.email} • {admin.permissions?.length || 0} Permissions
                        </span>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {!isTargetOwner && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenManageRoleSheet(admin)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-cyan-300 border border-blue-500/30 text-xs font-bold cursor-pointer"
                        >
                          Manage Role
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSuspension(admin)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            admin.isSuspended
                              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/70 border border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {admin.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(admin)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                        >
                          Demote
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: SECURITY AUDIT LOGS                               */}
        {/* ======================================================== */}
        {activeTab === 'audit' && canViewAudit && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  <span>Security Audit Logs</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Traceable history of administrative actions, permission appointments, and login events.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Filter logs by actor, action..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#090D16] border border-blue-500/15 text-xs text-white placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#090D16] border border-blue-500/15 overflow-hidden">
              <div className="divide-y divide-zinc-800/80">
                {filteredAuditLogs.length > 0 ? (
                  filteredAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300 font-mono text-[11px]">{log.action}</span>
                          <span className="text-[10px] text-zinc-500">•</span>
                          <span className="text-zinc-300 font-semibold">{log.actorEmail}</span>
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 font-mono">{log.actorRole}</span>
                        </div>
                        <p className="text-zinc-400 text-[11px] leading-tight">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">No audit logs recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 9: PAYMENT PROOFS                                    */}
        {/* ======================================================== */}
        {activeTab === 'payments' && canVerifyPayments && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-white">Payment Proof Submissions</h2>
              <p className="text-xs text-zinc-400">Verify user UPI payment screenshots and unlock courses.</p>
            </div>

            <div className="space-y-2.5">
              {paymentRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl bg-[#090D16] border border-blue-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={req.proofUrl}
                      alt="Proof Thumbnail"
                      onClick={() => setViewingProof(req)}
                      className="w-14 h-14 rounded-xl object-cover border border-zinc-700 cursor-pointer hover:scale-105 transition-transform"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{req.userName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          req.status === 'approved' 
                            ? 'bg-emerald-950 text-emerald-400' 
                            : req.status === 'rejected' 
                              ? 'bg-rose-950 text-rose-400' 
                              : 'bg-amber-950 text-amber-400 animate-pulse'
                        }`}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono block">
                        ₹{req.amount} • {req.planType === 'all_access' ? 'All-Access Pass' : req.categoryName}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        UTR: {req.utr} • {new Date(req.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewingProof(req)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 10: PAYMENT SETTINGS (GATEWAY)                       */}
        {/* ======================================================== */}
        {activeTab === 'payment-settings' && canManageSettings && (
          <form onSubmit={handleSaveSettings} className="max-w-md space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-bold text-white">UPI Gateway & Platform Settings</h2>
              <p className="text-xs text-zinc-400">Configure recipient UPI details, payee branding, and pricing.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#090D16] border border-blue-500/20 space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Recipient UPI ID *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.upiId}
                  onChange={e => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Payee Name *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.payeeName}
                  onChange={e => setSettingsForm({ ...settingsForm, payeeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Payment Contact Mobile Number</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">+91 Supported</span>
                </div>
                <input
                  type="tel"
                  value={settingsForm.paymentPhone || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, paymentPhone: e.target.value })}
                  placeholder="Enter contact mobile number"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 focus:border-cyan-400 text-white font-mono outline-none transition-colors"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Displayed to students for payment instructions, assistance & WhatsApp support. Leave empty to hide.
                </p>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">All-Access Pass Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={99}
                  value={settingsForm.allAccessPrice}
                  onChange={e => setSettingsForm({ ...settingsForm, allAccessPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white font-mono outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isSavingSettings ? 'Saving...' : 'Save Payment Gateway Settings'}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 11: GENERAL SETTINGS & SOURCE EXPORT                 */}
        {/* ======================================================== */}
        {activeTab === 'general' && (
          <div className="max-w-lg space-y-4 animate-in fade-in duration-150">
            <div className="p-5 rounded-2xl bg-[#090D16] border border-blue-500/20 space-y-4">
              <h2 className="text-base font-bold text-white">Platform Actions & Utilities</h2>
              
              <div className="p-3.5 rounded-xl bg-[#05070D] border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-white block">Download Complete Project ZIP</span>
                <p className="text-[11px] text-zinc-400">
                  Export the full source code archive of Skill-Flix.
                </p>
                <a
                  href="/skill-flix-source.zip"
                  download="skill-flix-source.zip"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  <span>Download skill-flix-source.zip</span>
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-[#05070D] border border-zinc-800 space-y-2">
                <span className="text-xs font-bold text-white block">Pre-seed Course & Folder Hierarchy</span>
                <p className="text-[11px] text-zinc-400">
                  Initialize Alight Motion, CapCut, Premiere Pro, and After Effects courses with structured subfolders and lessons.
                </p>
                <button
                  type="button"
                  onClick={onSeedDefaults}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs cursor-pointer"
                >
                  Initialize Suites & Folders Now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: EDIT / CREATE FOLDER                              */}
      {/* ======================================================== */}
      {editingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-5 text-white my-6">
            <button onClick={() => setEditingFolder(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              <span>{editingFolder.id ? 'Edit Folder' : 'Create New Folder'}</span>
            </h3>

            <form onSubmit={handleSaveFolderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Folder Name *</label>
                <input
                  type="text"
                  required
                  value={editingFolder.name || ''}
                  onChange={e => setEditingFolder({ ...editingFolder, name: e.target.value })}
                  placeholder="e.g. Beginner Course / Advanced Editing"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Parent Suite / Category</label>
                <select
                  value={editingFolder.categoryId || ''}
                  onChange={e => {
                    const c = categories.find(cat => cat.id === e.target.value);
                    setEditingFolder({ 
                      ...editingFolder, 
                      categoryId: e.target.value, 
                      categoryName: c?.name || '',
                      parentId: editingFolder.parentId || e.target.value
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <option value="">Select Root Category (Optional)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Parent Subfolder (Optional)</label>
                <select
                  value={editingFolder.parentId || ''}
                  onChange={e => setEditingFolder({ ...editingFolder, parentId: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <option value="">None (Top Level in Category)</option>
                  {folders.filter(f => f.id !== editingFolder.id).map(f => (
                    <option key={f.id} value={f.id}>📁 {f.name} ({f.categoryName || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={editingFolder.description || ''}
                  onChange={e => setEditingFolder({ ...editingFolder, description: e.target.value })}
                  placeholder="Brief summary of what this folder contains..."
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Thumbnail URL (Optional)</label>
                <input
                  type="url"
                  value={editingFolder.thumbnailUrl || ''}
                  onChange={e => setEditingFolder({ ...editingFolder, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Folder
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SAFE FOLDER DELETION WITH CONFIRMATION            */}
      {/* ======================================================== */}
      {folderToDelete && (() => {
        const childVideos = videos.filter(v => v.folderId === folderToDelete.id).length;
        const childSubs = folders.filter(f => f.parentId === folderToDelete.id).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-[#0B0F19] border border-rose-500/40 rounded-2xl p-5 text-white shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              
              <h3 className="text-sm font-bold text-white mb-1">
                Delete Folder "{folderToDelete.name}"?
              </h3>

              <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                This folder currently contains <strong className="text-amber-400">{childSubs} subfolders</strong> and <strong className="text-cyan-400">{childVideos} video lessons</strong>. Please choose how you want to handle these contents:
              </p>

              <div className="space-y-2 p-3 rounded-xl bg-[#05070D] border border-zinc-800 text-xs mb-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteFolderContents}
                    onChange={() => setDeleteFolderContents(true)}
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <span className="font-semibold text-rose-300 block">Delete folder AND all contained subfolders & videos permanently</span>
                    <span className="text-[11px] text-zinc-400">Purges this folder and recursively deletes all nested lessons and subfolders.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-zinc-800/80">
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={!deleteFolderContents}
                    onChange={() => setDeleteFolderContents(false)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-cyan-300 block">Delete folder only, preserve contents</span>
                    <span className="text-[11px] text-zinc-400">Moves videos and subfolders up into the parent folder or category.</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteFolder}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Confirm Deletion
                </button>
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL: SAFE CATEGORY DELETION WITH CONFIRMATION          */}
      {/* ======================================================== */}
      {categoryToDelete && (() => {
        const catVideos = videos.filter(v => v.categoryId === categoryToDelete.id).length;
        const catFolders = folders.filter(f => f.categoryId === categoryToDelete.id || f.parentId === categoryToDelete.id).length;
        const catPdfs = pdfs.filter(p => p.categoryId === categoryToDelete.id).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-[#0B0F19] border border-rose-500/40 rounded-2xl p-5 text-white shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              
              <h3 className="text-sm font-bold text-white mb-1">
                Delete Category Suite "{categoryToDelete.name}"?
              </h3>

              <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                This course suite contains <strong className="text-cyan-400">{catVideos} videos</strong>, <strong className="text-amber-400">{catFolders} subfolders</strong>, and <strong className="text-red-400">{catPdfs} PDFs</strong>.
              </p>

              <div className="space-y-2 p-3 rounded-xl bg-[#05070D] border border-zinc-800 text-xs mb-4">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteCatOption"
                    checked={deleteCategoryContents}
                    onChange={() => setDeleteCategoryContents(true)}
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <span className="font-semibold text-rose-300 block">Delete suite AND all contained folders, videos & PDFs</span>
                    <span className="text-[11px] text-zinc-400">Permanently removes the course suite and all its lessons and study materials.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-zinc-800/80">
                  <input
                    type="radio"
                    name="deleteCatOption"
                    checked={!deleteCategoryContents}
                    onChange={() => setDeleteCategoryContents(false)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-cyan-300 block">Delete suite only, keep content</span>
                    <span className="text-[11px] text-zinc-400">Removes the root category card but unassigns contents so they are not deleted.</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Confirm Delete Suite
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL: MOVE FOLDER DESTINATION SELECTOR                  */}
      {/* ======================================================== */}
      {folderToMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-amber-500/30 rounded-2xl p-5 text-white shadow-2xl">
            <button onClick={() => setFolderToMove(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
              <Move className="w-4 h-4 text-amber-400" />
              <span>Move Folder "{folderToMove.name}"</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Select the new destination parent suite or folder for this folder.
            </p>

            <div className="space-y-3 text-xs mb-4">
              <div>
                <label className="block text-zinc-300 mb-1.5 font-semibold">Destination Location:</label>
                <select
                  value={destinationParentId || ''}
                  onChange={e => setDestinationParentId(e.target.value || null)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <optgroup label="Root Course Suites">
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        🏛️ {c.name} (Top-level in suite)
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Folders & Subfolders">
                    {folders
                      .filter(f => f.id !== folderToMove.id)
                      .map(f => {
                        // Check if f is a descendant of folderToMove to prevent circular reference
                        let isChild = false;
                        let curr = f;
                        while (curr && curr.parentId) {
                          if (curr.parentId === folderToMove.id) {
                            isChild = true;
                            break;
                          }
                          curr = folders.find(parent => parent.id === curr.parentId) as any;
                        }
                        if (isChild) return null;

                        return (
                          <option key={f.id} value={f.id}>
                            📁 {f.name} ({f.categoryName || 'General'})
                          </option>
                        );
                      })
                      .filter(Boolean)}
                  </optgroup>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[#05070D] border border-zinc-800/80 text-[11px] text-zinc-400">
                <span className="text-amber-400 font-semibold block mb-0.5">Note:</span>
                Moving this folder will carry all of its subfolders, lessons, and resources along to the new destination.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExecuteMoveFolder}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs cursor-pointer shadow-md"
              >
                Execute Move
              </button>
              <button
                type="button"
                onClick={() => setFolderToMove(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BOTTOM SHEET / MODAL: MANAGE ROLE & PERMISSIONS          */}
      {/* ======================================================== */}
      {manageRoleTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/85 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B0F19] border-t sm:border border-blue-500/30 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 text-white max-h-[92vh] sm:max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl flex flex-col space-y-4">
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto sm:hidden shrink-0 -mt-1 mb-1" />

            {/* Header: User Profile Summary */}
            <div className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl p-0.5 shrink-0 ${
                  isProtectedOwner(manageRoleTarget)
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400'
                    : manageRoleTarget.role === 'master_admin'
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-500'
                      : manageRoleTarget.role === 'admin'
                        ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                        : 'bg-zinc-800 border border-zinc-700'
                }`}>
                  <div className="w-full h-full rounded-[14px] bg-[#05070D] flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                    {manageRoleTarget.photoURL ? (
                      <img src={manageRoleTarget.photoURL} alt={manageRoleTarget.displayName} className="w-full h-full object-cover" />
                    ) : (
                      manageRoleTarget.displayName?.[0] || 'U'
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-white truncate">
                      {manageRoleTarget.displayName || 'User'}
                    </span>
                    {renderRoleBadge(manageRoleTarget)}
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono break-all block mt-0.5">
                    {manageRoleTarget.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isSavingRoleAction) {
                    setManageRoleTarget(null);
                    setRoleSheetStep('actions');
                    setPendingRoleAction(null);
                  }
                }}
                disabled={isSavingRoleAction}
                className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white cursor-pointer shrink-0 disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: ACTIONS MENU */}
            {roleSheetStep === 'actions' && (
              <div className="space-y-3">
                {isProtectedOwner(manageRoleTarget) ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 fill-amber-300 text-amber-300" />
                      <span className="font-bold text-sm">Protected Platform Owner</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      This is the primary immutable platform owner account. System ownership credentials, All-Access rights, and core administrative privileges are permanently protected and cannot be modified or downgraded.
                    </p>
                    <button
                      type="button"
                      onClick={() => setManageRoleTarget(null)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs mt-2 cursor-pointer shadow-md"
                    >
                      Close Menu
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Available Role Actions
                    </span>

                    <div className="space-y-2">
                      {/* ACTION: MAKE ADMIN (If student) */}
                      {manageRoleTarget.role === 'user' && (
                        <button
                          type="button"
                          onClick={() => handleInitiateRoleAction(
                            'make_admin',
                            'Make Administrator',
                            `Are you sure you want to promote ${manageRoleTarget.displayName || manageRoleTarget.email} to an Administrator? They will be granted content and student management permissions.`,
                            'Confirm Make Admin',
                            'blue'
                          )}
                          className="w-full p-3.5 rounded-2xl bg-[#05070D] hover:bg-[#070D1A] border border-blue-500/25 hover:border-blue-500/50 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-cyan-300 flex items-center justify-center shrink-0">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white block group-hover:text-cyan-300">
                                Make Admin
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                Grant standard administrative access to courses, videos, and students.
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                        </button>
                      )}

                      {/* ACTION: MAKE SUPER ADMIN (Owner-only privilege) */}
                      {isOwner && manageRoleTarget.role !== 'master_admin' && (
                        <button
                          type="button"
                          onClick={() => handleInitiateRoleAction(
                            'make_super_admin',
                            'Make Super Admin',
                            `Are you sure you want to appoint ${manageRoleTarget.displayName || manageRoleTarget.email} as Super Administrator? This grants unrestricted platform authority and All-Access to all course suites. Only the Platform Owner can manage or revoke this role.`,
                            'Confirm Super Admin',
                            'purple'
                          )}
                          className="w-full p-3.5 rounded-2xl bg-[#09071A] hover:bg-[#120B2E] border border-purple-500/30 hover:border-purple-500/60 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white group-hover:text-purple-300">
                                  Make Super Admin
                                </span>
                                <span className="text-[9px] font-extrabold uppercase px-1.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                  OWNER ONLY
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                Grant complete, unrestricted authority over all settings and courses.
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                        </button>
                      )}

                      {/* ACTION: DEMOTE SUPER ADMIN (Owner-only) */}
                      {isOwner && manageRoleTarget.role === 'master_admin' && (
                        <button
                          type="button"
                          onClick={() => handleInitiateRoleAction(
                            'demote_super_admin',
                            'Demote Super Admin',
                            `Are you sure you want to reduce ${manageRoleTarget.displayName || manageRoleTarget.email} from Super Administrator to standard Administrator?`,
                            'Confirm Demote to Admin',
                            'amber'
                          )}
                          className="w-full p-3.5 rounded-2xl bg-[#140D05] hover:bg-[#1F1408] border border-amber-500/30 hover:border-amber-500/60 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white group-hover:text-amber-300">
                                Demote Super Admin
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                Step down from Super Admin to regular Administrator role.
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                        </button>
                      )}

                      {/* ACTION: REMOVE ADMIN ACCESS (Demote back to Student) */}
                      {(manageRoleTarget.role === 'admin' || (isOwner && manageRoleTarget.role === 'master_admin')) && (
                        <button
                          type="button"
                          onClick={() => handleInitiateRoleAction(
                            'remove_admin',
                            'Remove Admin Access',
                            `Are you sure you want to revoke all administrative access from ${manageRoleTarget.displayName || manageRoleTarget.email}? They will return to a standard student account with no administrative permissions.`,
                            'Confirm Remove Access',
                            'rose'
                          )}
                          className="w-full p-3.5 rounded-2xl bg-[#14070A] hover:bg-[#200A10] border border-rose-500/30 hover:border-rose-500/60 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-600/20 text-rose-300 flex items-center justify-center shrink-0">
                              <UserMinus className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white group-hover:text-rose-300">
                                Remove Admin Access
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                Revoke all administrative privileges and demote back to Student.
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                        </button>
                      )}

                      {/* ACTION: VIEW / CONFIGURE GRANULAR PERMISSIONS */}
                      <button
                        type="button"
                        onClick={() => setRoleSheetStep('permissions')}
                        className="w-full p-3.5 rounded-2xl bg-[#05070D] hover:bg-[#070D1A] border border-blue-500/25 hover:border-blue-500/50 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-300 flex items-center justify-center shrink-0">
                            <SlidersHorizontal className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white group-hover:text-cyan-300">
                              View Permissions
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              Inspect granular capability matrix or select predefined role templates.
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                      </button>

                      {/* ACTION: SUSPEND / REACTIVATE (For admin accounts) */}
                      {manageRoleTarget.role !== 'user' && (
                        <button
                          type="button"
                          onClick={() => handleInitiateRoleAction(
                            manageRoleTarget.isSuspended ? 'reactivate' : 'suspend',
                            manageRoleTarget.isSuspended ? 'Reactivate Administrator' : 'Suspend Administrator',
                            manageRoleTarget.isSuspended
                              ? `Restore full administrative capabilities for ${manageRoleTarget.displayName || manageRoleTarget.email}?`
                              : `Temporarily suspend ${manageRoleTarget.displayName || manageRoleTarget.email}? They will be blocked from administrative operations until reactivated.`,
                            manageRoleTarget.isSuspended ? 'Confirm Reactivate' : 'Confirm Suspension',
                            manageRoleTarget.isSuspended ? 'emerald' : 'amber'
                          )}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                            manageRoleTarget.isSuspended
                              ? 'bg-[#05140D] hover:bg-[#082015] border-emerald-500/30'
                              : 'bg-[#140D05] hover:bg-[#201408] border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              manageRoleTarget.isSuspended
                                ? 'bg-emerald-600/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              <Power className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white">
                                {manageRoleTarget.isSuspended ? 'Reactivate Admin Account' : 'Suspend Admin Account'}
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                {manageRoleTarget.isSuspended ? 'Account is currently suspended.' : 'Temporarily disable privileges.'}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: CONFIRMATION DIALOG (Mobile Touch-Friendly) */}
            {roleSheetStep === 'confirm' && pendingRoleAction && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-[#05070D] border border-blue-500/20 text-center space-y-2.5">
                  <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
                    pendingRoleAction.variant === 'purple' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40' :
                    pendingRoleAction.variant === 'rose' ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40' :
                    pendingRoleAction.variant === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    pendingRoleAction.variant === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-blue-600/20 text-cyan-300 border border-blue-500/40'
                  }`}>
                    {pendingRoleAction.variant === 'purple' ? <Sparkles className="w-6 h-6" /> :
                     pendingRoleAction.variant === 'rose' ? <UserMinus className="w-6 h-6" /> :
                     pendingRoleAction.variant === 'amber' ? <AlertTriangle className="w-6 h-6" /> :
                     <Shield className="w-6 h-6" />}
                  </div>

                  <h3 className="font-bold text-sm text-white">{pendingRoleAction.title}</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                    {pendingRoleAction.description}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Security change will immediately sync with Firebase Firestore.
                  </p>
                </div>

                {/* Cancel & Confirm Buttons (Prevent duplicate submissions) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSavingRoleAction) {
                        setRoleSheetStep('actions');
                        setPendingRoleAction(null);
                      }
                    }}
                    disabled={isSavingRoleAction}
                    className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmRoleAction}
                    disabled={isSavingRoleAction}
                    className={`py-3 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                      pendingRoleAction.variant === 'purple' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30' :
                      pendingRoleAction.variant === 'rose' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' :
                      pendingRoleAction.variant === 'amber' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' :
                      pendingRoleAction.variant === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' :
                      'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    }`}
                  >
                    {isSavingRoleAction ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{pendingRoleAction.confirmLabel}</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: GRANULAR PERMISSIONS & ROLE TEMPLATES */}
            {roleSheetStep === 'permissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRoleSheetStep('actions')}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Menu</span>
                  </button>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {customPermissions.length} Active Permissions
                  </span>
                </div>

                {/* Predefined Role Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Select Role Template</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'video_manager', label: 'Video Manager' },
                      { id: 'finance_manager', label: 'Finance Manager' },
                      { id: 'student_support', label: 'Student Support' },
                      { id: 'admin', label: 'Full Admin' },
                      ...(isOwner ? [{ id: 'master_admin', label: 'Master Admin' }] : []),
                      { id: 'custom', label: 'Custom Perms' }
                    ].map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => {
                          const r = role.id as PredefinedRole;
                          setSelectedRoleType(r);
                          setCustomPermissions(getPermissionsForRole(r));
                        }}
                        className={`py-2 px-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                          selectedRoleType === role.id
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-[#05070D] border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Granular Checkboxes List */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {['Dashboard', 'Content Management', 'Media', 'Students & Access', 'Finance', 'Administration'].map((group) => {
                    const groupPerms = SYSTEM_PERMISSIONS.filter(p => p.group === group);
                    return (
                      <div key={group} className="p-2.5 rounded-xl bg-[#05070D] border border-zinc-800 space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                          {group}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {groupPerms.map((perm) => {
                            const isChecked = customPermissions.includes(perm.key);
                            return (
                              <label key={perm.key} className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    setSelectedRoleType('custom');
                                    if (e.target.checked) {
                                      setCustomPermissions([...customPermissions, perm.key]);
                                    } else {
                                      setCustomPermissions(customPermissions.filter(k => k !== perm.key));
                                    }
                                  }}
                                  className="rounded border-zinc-700 text-blue-600"
                                />
                                <span className="truncate" title={perm.description}>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Permissions Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRoleSheetStep('actions')}
                    disabled={isSavingRoleAction}
                    className="py-2.5 px-4 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGranularPermissions}
                    disabled={isSavingRoleAction}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSavingRoleAction ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Permissions</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW PROOF                                        */}
      {/* ======================================================== */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-4 text-white">
            <button onClick={() => setViewingProof(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-1">{viewingProof.userName} ({viewingProof.userEmail})</h3>
            <p className="text-xs text-cyan-300 font-mono mb-3">UTR: {viewingProof.utr} • ₹{viewingProof.amount}</p>
            <img src={viewingProof.proofUrl} alt="Receipt" className="max-h-80 w-full object-contain rounded-lg border border-zinc-800 mb-3 bg-black" />
            {viewingProof.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleResolvePayment(viewingProof.id, 'approved')}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Approve & Unlock
                </button>
                <button
                  type="button"
                  onClick={() => handleResolvePayment(viewingProof.id, 'rejected')}
                  className="flex-1 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold text-xs cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT VIDEO                               */}
      {/* ======================================================== */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-5 text-white my-6">
            <button onClick={() => setEditingVideo(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-3">
              {editingVideo.id ? 'Edit Video Lesson' : 'Upload Video Lesson'}
            </h3>

            <form onSubmit={handleSaveVideoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  required
                  value={editingVideo.title || ''}
                  onChange={e => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  placeholder="e.g. Master Vector Curvature Handles"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Course Suite / Category *</label>
                <select
                  required
                  value={editingVideo.categoryId || ''}
                  onChange={e => {
                    const c = categories.find(cat => cat.id === e.target.value);
                    setEditingVideo({ 
                      ...editingVideo, 
                      categoryId: e.target.value, 
                      categoryName: c?.name || '',
                      folderId: editingVideo.folderId || e.target.value
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Folder Destination</label>
                <select
                  value={editingVideo.folderId || ''}
                  onChange={e => {
                    const f = folders.find(fld => fld.id === e.target.value);
                    setEditingVideo({
                      ...editingVideo,
                      folderId: e.target.value,
                      folderName: f?.name || ''
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <option value="">Category Root</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 {f.name} ({f.categoryName || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Video URL (YouTube, Vimeo or MP4) *</label>
                <input
                  type="url"
                  required
                  value={editingVideo.videoUrl || ''}
                  onChange={e => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                  placeholder="YouTube, Vimeo or MP4 URL"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Episode Tag</label>
                  <input
                    type="text"
                    value={editingVideo.episode || 'EP1'}
                    onChange={e => setEditingVideo({ ...editingVideo, episode: e.target.value })}
                    placeholder="EP1"
                    className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Duration</label>
                  <input
                    type="text"
                    value={editingVideo.duration || '15:00'}
                    onChange={e => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                    placeholder="15:00"
                    className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Thumbnail URL</label>
                <input
                  type="url"
                  value={editingVideo.thumbnailUrl || ''}
                  onChange={e => setEditingVideo({ ...editingVideo, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVideo.isFreePreview || false}
                    onChange={e => setEditingVideo({ ...editingVideo, isFreePreview: e.target.checked })}
                    className="rounded border-zinc-700 text-blue-600"
                  />
                  <span>Free Preview</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingVideo.isPublished ?? true}
                    onChange={e => setEditingVideo({ ...editingVideo, isPublished: e.target.checked })}
                    className="rounded border-zinc-700 text-blue-600"
                  />
                  <span>Published Immediately</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer mt-2"
              >
                Save Video Lesson
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT PDF                                 */}
      {/* ======================================================== */}
      {editingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="relative w-full max-w-sm bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-5 text-white">
            <button onClick={() => setEditingPdf(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-3">Upload PDF Resource</h3>
            <form onSubmit={handleSavePdfSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  required
                  value={editingPdf.title || ''}
                  onChange={e => setEditingPdf({ ...editingPdf, title: e.target.value })}
                  placeholder="e.g. Speed Curves Formula Guide"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Category *</label>
                <select
                  required
                  value={editingPdf.categoryId || ''}
                  onChange={e => {
                    const c = categories.find(cat => cat.id === e.target.value);
                    setEditingPdf({ ...editingPdf, categoryId: e.target.value, categoryName: c?.name || '' });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">PDF Document URL *</label>
                <input
                  type="url"
                  required
                  value={editingPdf.pdfUrl || ''}
                  onChange={e => setEditingPdf({ ...editingPdf, pdfUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer mt-2"
              >
                Save PDF Guide
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT CATEGORY                            */}
      {/* ======================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-blue-500/30 rounded-2xl p-5 text-white my-6">
            <button onClick={() => setEditingCategory(null)} className="absolute top-3.5 right-3.5 p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{editingCategory.id ? 'Edit Course Suite' : 'Create New Course Suite'}</span>
            </h3>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Suite / Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="e.g. Alight Motion / CapCut / Premiere Pro / Photoshop"
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Detailed description of the suite curriculum..."
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Pass Price (₹)</label>
                  <input
                    type="number"
                    min={49}
                    value={editingCategory.price ?? 299}
                    onChange={e => setEditingCategory({ ...editingCategory, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1 font-semibold">Display Order</label>
                  <input
                    type="number"
                    value={editingCategory.order ?? 0}
                    onChange={e => setEditingCategory({ ...editingCategory, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">Thumbnail Cover URL</label>
                <input
                  type="url"
                  value={editingCategory.thumbnailUrl || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, thumbnailUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-[#05070D] border border-blue-500/25 text-white outline-none font-mono"
                />
                {editingCategory.thumbnailUrl && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-zinc-800 bg-black">
                    <img src={editingCategory.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.isActive ?? true}
                    onChange={e => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                    className="rounded border-zinc-700 text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-white block">Active on Learning Hub</span>
                    <span className="text-[10px] text-zinc-400">When disabled, this suite and its lessons are hidden from the public home page catalog.</span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Save Course Suite
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
