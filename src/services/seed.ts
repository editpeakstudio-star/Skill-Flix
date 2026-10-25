import { saveCategory, saveFolder, saveVideo, savePdf } from './firebase';

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
  const amBeginner = await saveFolder({
    id: 'fld_am_beginner',
    name: 'Beginner Course',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    parentId: alightMotion.id,
    description: 'Foundational mobile motion design and layout mechanics.',
    order: 0
  });

  const amAdvanced = await saveFolder({
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
  const capReels = await saveFolder({
    id: 'fld_cap_reels',
    name: 'Reels Editing',
    categoryId: capcut.id,
    categoryName: capcut.name,
    parentId: capcut.id,
    description: 'Short-form pacing, dynamic hooks, and trending speed transitions.',
    order: 0
  });

  const capEffects = await saveFolder({
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

  const premTimeline = await saveFolder({
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

  const aeVfx = await saveFolder({
    id: 'fld_ae_vfx',
    name: 'VFX & Motion Graphics',
    categoryId: afterEffects.id,
    categoryName: afterEffects.name,
    parentId: afterEffects.id,
    description: 'Mocha tracking, glow plugins, expression rigging, and displacement maps.',
    order: 0
  });

  // Videos under Alight Motion -> Beginner Course
  await saveVideo({
    id: 'vid_am_vectors',
    title: 'Master Vector Drawing & Custom Shapes',
    description: 'Learn vector anchor manipulation, bezier curvature handles, and line drawing animations in Alight Motion.',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    folderId: amBeginner.id,
    folderName: amBeginner.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    duration: '16:40',
    isPublished: true,
    isFreePreview: true,
    order: 1
  });

  await saveVideo({
    id: 'vid_am_null_rigs',
    title: 'Alight Motion Null Object & Multi-Layer Rigs',
    description: 'Connect complex element hierarchies using parent null layers and linked rotation trackers.',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    folderId: amBeginner.id,
    folderName: amBeginner.name,
    episode: 'EP2',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    duration: '14:22',
    isPublished: true,
    isFreePreview: false,
    order: 2
  });

  // Videos under Alight Motion -> Advanced Editing
  await saveVideo({
    id: 'vid_am_3d_camera',
    title: '3D Camera Orbit & Perspective Scene Building',
    description: 'Build immersive 3D parallax spaces and navigate floating layer cards with custom focal lengths.',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    folderId: amAdvanced.id,
    folderName: amAdvanced.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=600&q=80',
    duration: '21:15',
    isPublished: true,
    isFreePreview: false,
    order: 1
  });

  // Videos under CapCut -> Reels Editing
  await saveVideo({
    id: 'vid_cap_velocity',
    title: 'Velocity Curves & Smooth Slow-Mo Masterclass',
    description: 'Configure optical flow re-timing and bezier velocity graphs for hyper-smooth beat sync drops.',
    categoryId: capcut.id,
    categoryName: capcut.name,
    folderId: capReels.id,
    folderName: capReels.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80',
    duration: '12:30',
    isPublished: true,
    isFreePreview: true,
    order: 1
  });

  // Videos under CapCut -> Effects Tutorial
  await saveVideo({
    id: 'vid_cap_effects',
    title: 'Dynamic Seamless Zoom & Flash Transition Kit',
    description: 'Combine edge glow, chromatic aberration, and directional blur into clean swipe transitions.',
    categoryId: capcut.id,
    categoryName: capcut.name,
    folderId: capEffects.id,
    folderName: capEffects.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    duration: '15:10',
    isPublished: true,
    isFreePreview: false,
    order: 1
  });

  // Premiere Pro Video
  await saveVideo({
    id: 'vid_prem_lumetri',
    title: 'Cinematic Lumetri Color Grading Blueprint',
    description: 'Log curve normalization, teal & orange color splits, and skin tone vector scope isolation.',
    categoryId: premiere.id,
    categoryName: premiere.name,
    folderId: premTimeline.id,
    folderName: premTimeline.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    duration: '28:50',
    isPublished: true,
    isFreePreview: false,
    order: 1
  });

  // After Effects Video
  await saveVideo({
    id: 'vid_ae_saber',
    title: 'Saber Plugin Motion Trails & Sci-Fi VFX',
    description: 'Core energy animations, customized distortion masks, and composite glow falloffs.',
    categoryId: afterEffects.id,
    categoryName: afterEffects.name,
    folderId: aeVfx.id,
    folderName: aeVfx.name,
    episode: 'EP1',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
    duration: '34:20',
    isPublished: true,
    isFreePreview: false,
    order: 1
  });

  // Sample PDF Guides with folder affiliations
  await savePdf({
    id: 'pdf_am_cheatsheet',
    title: 'Alight Motion Vector Keyframe Cheatsheet',
    description: 'Quick reference formulas for graph curve acceleration and bezier anchor positioning.',
    categoryId: alightMotion.id,
    categoryName: alightMotion.name,
    folderId: amBeginner.id,
    folderName: amBeginner.name,
    pageCount: 14,
    fileSize: '4.2 MB',
    pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    isPublished: true,
    order: 1
  });

  await savePdf({
    id: 'pdf_cap_curves',
    title: 'CapCut Viral Velocity Curves Guide',
    description: 'Optimal millisecond markers and speed ratios for Instagram Reels and YouTube Shorts algorithms.',
    categoryId: capcut.id,
    categoryName: capcut.name,
    folderId: capReels.id,
    folderName: capReels.name,
    pageCount: 8,
    fileSize: '2.8 MB',
    pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
    isPublished: true,
    order: 1
  });
}
