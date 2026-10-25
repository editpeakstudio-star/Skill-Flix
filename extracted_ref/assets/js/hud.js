/* Netlify HUD — the badge and owner toolbar Netlify injects on published sites.
   Built inside a srcdoc iframe from the data-* attributes on the injected tag. */
(() => {
  "use strict";

  const script =
    document.currentScript || document.querySelector("script[data-nf-variant]");
  if (!script) return;

  const ds = script.dataset;

  const warn = (msg) =>
    console.warn("[netlify-hud] " + msg + "; not rendering");

  const raw = ds.nfVariant;
  if (!raw) return;
  const variant = raw === "public" || raw === "owner-private" ? raw : null;
  if (!variant) return warn("unknown variant: " + raw);

  const APP_HOSTS = ["app.netlify.com", "app.netlifystg.com"];
  const APP_HOST = APP_HOSTS.indexOf(ds.appHost || "") !== -1 ? ds.appHost : "";
  const SITE_ID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      ds.netlifySiteId || ""
    )
      ? ds.netlifySiteId
      : "";

  if (!APP_HOST) return warn("missing or invalid data-app-host");
  if (variant === "owner-private" && !SITE_ID)
    return warn("missing or invalid data-netlify-site-id");

  // On the free tier the badge is part of the plan: no "Hide this badge", and a
  // stored dismissal is not honoured. Proxy stamps the lowercase tier as
  // data-account-tier; only the literal "free" counts. The owner HUD ignores it.
  const HIDEABLE = variant !== "public" || ds.accountTier !== "free";

  // Underscore, though the acquisition standard's per-feature table spells this
  // netlify-badge. Its formatting rule allows underscores with a reason, and the reason
  // is series continuity: this is the highest-volume owned-loop surface, and renaming it
  // splits every existing report at the cutover.
  // Notion: "Marketing Channel Classification - Review", 3cd1da88359a80aabee7f7ddbc8c490a.
  const UTM_SOURCE = "netlify_badge";

  // Baked at deploy from BRANCH (see netlify.toml): the canary branch, or blank on production/local.
  // Reported as hud_variant. utm_campaign is the program label under the acquisition
  // standard and stays `loops` on every deploy, canary included.
  let HUD_VARIANT = "main";
  if (HUD_VARIANT === "main" || !/^[a-z0-9-]+$/.test(HUD_VARIANT)) HUD_VARIANT = "";

  if (
    document.getElementById("nl-hud-frame") ||
    document.getElementById("nl-badge-frame")
  )
    return;

  /* ————— Dismissal, remembered per site and per device ————— */
  const STORE_KEY = "nl-hud:" + variant + ":v1";
  // A visitor's "Hide this badge" lapses after a week; the owner's hide is kept
  // until storage is cleared.
  const HIDE_TTL_MS = variant === "public" ? 7 * 24 * 60 * 60 * 1000 : 0;
  const writeState = (value) => {
    try {
      if (value) localStorage.setItem(STORE_KEY, value);
      else localStorage.removeItem(STORE_KEY);
    } catch (e) {
    }
  };
  // Where the hide lapses, a stored dismissal counts only with an expiry ahead
  // of now by at most one TTL: a bare `hidden` from before the expiry existed,
  // a lapsed one, and one written under a skewed clock are all dropped.
  const hiddenIsLive = (expires) => {
    if (!HIDE_TTL_MS) return true;
    if (!expires) return false;
    const left = Number(expires) - Date.now();
    return left > 0 && left <= HIDE_TTL_MS;
  };
  // Stored as `mini`, `hidden` (permanent) or `hidden:<epoch ms>` (lapses then).
  const readState = () => {
    let raw;
    try {
      raw = localStorage.getItem(STORE_KEY) || "";
    } catch (e) {
      return "";
    }
    if (raw === "mini") return raw;
    const m = /^hidden(?::(\d+))?$/.exec(raw);
    if (!m) return "";
    if (HIDEABLE && hiddenIsLive(m[1])) return "hidden";
    writeState("");
    return "";
  };
  const hideValue = () =>
    HIDE_TTL_MS ? "hidden:" + (Date.now() + HIDE_TTL_MS) : "hidden";

  const saved = readState();
  if (saved === "hidden") return;
  const startMinimized = variant === "owner-private" && saved === "mini";

  const overview = (query) =>
    `https://${APP_HOST}/projects/${SITE_ID}/overview?${query}`;
  const hudLink = (query, action) =>
    overview(query + "&from_hud=private" + (HUD_VARIANT ? "," + HUD_VARIANT : "") + "&hud_action=" + action);
  const promptLink = (id) => hudLink("promptTemplate=" + encodeURIComponent(id), "ar_task");

  /* ————— Shared bits ————— */
  const LOGO = (
    s
  ) => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path fill="#fff" d="M17.9922 18.3225H14.005L13.6746 17.9921V14.005L14.005 13.6746H17.9922L18.3226 14.005V17.9921L17.9922 18.3225Z"/>
    <g fill="#05BDBA">
      <path d="M9.6958 24.3311H9.35705L7.6661 22.6401V22.3041L10.2511 19.7164L12.042 19.7191L12.2808 19.9552V21.7461L9.6958 24.3311Z"/>
      <path d="M7.6661 9.69576V9.35701L9.35705 7.66606H9.6958L12.2808 10.2511V12.0392L12.042 12.2808H10.2511L7.6661 9.69576Z"/>
      <path d="M10.0457 17.4369H0.205466L0 17.2314V14.7658L0.205466 14.5603H10.0457L10.2511 14.7658V17.2314L10.0457 17.4369Z"/>
      <path d="M31.7945 17.4369H21.9544L21.7489 17.2314V14.7658L21.9544 14.5603H31.7945L32 14.7658V17.2314L31.7945 17.4369Z"/>
      <path d="M14.5631 10.0456V2.66547L14.7686 2.46001H17.2343L17.4396 2.66547V10.0456L17.2343 10.2511H14.7686L14.5631 10.0456Z"/>
      <path d="M14.5631 29.3316V21.9515L14.7686 21.746H17.2343L17.4396 21.9515V29.3316L17.2343 29.5371H14.7686L14.5631 29.3316Z"/>
    </g></svg>`;
  const AI_SVG = (s) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.68 9.925 4.607 8.85l-.013-.379 1.1-1.1.38.012 1.075 1.075.012.379-1.1 1.1zM9.96 9.925 8.886 8.85l-.013-.379 1.1-1.1.38.012 1.075 1.075.012.379-1.1 1.1z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M9.005 2.52v1.296h2.657a3.19 3.19 0 0 1 3.191 3.192v3.356a3.19 3.19 0 0 1-3.191 3.191H4.338a3.19 3.19 0 0 1-3.191-3.19V7.007a3.19 3.19 0 0 1 3.191-3.192h2.836V2.52l.229-.245h1.373zM4.338 5.316c-.934 0-1.691.758-1.691 1.692v3.356c0 .934.758 1.691 1.691 1.691h7.324c.933 0 1.69-.757 1.691-1.69V7.007c0-.934-.757-1.692-1.691-1.692z"/></svg>`;
  const SHARE_SVG = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5636 8C6.94548 8.31953 6.24382 8.5 5.5 8.5C4.75618 8.5 4.05452 8.31953 3.4364 8H1.5L0.5 9V13L1.5 14H9.5L10.5 13V9L9.5 8H7.5636ZM8.87868 9.5H7.90075C7.16414 9.82186 6.35125 10 5.5 10C4.64875 10 3.83586 9.82186 3.09925 9.5H2.12132L2 9.62132V12.3787L2.12132 12.5H8.87868L9 12.3787V9.62132L8.87868 9.5Z"/><path d="M13.9999 10.1213V11.8463L12.2043 11.8481L12.0039 12.0357V13.1606L12.2043 13.3481H13.7955L13.7975 13.3463H14.7024L15.4999 12.5V9.5L14.5001 8.5001L12.2043 8.49976L12.0039 8.68726V9.81225L12.2043 9.99976L13.8786 10L13.9999 10.1213Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 7C6.88071 7 8 5.88071 8 4.5C8 3.11929 6.88071 2 5.5 2C4.11929 2 3 3.11929 3 4.5C3 5.88071 4.11929 7 5.5 7ZM5.5 5.5C6.05228 5.5 6.5 5.05228 6.5 4.5C6.5 3.94772 6.05228 3.5 5.5 3.5C4.94772 3.5 4.5 3.94772 4.5 4.5C4.5 5.05228 4.94772 5.5 5.5 5.5Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.7 5.1C13.7 6.25937 12.7594 7.2 11.6 7.2C10.4406 7.2 9.5 6.25937 9.5 5.1C9.5 3.94062 10.4406 3 11.6 3C12.7594 3 13.7 3.94062 13.7 5.1ZM11.6 5.7C11.9309 5.7 12.2 5.43095 12.2 5.1C12.2 4.76905 11.9309 4.5 11.6 4.5C11.2691 4.5 11 4.76905 11 5.1C11 5.43095 11.2691 5.7 11.6 5.7Z"/></svg>`;
  const TOOLS_SVG = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.98407 9.625L8.58935 11.0952C8.62792 11.1889 8.71922 11.25 8.82053 11.25H9.77587C9.88268 11.25 9.95527 11.1415 9.91454 11.0428L7.3828 4.90468C7.3442 4.81107 7.25294 4.75 7.15169 4.75H6.34295C6.24163 4.75 6.15033 4.81115 6.11177 4.90484L3.58524 11.0429C3.54461 11.1416 3.61719 11.25 3.72395 11.25H4.67399C4.7753 11.25 4.86659 11.1889 4.90516 11.0952L5.51045 9.625H7.98407ZM7.46943 8.375L6.74726 6.62092L6.02508 8.375H7.46943Z"/><path d="M10.75 11.25C10.6119 11.25 10.5 11.1381 10.5 11V5C10.5 4.86193 10.6119 4.75 10.75 4.75H11.5C11.6381 4.75 11.75 4.86193 11.75 5V11C11.75 11.1381 11.6381 11.25 11.5 11.25H10.75Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 5.5C0 2.73858 2.23858 0.5 5 0.5H11C13.7614 0.5 16 2.73858 16 5.5V10.5C16 13.2614 13.7614 15.5 11 15.5H5C2.23858 15.5 0 13.2614 0 10.5V5.5ZM5 1.75H11C13.0711 1.75 14.75 3.42893 14.75 5.5V10.5C14.75 12.5711 13.0711 14.25 11 14.25H5C2.92893 14.25 1.25 12.5711 1.25 10.5V5.5C1.25 3.42893 2.92893 1.75 5 1.75Z"/></svg>`;
  const LOCK_SVG = `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M8 1.5A3.5 3.5 0 0 0 4.5 5v2H4A1.5 1.5 0 0 0 2.5 8.5v4A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 12 7h-.5V5A3.5 3.5 0 0 0 8 1.5zm2 5.5V5a2 2 0 1 0-4 0v2h4z"/></svg>`;
  const LAUNCH_SVG = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.072 6C10.8557 5.99995 10.6443 5.93576 10.4644 5.81554C10.2846 5.69533 10.1444 5.52449 10.0617 5.32463C9.97895 5.12477 9.95733 4.90486 9.99956 4.69271C10.0418 4.48056 10.146 4.2857 10.299 4.13276C10.4519 3.97982 10.6468 3.87568 10.859 3.8335C11.0711 3.79132 11.291 3.81299 11.4909 3.89578C11.6907 3.97857 11.8615 4.11876 11.9817 4.29862C12.1019 4.47848 12.166 4.68994 12.166 4.90625C12.1658 5.19633 12.0505 5.47447 11.8454 5.67956C11.6402 5.88464 11.3621 5.9999 11.072 6Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3.59279 4.5H6.77473L8.48034 2.74577L10.1619 1L14.4308 1.00686L15 1.59031V6.01763L11.5291 9.61732L11.78 12.4852L11.1608 13.7165L8.58695 15.2986L7.59043 14.7959L7.31674 11.6676L4.624 8.875H1.65598L1.06836 7.92609L2.42011 5.22418L3.59279 4.5ZM8.7673 11.037L8.96573 13.305L10.0122 12.6618L10.2486 12.1917L10.1476 11.037L8.7673 11.037ZM8.43037 10.6616L12.036 6.93056L13.5 5.41225V2.50537L10.7987 2.50103L10.0283 3.30089L5.69627 7.82603L8.43037 10.6616ZM5.27424 7.38834L5.35943 6H4.01862L3.57089 6.27649L3.02131 7.375H5.26138L5.27424 7.38834Z"/><path d="M2.05008 10.9935L3.79156 9.6874L4.81429 10.7954L3.17932 12.0216L2.95615 13.1374L4.07201 12.9143L5.28155 11.3016L6.31603 12.4222L5.10008 14.0435L4.64717 14.3289L2.14717 14.8289L1.26465 13.9464L1.76465 11.4464L2.05008 10.9935Z"/></svg>`;

  const CHEVRON_SVG = (dir) => {
    const paths =
      dir === "left"
        ? "M12 4.5 8.5 8 12 11.5M7.5 4.5 4 8 7.5 11.5"
        : "M4 4.5 7.5 8 4 11.5M8.5 4.5 12 8 8.5 11.5";
    return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths}"/></svg>`;
  };

  const CLOSE_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5"/></svg>`;

  const ARROW_UP_SVG = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12.75v-9.5M3.9 7.35 8 3.25l4.1 4.1"/></svg>`;

  const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

  const PAD = { t: 8, r: 18, b: 18, l: 8 };
  const INSET = PAD.l + PAD.r;

  const VW = "var(--nl-vw,100vw)";
  const VH = "var(--nl-vh,100vh)";

  const NARROW = 600;

  const rootClass = (extra) => {
    const c = [];
    if (window.innerWidth < NARROW) c.push("nl-narrow");
    if (extra) c.push(extra);
    return c.length ? ` class="${c.join(" ")}"` : "";
  };

  const BASE_CSS = `
    :root{--nl-vw:${window.innerWidth}px;--nl-vh:${window.innerHeight}px}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:transparent;overflow:hidden}
    body{display:flex;align-items:flex-end;justify-content:flex-end;height:100vh;
      padding:${PAD.t}px ${PAD.r}px ${PAD.b}px ${PAD.l}px;
      font-family:${FONT};font-size:14px;line-height:1.5;color:#f4f9f9;-webkit-font-smoothing:antialiased}
    .nl-wrap{display:flex;flex-direction:column;align-items:flex-end;gap:10px;width:max-content;max-width:calc(${VW} - ${INSET}px)}
    button{font-family:inherit;cursor:pointer}
    :focus-visible{outline:2px solid #32e6e2;outline-offset:2px;border-radius:6px}
    .nl-icon-btn{position:relative;flex:none;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid transparent;background:transparent;color:#d5e3e6;transition:background .15s ease,color .15s ease}
    .nl-icon-btn:hover{background:rgba(255,255,255,0.08);color:#f4f9f9}
    .nl-tap::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:max(100%,44px);height:max(100%,44px)}
    @keyframes nl-rise{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition:none!important}}
  `;

  const MEASURE_JS = `
    function nlSend(){
      var wrap=document.querySelector('.nl-wrap'),boxes=[];
      for(var i=0;i<wrap.children.length;i++){
        var c=wrap.children[i];
        if(!c.offsetWidth||!c.offsetHeight)continue;
        boxes.push({x:c.offsetLeft-wrap.offsetLeft+${PAD.l},
                    y:c.offsetTop-wrap.offsetTop+${PAD.t},
                    w:c.offsetWidth,h:c.offsetHeight});
      }
      parent.postMessage({nlHud:'resize',
        width:wrap.offsetWidth+${INSET},
        height:wrap.offsetHeight+${PAD.t + PAD.b},
        boxes:boxes},'*');
    }
    function nlSendSoon(){requestAnimationFrame(nlSend);}
    window.addEventListener('load',nlSend);
    window.addEventListener('message',function(e){
      if(e.source!==parent||!e.data||e.data.nlHud!=='viewport')return;
      var s=document.documentElement.style;
      s.setProperty('--nl-vw',e.data.w+'px');
      s.setProperty('--nl-vh',e.data.h+'px');
      document.documentElement.classList.toggle('nl-narrow',e.data.w<${NARROW});
      nlSendSoon();
    });
    var nlCoarse=window.matchMedia('(pointer: coarse)').matches;
    function nlSubmit(form){
      if(form.requestSubmit)return form.requestSubmit();
      if(form.checkValidity&&!form.checkValidity())
        return form.reportValidity&&form.reportValidity();
      form.submit();
    }
  `;

  /* ————— Public badge (+ "build your own" popover) ————— */
  function publicDoc() {
    return `<!doctype html><html${rootClass()}><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><style>${BASE_CSS}
      .nl-card{position:relative;display:none;width:min(340px,calc(${VW} - ${INSET}px));max-height:calc(${VH} - 84px);overflow-y:auto;background:linear-gradient(180deg,#132832 0%,#0e1e25 100%);border:1px solid rgba(255,255,255,0.09);border-radius:18px;padding:18px;transform-origin:bottom right;animation:nl-rise .3s cubic-bezier(.34,1.4,.4,1) both}
      .nl-card.open{display:block}
      .nl-card-close{position:absolute;top:10px;right:10px}
      .nl-card h2{margin:0;padding-right:30px;font-size:16px;font-weight:750;letter-spacing:-0.015em;line-height:1.35}
      .nl-card h2 em{font-style:normal;background:linear-gradient(90deg,#32e6e2,#4d7cfe,#9a6bff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}
      .nl-card p{margin:8px 0 0;font-size:12.5px;color:#d5e3e6}
      .nl-prompt{position:relative;margin-top:14px;background:#10222b;border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:10px 12px;transition:border-color .15s ease,box-shadow .15s ease}
      .nl-prompt:focus-within{border-color:#05bdba;box-shadow:0 0 0 3px rgba(5,189,186,0.18)}
      .nl-prompt textarea{display:block;width:100%;height:38px;resize:none;border:0;outline:none;background:transparent;color:#f4f9f9;font:inherit;font-size:13px;line-height:19px;padding:0 28px 0 0}
      .nl-prompt textarea::placeholder{color:#a9bdc2}
      .nl-send{position:absolute;right:9px;bottom:9px;width:24px;height:24px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:#05bdba;color:#02191b;transition:background .15s ease}
      .nl-send:hover{background:#32e6e2}
      @media (pointer: coarse){
        .nl-prompt textarea{font-size:16px;line-height:21px;height:42px}
      }
      .nl-or{display:flex;align-items:center;gap:10px;margin:12px 0;font-size:10.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a9bdc2}
      .nl-or::before,.nl-or::after{content:"";flex:1;height:1px;background:rgba(255,255,255,0.09)}
      .nl-drop{display:flex;align-items:center;justify-content:space-between;gap:6px;text-decoration:none;background:#1b3a45;border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;color:#cfe0e3;transition:background .15s ease,color .15s ease,border-color .15s ease}
      .nl-drop:hover{background:#224753;color:#f4f9f9;border-color:rgba(50,230,226,0.3)}
      .nl-drop .nl-arrow{transition:transform .18s cubic-bezier(.34,1.4,.4,1)}
      .nl-drop:hover .nl-arrow{transform:translateX(3px)}
      .nl-badge{display:flex;align-items:center;gap:9px;white-space:nowrap;border:1px solid rgba(255,255,255,0.09);background:linear-gradient(180deg,#142b34,#0e1e25);color:#f4f9f9;border-radius:999px;padding:9px 14px 9px 11px;font-size:13px;font-weight:600;letter-spacing:0.01em;transition:border-color .2s ease}
      .nl-badge:hover{border-color:rgba(50,230,226,0.26)}
      .nl-hide{display:block;width:100%;margin-top:10px;border:0;background:transparent;color:#a9bdc2;font-size:11.5px;font-weight:600;padding:4px;border-radius:8px;transition:color .15s ease}
      .nl-hide:hover{color:#d5e3e6;text-decoration:underline}
      .nl-badge-label{color:#d5e3e6;font-weight:500}
      .nl-badge-brand{font-weight:750}
    </style></head><body>
      <div class="nl-wrap">
        <section class="nl-card" id="nl-card" aria-label="Build your own site on Netlify">
          <button type="button" class="nl-icon-btn nl-tap nl-card-close" id="nl-card-close" aria-label="Close">${CLOSE_SVG}</button>
          <h2><em>Build your own site with Netlify</em></h2>
          <p>Describe what you want, and an AI agent designs, builds and deploys it in minutes.</p>
          <form class="nl-prompt" action="https://${APP_HOST}/start" method="get" target="_blank" rel="noopener">
            <textarea name="prompt" rows="2" required maxlength="300" autocomplete="off"
                      enterkeyhint="go"
                      placeholder="A shop for my handmade surfboards&hellip;"
                      aria-label="Describe the site you want to build"></textarea>
            <button type="submit" class="nl-send nl-tap" aria-label="Build this site">${ARROW_UP_SVG}</button>
            <input type="hidden" name="utm_source" value="${UTM_SOURCE}">
            <input type="hidden" name="utm_campaign" value="loops">
            <input type="hidden" name="utm_medium" value="owned">
            <input type="hidden" name="utm_content" value="prompt">
            ${SITE_ID ? `<input type="hidden" name="utm_id" value="${SITE_ID}">` : ""}
            ${HUD_VARIANT ? `<input type="hidden" name="hud_variant" value="${HUD_VARIANT}">` : ""}
          </form>
          <div class="nl-or"><span>or</span></div>
          <a class="nl-drop" href="https://${APP_HOST}/drop?utm_source=${UTM_SOURCE}&utm_campaign=loops&utm_medium=owned&utm_content=drop${SITE_ID ? "&utm_id=" + SITE_ID : ""}${HUD_VARIANT ? "&hud_variant=" + HUD_VARIANT : ""}" target="_blank" rel="noopener">
            <span>Drop a site you already have</span><span class="nl-arrow" aria-hidden="true">&rarr;</span>
          </a>
          ${HIDEABLE ? `<button type="button" class="nl-hide" id="nl-hide">Hide this badge</button>` : ""}
        </section>
        <button type="button" class="nl-badge" id="nl-badge" aria-expanded="false" aria-controls="nl-card"
                aria-label="Powered by Netlify — build your own site">
          ${LOGO(18)}
          <span><span class="nl-badge-label">Powered by</span> <span class="nl-badge-brand">Netlify</span></span>
        </button>
      </div>
      <script>
        ${MEASURE_JS}
        var badge=document.getElementById('nl-badge'),card=document.getElementById('nl-card'),
            box=card.querySelector('textarea');
        function setOpen(open){
          card.classList.toggle('open',open);
          badge.setAttribute('aria-expanded',open?'true':'false');
          nlSendSoon();
          if(open&&!nlCoarse)box.focus();
        }
        box.addEventListener('keydown',function(e){
          if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();nlSubmit(box.form);}
        });
        badge.addEventListener('click',function(){setOpen(!card.classList.contains('open'));});
        document.getElementById('nl-card-close').addEventListener('click',function(){setOpen(false);badge.focus();});
        document.addEventListener('keydown',function(e){
          if(e.key==='Escape'&&card.classList.contains('open')){setOpen(false);badge.focus();}
        });
        card.addEventListener('click',function(e){
          if(e.target.closest('#nl-hide'))parent.postMessage({nlHud:'state',value:'hidden'},'*');
        });
      <\/script>
    </body></html>`;
  }

  /* ————— Owner-private HUD ————— */
  function ownerPrivateDoc() {
    const task = (title, desc, templateId) => `
      <div class="nl-task">
        <div class="nl-task-meta"><div class="nl-task-title">${title}</div><div class="nl-task-desc">${desc}</div></div>
        <a class="nl-task-run" href="${promptLink(
          templateId
        )}" target="_blank" rel="noopener">${AI_SVG(12)} Run</a>
      </div>`;

    return `<!doctype html><html${rootClass(
      startMinimized ? "nl-mini-state" : ""
    )}><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><style>${BASE_CSS}
      .nl-popover{display:none;width:min(320px,calc(${VW} - ${INSET}px));max-height:calc(${VH} - 90px);overflow-y:auto;background:linear-gradient(180deg,#132832 0%,#0e1e25 100%);border:1px solid rgba(255,255,255,0.09);border-radius:18px;transform-origin:bottom right;animation:nl-rise .28s cubic-bezier(.34,1.4,.4,1) both}
      .nl-popover.open{display:block}
      .nl-popover-head{display:flex;align-items:center;gap:9px;padding:13px 12px 5px 16px}
      .nl-popover-icon{display:inline-flex;color:#32e6e2}
      .nl-popover-title{flex:1;font-size:13.5px;font-weight:700;letter-spacing:-0.01em;color:#f4f9f9}
      .nl-popover-body{padding:0 16px 12px}
      .nl-task{display:flex;align-items:center;gap:10px;padding:11px 0}
      .nl-task+.nl-task{border-top:1px solid rgba(255,255,255,0.06)}
      .nl-task-meta{flex:1;min-width:0}
      .nl-task-title{font-size:13.5px;font-weight:650;color:#f4f9f9}
      .nl-task-desc{font-size:11.5px;color:#a9bdc2}
      .nl-task-run{flex:none;display:inline-flex;align-items:center;gap:6px;text-decoration:none;border:1px solid rgba(50,230,226,0.35);background:transparent;color:#32e6e2;font-size:12px;font-weight:700;border-radius:999px;padding:6px 13px;transition:background .15s ease,transform .15s cubic-bezier(.34,1.4,.4,1)}
      .nl-task-run:hover{background:rgba(5,189,186,0.12);transform:translateY(-1px)}
      .nl-bar,.nl-mini{-webkit-user-select:none;user-select:none}
      .nl-bar{display:flex;align-items:center;gap:2px;white-space:nowrap;border:1px solid rgba(255,255,255,0.09);background:linear-gradient(180deg,#142b34,#0e1e25);border-radius:999px;padding:7px 8px 7px 14px;color:#f4f9f9}
      .nl-logo{flex:none;margin-right:8px;display:inline-flex}
      .nl-status{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;font-family:inherit;font-size:12.5px;font-weight:700;letter-spacing:0.01em;color:#fbbf24;padding:6px 5px;border-radius:8px;transition:background .15s ease}
      .nl-status:hover,.nl-status[aria-expanded='true']{background:rgba(251,191,36,0.12)}
      .nl-tip{display:none;align-self:flex-start;width:min(300px,calc(${VW} - ${INSET}px));background:linear-gradient(180deg,#132832 0%,#0e1e25 100%);border:1px solid rgba(255,255,255,0.09);border-radius:14px;padding:12px 14px;font-size:12px;line-height:1.5;color:#d5e3e6;animation:nl-rise .2s cubic-bezier(.34,1.4,.4,1) both}
      .nl-tip.open{display:block}
      .nl-tip a{display:flex;width:fit-content;align-items:center;gap:4px;margin-top:8px;color:#32e6e2;text-decoration:none;font-weight:650}
      .nl-tip a:hover{text-decoration:underline}
      .nl-sep{width:1px;height:18px;background:rgba(255,255,255,0.09);margin:0 10px 0 12px;flex:none}
      .nl-btn{display:inline-flex;align-items:center;gap:7px;text-decoration:none;border:0;background:transparent;color:#d5e3e6;font-family:inherit;font-size:13px;font-weight:600;padding:8px 12px;border-radius:999px;transition:background .15s ease,color .15s ease}
      .nl-btn svg{color:#32e6e2}
      .nl-btn:hover{background:rgba(255,255,255,0.07);color:#f4f9f9}
      .nl-btn[aria-expanded='true']{background:rgba(255,255,255,0.1);color:#f4f9f9}
      .nl-publish{display:inline-flex;align-items:center;gap:7px;text-decoration:none;margin-left:6px;background:#05bdba;color:#02191b;font-size:13px;font-weight:700;padding:8px 15px;border-radius:999px;transition:background .15s ease,transform .15s cubic-bezier(.34,1.4,.4,1)}
      .nl-publish:hover{background:#32e6e2;transform:translateY(-1px)}
      .nl-min{margin-left:6px}

      /* ——— Minimized ——— */
      .nl-bar,.nl-mini{min-height:52px}
      .nl-mini{display:none;align-items:center;gap:2px;border:1px solid rgba(255,255,255,0.09);background:linear-gradient(180deg,#142b34,#0e1e25);border-radius:999px;padding:5px 5px 5px 13px;cursor:pointer}
      .nl-mini-state .nl-mini{display:flex}
      .nl-mini-state .nl-bar,.nl-mini-state .nl-popover,.nl-mini-state .nl-tip{display:none}
      .nl-mini-brand{display:inline-flex;align-items:center;gap:7px;padding-right:8px}
      .nl-mini-lock{display:inline-flex;color:#fbbf24}

      /* ——— Narrow layout ——— */
      .nl-narrow .nl-shrinks{position:absolute;width:1px;height:1px;overflow:hidden;
        clip-path:inset(50%);white-space:nowrap}
      .nl-narrow .nl-status{gap:0}
      .nl-narrow .nl-bar{padding:6px 6px 6px 10px}
      .nl-narrow .nl-logo{margin-right:6px}
      .nl-narrow .nl-sep{margin:0 6px 0 8px}
      .nl-narrow .nl-btn{padding:8px 9px}
      .nl-narrow .nl-publish{margin-left:4px;padding:8px 11px}
    </style></head><body>
      <div class="nl-wrap">
        <section class="nl-popover" id="nl-pop" aria-label="Pre-launch tools">
          <div class="nl-popover-head">
            <span class="nl-popover-icon">${TOOLS_SVG}</span>
            <span class="nl-popover-title">Pre-launch tools</span>
            <button type="button" class="nl-icon-btn nl-tap" id="nl-pop-close" aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <div class="nl-popover-body">
            ${task(
              "SEO / GEO audit",
              "Check that Google and AI assistants can find and read your site.",
              "d7bd9353-a6a3-442d-86f0-9b15488f68c3"
            )}
            ${task(
              "Performance check",
              "See how fast your pages load, and what is slowing them down.",
              "f8ef80a5-be9b-494d-9fac-a4ac5d5689a4"
            )}
            ${task(
              "Security audit",
              "Look for common weak spots, like out-of-date code or open settings.",
              "5f50f746-2ba1-4a3d-8a47-1a515f4420eb"
            )}
          </div>
        </section>
        <div class="nl-mini" id="nl-mini">
          <span class="nl-mini-brand">${LOGO(
            18
          )}<span class="nl-mini-lock">${LOCK_SVG}</span></span>
          <button type="button" class="nl-icon-btn nl-tap nl-mini-open" id="nl-mini-open"
                  aria-label="Show Netlify site tools">${CHEVRON_SVG(
                    "left"
                  )}</button>
          <button type="button" class="nl-icon-btn nl-tap nl-mini-hide" id="nl-mini-hide"
                  aria-label="Hide Netlify tools on this site">${CLOSE_SVG}</button>
        </div>
        <section class="nl-tip" id="nl-tip" aria-label="Project visibility">
          This project is private - only your team and people you invite can view it.
          <a href="https://docs.netlify.com/manage/security/secure-access-to-sites/project-visibility/"
             target="_blank" rel="noopener">Learn more <span aria-hidden="true">&#8599;</span></a>
        </section>
        <div class="nl-bar" role="toolbar" aria-label="Netlify site tools">
          <span class="nl-logo">${LOGO(20)}</span>
          <button type="button" class="nl-status" id="nl-status"
                  aria-expanded="false" aria-controls="nl-tip">${LOCK_SVG}<span class="nl-shrinks">Private</span></button>
          <span class="nl-sep" aria-hidden="true"></span>
          <a class="nl-btn" href="${hudLink(
            "modal=share", "share"
          )}" target="_blank" rel="noopener">${SHARE_SVG}
            <span class="nl-shrinks">Share</span></a>
          <button type="button" class="nl-btn" id="nl-tools" aria-expanded="false" aria-controls="nl-pop">${TOOLS_SVG}
            <span class="nl-shrinks">Pre-launch tools</span></button>
          <a class="nl-publish" href="${hudLink(
            "modal=go-live", "make_public"
          )}" target="_blank" rel="noopener">${LAUNCH_SVG} Make public</a>
          <button type="button" class="nl-icon-btn nl-tap nl-min" id="nl-min"
                  aria-label="Minimize Netlify tools">${CHEVRON_SVG(
                    "right"
                  )}</button>
        </div>
      </div>
      <script>
        ${MEASURE_JS}
        var btn=document.getElementById('nl-tools'),pop=document.getElementById('nl-pop');
        function setOpen(open){
          pop.classList.toggle('open',open);
          btn.setAttribute('aria-expanded',open?'true':'false');
          nlSendSoon();
        }
        btn.addEventListener('click',function(){setOpen(!pop.classList.contains('open'));});
        document.getElementById('nl-pop-close').addEventListener('click',function(){setOpen(false);btn.focus();});

        var statusBtn=document.getElementById('nl-status'),tip=document.getElementById('nl-tip'),tipTimer=null;
        function setTip(open){
          tip.classList.toggle('open',open);
          statusBtn.setAttribute('aria-expanded',open?'true':'false');
          nlSendSoon();
        }
        function openTip(){clearTimeout(tipTimer);setTip(true);}
        function closeTipSoon(){clearTimeout(tipTimer);tipTimer=setTimeout(function(){setTip(false);},200);}
        if(!nlCoarse){
          statusBtn.addEventListener('mouseenter',openTip);
          statusBtn.addEventListener('mouseleave',closeTipSoon);
          tip.addEventListener('mouseenter',openTip);
          tip.addEventListener('mouseleave',closeTipSoon);
        }
        statusBtn.addEventListener('focus',function(){
          var keyboard;
          try{keyboard=statusBtn.matches(':focus-visible');}catch(e){keyboard=!nlCoarse;}
          if(keyboard)openTip();
        });
        statusBtn.addEventListener('blur',closeTipSoon);
        statusBtn.addEventListener('click',function(){
          clearTimeout(tipTimer);
          setTip(nlCoarse ? !tip.classList.contains('open') : true);
        });

        var root=document.documentElement;
        function setStage(value){
          root.classList.toggle('nl-mini-state',value==='mini');
          if(value==='mini'){setOpen(false);setTip(false);}
          parent.postMessage({nlHud:'state',value:value},'*');
          nlSendSoon();
        }
        document.getElementById('nl-min').addEventListener('click',function(){
          setStage('mini');
          document.getElementById('nl-mini-open').focus();
        });
        document.getElementById('nl-mini').addEventListener('click',function(e){
          if(e.target.closest('#nl-mini-hide'))return;
          setStage('');
          document.getElementById('nl-min').focus();
        });
        document.getElementById('nl-mini-hide').addEventListener('click',function(){
          parent.postMessage({nlHud:'state',value:'hidden'},'*');
        });
        document.addEventListener('keydown',function(e){
          if(e.key!=='Escape')return;
          if(tip.classList.contains('open')){setTip(false);statusBtn.focus();return;}
          if(pop.classList.contains('open')){setOpen(false);btn.focus();}
        });
      <\/script>
    </body></html>`;
  }

  /* ————— Mount ————— */
  const frame = document.createElement("iframe");

  const base =
    "position:fixed;bottom:0;right:0;border:0;margin:0;padding:0;background:transparent;color-scheme:dark;z-index:2147483645;";

  const CLOSED = 'path("M0 0Z")';

  if (variant === "public") {
    frame.id = "nl-badge-frame";
    frame.setAttribute("title", "Powered by Netlify");
    frame.style.cssText = base + "width:216px;height:92px;clip-path:" + CLOSED;
    frame.srcdoc = publicDoc();
  } else {
    frame.id = "nl-hud-frame";
    frame.setAttribute("title", "Netlify");
    frame.style.cssText = base + "width:652px;height:94px;clip-path:" + CLOSED;
    frame.srcdoc = ownerPrivateDoc();
  }

  const BLEED = 5;

  function clipFor(boxes, w, h, dx, dy) {
    if (!Array.isArray(boxes) || !boxes.length) return CLOSED;
    return (
      'path("' +
      boxes
        .map((o) => {
          const x = o.x + dx,
            y = o.y + dy;
          const l = Math.max(0, x - BLEED),
            r = Math.min(w, x + o.w + BLEED);
          const t = Math.max(0, y - BLEED),
            b = Math.min(h, y + o.h + BLEED);
          return `M${l} ${t}H${r}V${b}H${l}Z`;
        })
        .join("") +
      '")'
    );
  }

  const onMessage = (e) => {
    if (e.source !== frame.contentWindow || !e.data) return;

    if (e.data.nlHud === "state") {
      const value =
        e.data.value === "mini" || e.data.value === "hidden"
          ? e.data.value
          : "";
      writeState(value === "hidden" ? hideValue() : value);
      if (value === "hidden") teardown();
      return;
    }

    if (e.data.nlHud !== "resize") return;
    const wantW = Math.max(Number(e.data.width) || 0, 1);
    const wantH = Math.max(Number(e.data.height) || 0, 1);
    const w = Math.min(
      wantW,
      document.documentElement.clientWidth || window.innerWidth
    );
    const h = Math.min(wantH, window.innerHeight);
    frame.style.width = w + "px";
    frame.style.height = h + "px";
    frame.style.clipPath = clipFor(e.data.boxes, w, h, w - wantW, h - wantH);
    if (!frame.dataset.nlReady) frame.dataset.nlReady = "1";
  };
  window.addEventListener("message", onMessage);

  const sendViewport = () => {
    if (frame.contentWindow) {
      frame.contentWindow.postMessage(
        { nlHud: "viewport", w: window.innerWidth, h: window.innerHeight },
        "*"
      );
    }
  };
  let queued = false;
  const onViewportChange = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sendViewport();
    });
  };
  frame.addEventListener("load", sendViewport);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("orientationchange", onViewportChange);

  function teardown() {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("resize", onViewportChange);
    window.removeEventListener("orientationchange", onViewportChange);
    frame.remove();
  }

  const mount = () => document.body.appendChild(frame);
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
