/* ==========================================================================
   CIVIC CONNECT — Mock Data Layer (localStorage)
   In production this is replaced by REST calls to the Node/Express + MySQL
   backend included in /backend. Function names mirror the real API so
   swapping fetch() calls in is a drop-in change (see api.js comment below).
   ========================================================================== */

const DB_KEYS = {
  USERS: 'cc_users',
  COMPLAINTS: 'cc_complaints',
  NOTIFS: 'cc_notifications',
  SESSION: 'cc_session',
  SEEDED: 'cc_seeded_v2'
};

const CATEGORIES = [
  { id:'road', label:'Road Damage', icon:'fa-road', dept:'Roads Department' },
  { id:'pothole', label:'Potholes', icon:'fa-triangle-exclamation', dept:'Roads Department' },
  { id:'garbage', label:'Garbage Overflow', icon:'fa-dumpster', dept:'Sanitation Department' },
  { id:'water', label:'Water Leakage', icon:'fa-faucet-drip', dept:'Water Supply' },
  { id:'drainage', label:'Drainage Problems', icon:'fa-water', dept:'Water Supply' },
  { id:'streetlight', label:'Broken Street Lights', icon:'fa-lightbulb', dept:'Electricity Board' },
  { id:'dumping', label:'Illegal Dumping', icon:'fa-trash', dept:'Municipal Corporation' },
  { id:'tree', label:'Tree Fallen', icon:'fa-tree', dept:'Municipal Corporation' },
  { id:'safety', label:'Public Safety Issues', icon:'fa-shield-halved', dept:'Police Department' }
];

const DEPARTMENTS = ['Roads Department','Sanitation Department','Water Supply','Electricity Board','Municipal Corporation','Police Department'];

const STATUS_FLOW = ['Pending','Verified','Assigned','In Progress','Resolved'];

function nowISO(){ return new Date().toISOString(); }
function uid(prefix='ID'){ return prefix + '-' + Math.random().toString(36).slice(2,8).toUpperCase(); }

function loadJSON(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
}
function saveJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/* ---------------------------- seeding ---------------------------- */
function seedIfNeeded(){
  if(loadJSON(DB_KEYS.SEEDED,false)) return;

  const users = [
    { id:'U-ADMIN', name:'Municipal Admin', email:'admin@civicconnect.gov', phone:'9000000000', password:'admin123', role:'admin', createdAt: nowISO() },
    { id:'U-DEMO', name:'Arun Kumar', email:'citizen@demo.com', phone:'9876543210', password:'demo1234', role:'citizen', area:'Gandhipuram, Coimbatore', createdAt: nowISO() }
  ];
  saveJSON(DB_KEYS.USERS, users);

  const sampleAreas = [
    { area:'Gandhipuram', lat:11.0183, lng:76.9725 },
    { area:'RS Puram', lat:11.0060, lng:76.9520 },
    { area:'Peelamedu', lat:11.0290, lng:77.0170 },
    { area:'Town Hall', lat:11.0016, lng:76.9670 },
    { area:'Saibaba Colony', lat:11.0230, lng:76.9370 }
  ];
  const statuses = ['Pending','Pending','Verified','Assigned','In Progress','Resolved','Resolved'];
  const complaints = [];
  for(let i=0;i<7;i++){
    const cat = CATEGORIES[i % CATEGORIES.length];
    const loc = sampleAreas[i % sampleAreas.length];
    const status = statuses[i % statuses.length];
    const created = new Date(Date.now() - (i+1)*36*3600*1000);
    complaints.push({
      id: uid('CC'),
      userId: 'U-DEMO',
      userName:'Arun Kumar',
      category: cat.id,
      categoryLabel: cat.label,
      title: `${cat.label} reported near ${loc.area}`,
      description: `Citizens have reported a recurring ${cat.label.toLowerCase()} issue near ${loc.area}. Needs attention from ${cat.dept}.`,
      severity: ['Low','Medium','High'][i % 3],
      status,
      department: cat.dept,
      area: loc.area,
      lat: loc.lat + (Math.random()-0.5)*0.01,
      lng: loc.lng + (Math.random()-0.5)*0.01,
      photo: null,
      completionPhoto: null,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
      remarks: [],
      rating: status==='Resolved' ? (3+ (i%3)) : null,
      feedback: status==='Resolved' ? 'Issue was resolved in reasonable time.' : null,
      history: [{ status:'Pending', at: created.toISOString() }]
    });
  }
  saveJSON(DB_KEYS.COMPLAINTS, complaints);

  const notifs = [
    { id: uid('N'), userId:'U-DEMO', text:'Welcome to Civic Connect! Your account was created successfully.', read:false, at: nowISO(), type:'info' }
  ];
  saveJSON(DB_KEYS.NOTIFS, notifs);
  saveJSON(DB_KEYS.SEEDED, true);
}
seedIfNeeded();

