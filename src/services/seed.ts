import { saveCategory, saveFolder } from './firebase';

export async function seedEditingSuites(): Promise<void> {
  // 1. Alight Motion Category
  const alightMotion = await saveCategory({
    id: 'cat_alight_motion',
    name: 'Alight Motion',
    slug: 'alight-motion',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    description: 'Master vector drawing, null objects, 3D camera tracking, and speed graph keyframes on mobile.',
    price: 299,
    isActive: true,
    order: 0
  });

  // Alight Motion Subfolders
  await saveFolder({
    id: 'fld_am_beginner',
    name: 'Beginner Course',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    parentId: alightMotion.id,
    description: 'Foundational mobile motion design and layout mechanics.',
    order: 0
  });

  await saveFolder({
    id: 'fld_am_advanced',
    name: 'Advanced Editing',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    parentId: alightMotion.id,
    description: 'Complex 3D parallax spaces, null hierarchies, and custom easing curves.',
    order: 1
  });

  // 2. CapCut Category
  const capcut = await saveCategory({
    id: 'cat_capcut',
    name: 'CapCut',
    slug: 'capcut',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80',
    description: 'Create viral TikTok & Reels edits with velocity curves, 3D zoom, and dynamic keyframe effects.',
    price: 299,
    isActive: true,
    order: 1
  });

  // CapCut Subfolders
  await saveFolder({
    id: 'fld_cap_reels',
    name: 'Reels Editing',
    categoryId: capcut.id,
    categoryName: capcut.name,
    parentId: capcut.id,
    description: 'Short-form pacing, dynamic hooks, and trending speed transitions.',
    order: 0
  });

  await saveFolder({
    id: 'fld_cap_effects',
    name: 'Effects Tutorial',
    categoryId: capcut.id,
    categoryName: capcut.name,
    parentId: capcut.id,
    description: 'Optical flow, blur flashes, glow overlays, and color LUTs.',
    order: 1
  });

  // 3. Premiere Pro Category
  const premiere = await saveCategory({
    id: 'cat_premiere_pro',
    name: 'Premiere Pro',
    slug: 'premiere-pro',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    description: 'Industry-standard timeline pacing, cinematic Lumetri color grading, and multi-track audio engineering.',
    price: 399,
    isActive: true,
    order: 2
  });

  await saveFolder({
    id: 'fld_prem_timeline',
    name: 'Timeline & Pacing',
    categoryId: premiere.id,
    categoryName: premiere.name,
    parentId: premiere.id,
    description: 'Keyboard shortcuts, ripple editing, and rough cut assemblies.',
    order: 0
  });

  // 4. After Effects Category
  const afterEffects = await saveCategory({
    id: 'cat_after_effects',
    name: 'After Effects',
    slug: 'after-effects',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    description: 'Advanced visual effects (VFX), rotoscoping, particle simulations, and motion graphic typography.',
    price: 499,
    isActive: true,
    order: 3
  });

  await saveFolder({
    id: 'fld_ae_vfx',
    name: 'VFX & Motion Graphics',
    categoryId: afterEffects.id,
    categoryName: afterEffects.name,
    parentId: afterEffects.id,
    description: 'Mocha tracking, glow plugins, expression rigging, and displacement maps.',
    order: 0
  });

}
