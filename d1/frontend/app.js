// --- Auth state ---
let token = null;
let me = null;
let projects = [];
let current = null;

const STAGES = [
  "Specify Requirements",
  "Business Case Creation",
  "Review / Cost Estimation",
  "Regional Business Operations Review",
  "Business Operations Approval",
  "Functional Design",
  "SOW Request",
  "Budget Approval",
  "CLM Request",
  "Create CSR/PO",
  "CR In Progress"
];

const svg = document.getElementById("railSvg");
const notesEl = document.getElementById("notes");
const slaBox = document.getElementById("slaBox");
const projectBar = document.getElementById("projectBar");

function api(path, opts={}){
  opts.headers ||= {};
  if (token) opts.headers.Authorization = "Bearer " + token;
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  return fetch(path, opts).then(r=>{
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.json();
  });
}

function fmtDaysSince(iso){
  if(!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000*60*60*24));
}

// --- Draw SVG rail matching the reference ---
function drawRail(status, type="normal"){
  svg.innerHTML = "";
  const w = 1550; const h = 200;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  // main rail line
  const y = 140;
  const path = document.createElementNS("http://www.w3.org/2000/svg","path");
  path.setAttribute("d", `M 40 ${y} L 1500 ${y}`);
  path.setAttribute("class","rail");
  svg.appendChild(path);

  // branch to Cancel near Business Operations Approval
  // from "Regional Business Operations Review" and "Business Operations Approval"
  const branch1 = document.createElementNS("http://www.w3.org/2000/svg","path");
  branch1.setAttribute("d","M 610 140 L 900 40");
  branch1.setAttribute("class","rail-branch");
  svg.appendChild(branch1);
  const branch2 = document.createElementNS("http://www.w3.org/2000/svg","path");
  branch2.setAttribute("d","M 780 140 L 900 40");
  branch2.setAttribute("class","rail-branch");
  svg.appendChild(branch2);

  // return from Cancel to main rail
  const branch3 = document.createElementNS("http://www.w3.org/2000/svg","path");
  branch3.setAttribute("d","M 980 40 L 1250 140");
  branch3.setAttribute("class","rail-branch");
  svg.appendChild(branch3);

  // left Cancel icon
  const cancelLeft = circle(40, 40, 16, "cancel");
  svg.appendChild(cancelLeft);
  label(40, 25, "*Cancel");
  line(40, 55, 40, 120, "rail-branch");

  // right Close icon
  const closeRight = circle(1500, 40, 16, "close");
  svg.appendChild(closeRight);
  label(1500, 25, "*Close");
  line(1500, 55, 1500, 120, "rail-branch");

  // Stages positions to mimic screenshot distances
  const xs = [80, 220, 360, 520, 700, 880, 1020, 1160, 1300, 1420, 1500];
  STAGES.forEach((name, i) => {
    const x = xs[i];
    const isDone = STAGES.indexOf(status) > i;
    const isActive = status === name;
    const group = document.createElementNS("http://www.w3.org/2000/svg","g");
    group.setAttribute("class","node");
    const cls = ["stage-circle"];
    if(type==="special") cls.push("special");
    if(isDone) cls.push("stage-done");
    if(isActive) cls.push("stage-active");
    const c = circle(x, y, 18, cls.join(" "));
    group.appendChild(c);
    // inner check for done
    if(isDone){
      const chk = document.createElementNS("http://www.w3.org/2000/svg","text");
      chk.setAttribute("x", x); chk.setAttribute("y", y+4);
      chk.setAttribute("text-anchor","middle"); chk.setAttribute("font-size","16");
      chk.textContent = "✓";
      group.appendChild(chk);
    }
    // label
    const t = document.createElementNS("http://www.w3.org/2000/svg","text");
    t.setAttribute("x", x);
    t.setAttribute("y", y+40);
    t.setAttribute("class","stage-text");
    t.textContent = name;
    group.appendChild(t);

    group.addEventListener("click", ()=>{
      if(!current) return;
      updateProject(current.id, { status: name });
    });
    svg.appendChild(group);
  });

  // top cancel bubble (the one on the branch)
  const cancelTop = circle(930, 40, 18, "cancel");
  svg.appendChild(cancelTop);
  label(930, 65, "*Cancel");

  function circle(cx, cy, r, cls){
    const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", r);
    c.setAttribute("class", cls);
    return c;
  }
  function line(x1,y1,x2,y2, cls){
    const l = document.createElementNS("http://www.w3.org/2000/svg","line");
    l.setAttribute("x1",x1); l.setAttribute("y1",y1); l.setAttribute("x2",x2); l.setAttribute("y2",y2);
    l.setAttribute("class", cls);
    svg.appendChild(l);
  }
  function label(x,y,text){
    const t = document.createElementNS("http://www.w3.org/2000/svg","text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("class","stage-text");
    t.textContent = text;
    svg.appendChild(t);
  }
}

// --- UI helpers ---
function renderProjects(){
  projectBar.innerHTML = "";
  projects.forEach(p=>{
    const a = document.createElement("button");
    const staleDays = fmtDaysSince(p.lastUpdateAt);
    const isStale = staleDays > 5;
    const base = "px-3 py-1 rounded border text-sm";
    const color = p.type==="special" ? "border-blue-600 text-blue-700" : "border-slate-300";
    const bg = isStale ? "bg-red-100" : "bg-white";
    a.className = `${base} ${color} ${bg}`;
    a.textContent = `${p.name} (${p.priority})`;
    a.onclick = ()=>selectProject(p.id);
    projectBar.appendChild(a);
  });
}

function selectProject(id){
  current = projects.find(p=>p.id===id);
  if(!current) return;
  drawRail(current.status, current.type);
  document.getElementById("rR").value = current.raci?.R || "";
  document.getElementById("rA").value = current.raci?.A || "";
  document.getElementById("rC").value = current.raci?.C || "";
  document.getElementById("rI").value = current.raci?.I || "";
  document.getElementById("noteText").value = "";
  notesEl.innerHTML = "";
  (current.notes||[]).slice().reverse().forEach(n=>{
    const li = document.createElement("li");
    li.textContent = `[${new Date(n.at).toLocaleString()}] ${n.by}: ${n.text}`;
    notesEl.appendChild(li);
  });
  const d = fmtDaysSince(current.lastUpdateAt);
  slaBox.textContent = `Days since last update: ${d} ${d>5?"- SLA ALERT (turns red in list)":""}`;
}

function updateProject(id, changes){
  api(`/api/projects/${id}`, { method:"PATCH", body: changes })
    .then(p=>{
      const idx = projects.findIndex(x=>x.id===p.id);
      projects[idx] = p;
      renderProjects();
      selectProject(p.id);
    }).catch(console.error);
}

// --- Event bindings ---
document.getElementById("login").onclick = ()=>{
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  api("/api/login", { method:"POST", body: { username, password }})
    .then(res=>{
      token = res.token; me = res.user;
      document.getElementById("whoami").textContent = `${res.user.username} (${res.user.role})`;
      loadProjects();
    }).catch(()=>alert("Login failed"));
};

function loadProjects(showAll=false){
  api("/api/projects"+(showAll?"?all=1":""), { method:"GET" })
    .then(res=>{
      projects = res;
      renderProjects();
      if (projects[0]) selectProject(projects[0].id);
      else drawRail(STAGES[0]);
    }).catch(console.error);
}

document.getElementById("btnAll").onclick = ()=>{
  loadProjects(true);
};

document.getElementById("createProject").onclick = ()=> createProject("normal");
document.getElementById("createSpecial").onclick = ()=> createProject("special");

function createProject(type){
  const body = {
    name: document.getElementById("pName").value,
    requester: document.getElementById("pRequester").value,
    sponsor: document.getElementById("pSponsor").value,
    owner: document.getElementById("pOwner").value,
    costCenter: document.getElementById("pCC").value,
    priority: Number(document.getElementById("pPriority").value || 3),
    type
  };
  api("/api/projects", { method:"POST", body })
    .then(p=>{
      projects.push(p);
      renderProjects();
    }).catch(err=>alert("Create failed"));
}

document.getElementById("saveRaci").onclick = ()=>{
  if(!current) return;
  const raci = {
    R: document.getElementById("rR").value,
    A: document.getElementById("rA").value,
    C: document.getElementById("rC").value,
    I: document.getElementById("rI").value,
  };
  updateProject(current.id, { raci });
};

document.getElementById("hold").onclick = ()=>{
  if(current) updateProject(current.id, { onHold: !current.onHold });
};
document.getElementById("close").onclick = ()=>{
  if(current) updateProject(current.id, { closed: !current.closed, status: STAGES[STAGES.length-1] });
};

document.getElementById("addNote").onclick = ()=>{
  if(!current) return;
  const text = document.getElementById("noteText").value;
  if(!text) return;
  api(`/api/projects/${current.id}/notes`, { method:"POST", body:{ text }})
    .then(n=>{
      current.notes = current.notes || [];
      current.notes.push(n);
      selectProject(current.id);
    }).catch(console.error);
};

document.getElementById("search").addEventListener("input", (e)=>{
  const q = e.target.value.trim();
  if (!q) { renderProjects(); return; }
  api(`/api/search?q=${encodeURIComponent(q)}`).then(res=>{
    projects = res;
    renderProjects();
  });
});

// initial
drawRail(STAGES[0]);