/* ---------------------------- users ---------------------------- */
const UsersAPI = {
  all(){ return loadJSON(DB_KEYS.USERS, []); },
  findByEmail(email){ return this.all().find(u => u.email.toLowerCase() === String(email).toLowerCase()); },
  findById(id){ return this.all().find(u => u.id === id); },
  register({name,email,phone,password,area}){
    const users = this.all();
    if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) throw new Error('An account with this email already exists.');
    const user = { id: uid('U'), name, email, phone, password, area: area||'', role:'citizen', createdAt: nowISO() };
    users.push(user); saveJSON(DB_KEYS.USERS, users);
    NotifsAPI.push(user.id, `Welcome ${name}! Your citizen account is ready.`, 'info');
    return user;
  },
  login(email, password, role){
    const user = this.findByEmail(email);
    if(!user || user.password !== password) throw new Error('Invalid email or password.');
    if(role && user.role !== role) throw new Error(`This account is not registered as ${role}.`);
    saveJSON(DB_KEYS.SESSION, { userId:user.id, role:user.role, at: nowISO() });
    return user;
  },
  resetPassword(email, newPassword){
    const users = this.all();
    const u = users.find(x=>x.email.toLowerCase()===email.toLowerCase());
    if(!u) throw new Error('No account found with that email.');
    u.password = newPassword; saveJSON(DB_KEYS.USERS, users);
    return true;
  },
  updateProfile(id, patch){
    const users = this.all();
    const u = users.find(x=>x.id===id);
    if(!u) throw new Error('User not found.');
    Object.assign(u, patch); saveJSON(DB_KEYS.USERS, users);
    return u;
  },
  session(){ return loadJSON(DB_KEYS.SESSION, null); },
  logout(){ localStorage.removeItem(DB_KEYS.SESSION); },
  currentUser(){
    const s = this.session();
    if(!s) return null;
    return this.findById(s.userId);
  }
};

