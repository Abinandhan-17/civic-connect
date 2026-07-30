/* ==========================================================================
   CIVIC CONNECT — Shared UI utilities (theme, language, nav, auth guard)
   ========================================================================== */

/* ---------------------------- THEME ---------------------------- */
function initTheme(){
  const saved = localStorage.getItem('cc_theme') || 'dark';
  document.body.classList.toggle('light', saved === 'light');
  document.querySelectorAll('.theme-toggle .knob i').forEach(i=>{
    i.className = saved === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}
function toggleTheme(){
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('cc_theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('.theme-toggle .knob i').forEach(i=>{
    i.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}

/* ---------------------------- LANGUAGE (EN / TA) ---------------------------- */
const I18N = {
  en:{
    nav_home:'Home', nav_dashboard:'Dashboard', nav_report:'Report Issue', nav_track:'Track Complaint',
    nav_map:'Live Map', nav_analytics:'Analytics', nav_admin:'Admin Panel', nav_login:'Login', nav_logout:'Logout',
    hero_badge:'Smart City · Public Grievance Platform',
    hero_title:'Report it once. We route it right.',
    hero_lead:'Civic Connect gets road damage, garbage overflow, water leaks and more in front of the correct municipal department in minutes — not weeks.',
    hero_cta_report:'Report an Issue', hero_cta_track:'Track a Complaint',
    stat_total:'Total Complaints', stat_pending:'Pending Issues', stat_progress:'In Progress', stat_resolved:'Resolved Issues',
    section_categories:'What can you report?',
    recent_complaints:'Recent Complaints', notifications:'Notifications', your_profile:'Your Profile',
    btn_submit:'Submit Complaint', btn_view:'View Details'
  },
  ta:{
    nav_home:'முகப்பு', nav_dashboard:'டாஷ்போர்டு', nav_report:'புகார் அளிக்க', nav_track:'புகார் நிலவரம்',
    nav_map:'நேரடி வரைபடம்', nav_analytics:'பகுப்பாய்வு', nav_admin:'நிர்வாக பலகம்', nav_login:'உள்நுழைய', nav_logout:'வெளியேறு',
    hero_badge:'ஸ்மார்ட் சிட்டி · பொது புகார் தளம்',
    hero_title:'ஒருமுறை புகார் செய்யுங்கள். சரியான துறைக்கு அனுப்புகிறோம்.',
    hero_lead:'சாலை சேதம், குப்பை பிரச்சனை, குடிநீர் கசிவு போன்றவற்றை நிமிடங்களில் சரியான நகராட்சி துறைக்கு அனுப்புகிறோம்.',
    hero_cta_report:'புகார் அளிக்க', hero_cta_track:'புகார் நிலவரம் பார்க்க',
    stat_total:'மொத்த புகார்கள்', stat_pending:'நிலுவையில்', stat_progress:'செயலில்', stat_resolved:'தீர்க்கப்பட்டவை',
    section_categories:'நீங்கள் என்ன புகார் செய்யலாம்?',
    recent_complaints:'சமீபத்திய புகார்கள்', notifications:'அறிவிப்புகள்', your_profile:'உங்கள் சுயவிவரம்',
    btn_submit:'புகார் சமர்ப்பிக்க', btn_view:'விவரம் பார்க்க'
  }
};
function initLang(){
  const saved = localStorage.getItem('cc_lang') || 'en';
  applyLang(saved);
}
function applyLang(lang){
  localStorage.setItem('cc_lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(I18N[lang] && I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  document.querySelectorAll('.lang-toggle span').forEach(s=>{
    s.classList.toggle('active', s.dataset.lang === lang);
  });
}

/* ---------------------------- MOBILE NAV ---------------------------- */
function initMobileNav(){
  const btn = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if(!btn || !links) return;
  btn.addEventListener('click', ()=> links.classList.toggle('open'));
}

/* ---------------------------- AUTH GUARD ---------------------------- */
function requireAuth(role){
  const user = UsersAPI.currentUser();
  if(!user || (role && user.role !== role)){
    window.location.href = role === 'admin' ? 'admin-login.html' : 'login.html';
    return null;
  }
  return user;
}
function logout(){
  UsersAPI.logout();
  window.location.href = 'index.html';
}

/* ---------------------------- NAV RENDER HELPERS ---------------------------- */
function paintUserBadge(){
  const user = UsersAPI.currentUser();
  const slot = document.getElementById('navUserSlot');
  if(!slot) return;
  if(user){
    const unread = NotifsAPI.unreadCount(user.id);
    slot.innerHTML = `
      <div class="icon-btn" style="position:relative" title="Notifications" onclick="location.href='${user.role==='admin'?'admin-dashboard.html':'dashboard.html'}#notifications'">
        <i class="fa-regular fa-bell"></i>
        ${unread>0 ? '<span class="notif-dot"></span>' : ''}
      </div>
      <div class="avatar" title="${user.name}">${user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
      <button class="btn btn-outline btn-sm" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
    `;
  } else {
    slot.innerHTML = `<a href="login.html" class="btn btn-outline btn-sm">Citizen Login</a><a href="admin-login.html" class="btn btn-primary btn-sm">Admin</a>`;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  initTheme(); initLang(); initMobileNav(); paintUserBadge();
  if(window.AOS) AOS.init({ duration:700, once:true, easing:'ease-out-cubic' });
});