/* ---------------------------- complaints ---------------------------- */
const ComplaintsAPI = {
  all(){ return loadJSON(DB_KEYS.COMPLAINTS, []); },
  save(list){ saveJSON(DB_KEYS.COMPLAINTS, list); },
  byUser(userId){ return this.all().filter(c=>c.userId===userId).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)); },
  byId(id){ return this.all().find(c=>c.id===id); },

  /* naive duplicate detector: same category within ~120m and 48 hours */
  findDuplicates({category, lat, lng}){
    const R = 6371000;
    const toRad = d => d*Math.PI/180;
    return this.all().filter(c=>{
      if(c.category !== category) return false;
      if(c.status === 'Resolved') return false;
      const dLat = toRad(lat-c.lat), dLng = toRad(lng-c.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat))*Math.cos(toRad(c.lat))*Math.sin(dLng/2)**2;
      const dist = R * 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const hoursOld = (Date.now()-new Date(c.createdAt))/36e5;
      return dist < 150 && hoursOld < 72;
    });
  },

  create(data){
    const cat = CATEGORIES.find(c=>c.id===data.category);
    const complaint = {
      id: uid('CC'),
      userId: data.userId,
      userName: data.userName,
      category: data.category,
      categoryLabel: cat ? cat.label : data.category,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'Pending',
      department: cat ? cat.dept : 'Municipal Corporation',
      area: data.area || 'Unspecified',
      lat: data.lat, lng: data.lng,
      photo: data.photo || null,
      completionPhoto:null,
      createdAt: nowISO(), updatedAt: nowISO(),
      remarks: [],
      rating:null, feedback:null,
      history:[{status:'Pending', at: nowISO()}]
    };
    const list = this.all(); list.unshift(complaint); this.save(list);
    NotifsAPI.push(data.userId, `Complaint ${complaint.id} submitted successfully. Our team will verify it shortly.`, 'success');
    return complaint;
  },

  updateStatus(id, status, opts={}){
    const list = this.all();
    const c = list.find(x=>x.id===id);
    if(!c) throw new Error('Complaint not found.');
    c.status = status; c.updatedAt = nowISO();
    c.history.push({status, at: nowISO()});
    if(opts.department) c.department = opts.department;
    if(opts.remark) c.remarks.push({ text:opts.remark, at: nowISO(), by:'Admin' });
    if(opts.completionPhoto) c.completionPhoto = opts.completionPhoto;
    this.save(list);
    const msgs = {
      'Verified':`Your complaint ${id} has been verified by our team.`,
      'Assigned':`Complaint ${id} has been assigned to ${c.department}.`,
      'In Progress':`Work has started on your complaint ${id}.`,
      'Resolved':`Great news! Your complaint ${id} has been resolved.`
    };
    if(msgs[status]) NotifsAPI.push(c.userId, msgs[status], status==='Resolved'?'success':'info');
    return c;
  },

  assignDepartment(id, department){
    const list = this.all(); const c = list.find(x=>x.id===id);
    if(!c) throw new Error('Complaint not found.');
    c.department = department; c.updatedAt = nowISO(); this.save(list);
    return c;
  },

  addRating(id, rating, feedback){
    const list = this.all(); const c = list.find(x=>x.id===id);
    if(!c) throw new Error('Complaint not found.');
    c.rating = rating; c.feedback = feedback; this.save(list);
    return c;
  },

  remove(id){
    const list = this.all().filter(c=>c.id!==id);
    this.save(list);
  },

  stats(userId){
    const list = userId ? this.byUser(userId) : this.all();
    return {
      total: list.length,
      pending: list.filter(c=>c.status==='Pending').length,
      inProgress: list.filter(c=>c.status==='In Progress'||c.status==='Assigned'||c.status==='Verified').length,
      resolved: list.filter(c=>c.status==='Resolved').length
    };
  }
};

/* ---------------------------- notifications ---------------------------- */
const NotifsAPI = {
  all(){ return loadJSON(DB_KEYS.NOTIFS, []); },
  byUser(userId){ return this.all().filter(n=>n.userId===userId).sort((a,b)=> new Date(b.at)-new Date(a.at)); },
  push(userId, text, type='info'){
    const list = this.all();
    list.unshift({ id: uid('N'), userId, text, type, read:false, at: nowISO() });
    saveJSON(DB_KEYS.NOTIFS, list);
  },
  markAllRead(userId){
    const list = this.all();
    list.forEach(n=>{ if(n.userId===userId) n.read = true; });
    saveJSON(DB_KEYS.NOTIFS, list);
  },
  unreadCount(userId){ return this.byUser(userId).filter(n=>!n.read).length; }
};

function statusBadgeClass(status){
  return { 'Pending':'pending','Verified':'verified','Assigned':'assigned','In Progress':'progress','Resolved':'resolved' }[status] || 'pending';
}
function severityBadgeClass(sev){
  return 'severity-' + String(sev).toLowerCase();
}
function markerColor(status){
  if(status==='Resolved') return '#33d17a';
  if(status==='In Progress' || status==='Assigned' || status==='Verified') return '#f4c93b';
  return '#ff5d6c';
}
function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}
