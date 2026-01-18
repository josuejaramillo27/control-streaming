// AKAZA Control - PRO (solo HTML/CSS/JS + LocalStorage)
// ⚠️ Seguridad: esto NO es una contraseña real si publicas la web.
// Sirve para que "no sea tan fácil", pero cualquiera que sepa puede verlo.

const STORAGE_KEY = "streamingControlV2";

// Defaults
const DEFAULTS = {
  settings: { user: "admin", pass: "1234", currency: "S/ " },
  services: ["Netflix", "Disney+", "HBO Max", "Prime Video"],
  clients: []
};

let state = loadState();
let editingId = null;

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    // merge simple
    return {
      settings: { ...DEFAULTS.settings, ...(parsed.settings||{}) },
      services: Array.isArray(parsed.services) ? parsed.services : [...DEFAULTS.services],
      clients: Array.isArray(parsed.clients) ? parsed.clients : []
    };
  }catch(e){
    return structuredClone(DEFAULTS);
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Auto-JSON (si está activo)
  writeAutoJson();
}

function money(n){
  const cur = (state.settings.currency ?? "S/ ");
  const val = Number(n||0);
  return cur + val.toFixed(2);
}

function daysLeft(dateStr){
  if(!dateStr) return null;

  const d = new Date(String(dateStr).trim() + "T00:00:00");
  if(Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = d - today;
  const days = Math.round(diffMs / (1000*60*60*24));
  return Number.isFinite(days) ? days : null;
}

function badgeForDays(d){
  if(d === null || Number.isNaN(d)) return {cls:"", text:"—"};
  if(d <= 0) return {cls:"danger", text: d === 0 ? "Hoy" : (Math.abs(d) + "d atrasado")};
  if(d <= 3) return {cls:"danger", text: d + "d"};
  if(d <= 7) return {cls:"warn", text: d + "d"};
  return {cls:"ok", text: d + "d"};
}

function selectedServicesFromUI(){
  const checks = [...document.querySelectorAll("#servicesChecks input[type=checkbox]")];
  return checks.filter(c=>c.checked).map(c=>c.value);
}

/* ---------- LOGIN ---------- */
function login(){
  const u = document.getElementById("user").value.trim();
  const p = document.getElementById("pass").value;
  const ok = (u === state.settings.user && p === state.settings.pass);
  const err = document.getElementById("loginError");
  if(ok){
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("appView").classList.remove("hidden");
    initApp();
  }else{
    err.textContent = "Usuario o contraseña incorrectos";
  }
}

function logout(){
  location.reload();
}

/* ---------- APP INIT ---------- */
function initApp(){
  const now = new Date();
  const m = String(now.getMonth()+1).padStart(2,"0");
  document.getElementById("monthPick").value = `${now.getFullYear()}-${m}`;

  rebuildServicesChecks();
  render();
  renderMonth();
  renderServicesList();
  fillSettingsForm();
}

/* ---------- CLIENTES ---------- */
function openClientModal(id=null){
  editingId = id;
  const modal = document.getElementById("clientModal");
  const title = document.getElementById("clientModalTitle");
  const btnDelete = document.getElementById("btnDelete");

  // reset
  document.getElementById("cNombre").value = "";
  document.getElementById("cNumero").value = "";
  document.getElementById("cVence").value = "";
  document.getElementById("cPago").value = "";
  document.getElementById("cCosto").value = "";
  document.getElementById("cEmail").value = "";
  document.getElementById("cPass").value = "";
  document.getElementById("cNotas").value = "";

  rebuildServicesChecks();

  if(id){
    const c = state.clients.find(x=>x.id===id);
    if(c){
      title.textContent = "Editar cliente";
      btnDelete.classList.remove("hidden");
      document.getElementById("cNombre").value = c.nombre || "";
      document.getElementById("cNumero").value = c.numero || "";
      document.getElementById("cVence").value = c.vence || "";
      document.getElementById("cPago").value = c.pago ?? "";
      document.getElementById("cCosto").value = c.costo ?? "";
      document.getElementById("cEmail").value = c.accountEmail || "";
      document.getElementById("cPass").value = c.accountPass || "";
      document.getElementById("cNotas").value = c.notas || "";

      const set = new Set(c.servicios || []);
      [...document.querySelectorAll("#servicesChecks input[type=checkbox]")].forEach(ch=>{
        ch.checked = set.has(ch.value);
      });
    }
  }else{
    title.textContent = "Nuevo cliente";
    btnDelete.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

function closeClientModal(){
  document.getElementById("clientModal").classList.add("hidden");
  editingId = null;
}

function saveClient(){
  const nombre = document.getElementById("cNombre").value.trim();
  const numero = document.getElementById("cNumero").value.trim();
  const servicios = selectedServicesFromUI();
  const vence = document.getElementById("cVence").value;
  const pago = Number(document.getElementById("cPago").value || 0);
  const costo = Number(document.getElementById("cCosto").value || 0);
  const accountEmail = document.getElementById("cEmail").value.trim();
  const accountPass = document.getElementById("cPass").value.trim();
  const notas = document.getElementById("cNotas").value.trim();

  if(!nombre || !vence){
    alert("Completa al menos: Nombre y Fecha de vencimiento.");
    return;
  }
  if(servicios.length === 0){
    alert("Marca al menos 1 servicio.");
    return;
  }

  if(editingId){
    const i = state.clients.findIndex(x=>x.id===editingId);
    if(i>=0){
      state.clients[i] = { ...state.clients[i], nombre, numero, servicios, vence, pago, costo, accountEmail, accountPass, notas };
    }
  }else{
    state.clients.push({
      id: cryptoRandomId(),
      nombre, numero, servicios, vence, pago, costo,
      accountEmail, accountPass, notas,
      createdAt: new Date().toISOString()
    });
  }

  saveState();
  closeClientModal();
  render();
  renderMonth();
}

function deleteClient(){
  if(!editingId) return;
  const ok = confirm("¿Eliminar este cliente?");
  if(!ok) return;
  state.clients = state.clients.filter(x=>x.id!==editingId);
  saveState();
  closeClientModal();
  render();
  renderMonth();
}

function cryptoRandomId(){
  return (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2));
}

function render(){
  rebuildServicesChecks();

  const f = (document.getElementById("filter").value || "").toLowerCase();
  const tbody = document.getElementById("rows");
  tbody.innerHTML = "";

  const items = [...state.clients]
    .filter(c => {
      const text = [
        c.nombre, c.numero, (c.servicios||[]).join(" "),
        c.vence, c.notas, c.accountEmail
      ].join(" ").toLowerCase();
      return text.includes(f);
    })
    .map(c => ({...c, _days: daysLeft(c.vence)}))
    .sort((a,b) => (a._days ?? 999999) - (b._days ?? 999999));

  for(const c of items){
    const tr = document.createElement("tr");

    const chips = (c.servicios||[]).map(s=>`<span class="chip">${escapeHtml(s)}</span>`).join("");
    const badge = badgeForDays(c._days);

    tr.innerHTML = `
      <td><b>${escapeHtml(c.nombre||"")}</b><div class="muted small">${escapeHtml(c.notas||"")}</div></td>
      <td>${escapeHtml(c.numero||"")}</td>
      <td><div class="chips">${chips}</div></td>
      <td>${escapeHtml(c.vence||"")}</td>
      <td><span class="badge ${badge.cls}">${badge.text}</span></td>
      <td>${money(c.pago)}</td>
      <td>${money(c.costo)}</td>
      <td><b>${money((Number(c.pago||0) - Number(c.costo||0)))}</b></td>
      <td><div class="actions">
  <button class="btn sm ghost" onclick="openWhatsApp('reminder','${c.id}')">WSP Faltan</button>
  <button class="btn sm ghost" onclick="openWhatsApp('renew','${c.id}')">WSP Renovar</button>
  <button class="btn sm" onclick="openClientModal('${c.id}')">Editar</button>
</div></td>
    `;
    tbody.appendChild(tr);
  }

  const totalIngresos = sum(state.clients.map(c=>Number(c.pago||0)));
  const totalCostos = sum(state.clients.map(c=>Number(c.costo||0)));
  const totalNeto = totalIngresos - totalCostos;

  document.getElementById("kpiIngresos").textContent = money(totalIngresos);
  document.getElementById("kpiCostos").textContent = money(totalCostos);
  document.getElementById("kpiGanancia").textContent = money(totalNeto);
}

function sum(arr){ return arr.reduce((a,b)=>a+(Number(b||0)),0); }

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* ---------- RESUMEN MES ---------- */
function renderMonth(){
  const month = document.getElementById("monthPick").value;
  if(!month){ return; }
  const [y,m] = month.split("-").map(Number);
  const inMonth = state.clients.filter(c=>{
    if(!c.vence) return false;
    const d = new Date(c.vence + "T00:00:00");
    return d.getFullYear()===y && (d.getMonth()+1)===m;
  });

  const ingresos = sum(inMonth.map(c=>Number(c.pago||0)));
  const costos = sum(inMonth.map(c=>Number(c.costo||0)));
  const neto = ingresos - costos;

  document.getElementById("mIngresos").textContent = money(ingresos);
  document.getElementById("mCostos").textContent = money(costos);
  document.getElementById("mNeto").textContent = money(neto);
}

/* ---------- SERVICIOS ---------- */
function rebuildServicesChecks(){
  const wrap = document.getElementById("servicesChecks");
  if(!wrap) return;
  wrap.innerHTML = "";

  for(const s of state.services){
    const id = "svc_" + s.replace(/\s+/g,"_").toLowerCase();
    const label = document.createElement("label");
    label.className = "check";
    label.innerHTML = `<input id="${id}" type="checkbox" value="${escapeHtml(s)}"/> <span>${escapeHtml(s)}</span>`;
    wrap.appendChild(label);
  }
}

function openServices(){
  document.getElementById("servicesModal").classList.remove("hidden");
  renderServicesList();
  setTimeout(()=>document.getElementById("sName")?.focus(), 50);
}

function closeServices(){
  document.getElementById("servicesModal").classList.add("hidden");
  rebuildServicesChecks();
  render();
}

function addService(){
  const input = document.getElementById("sName");
  const name = (input.value||"").trim();
  if(!name) return;
  if(state.services.some(s=>s.toLowerCase()===name.toLowerCase())){
    alert("Ese servicio ya existe.");
    return;
  }
  state.services.push(name);
  input.value = "";
  saveState();
  renderServicesList();
  rebuildServicesChecks();
}

function removeService(name){
  const ok = confirm(`¿Eliminar "${name}"? (No borra clientes, pero ya no podrás seleccionarlo.)`);
  if(!ok) return;
  state.services = state.services.filter(s=>s!==name);
  saveState();
  renderServicesList();
  rebuildServicesChecks();
}

function renderServicesList(){
  const list = document.getElementById("servicesList");
  if(!list) return;
  list.innerHTML = "";
  for(const s of state.services){
    const div = document.createElement("div");
    div.className = "listItem";
    div.innerHTML = `<div><b>${escapeHtml(s)}</b></div>
                     <button class="btn danger" onclick="removeService('${escapeHtml(s)}')">Eliminar</button>`;
    list.appendChild(div);
  }
}

/* ---------- AJUSTES ---------- */
function openSettings(){
  fillSettingsForm();
  document.getElementById("settingsModal").classList.remove("hidden");
}
function closeSettings(){
  document.getElementById("settingsModal").classList.add("hidden");
}

function fillSettingsForm(){
  document.getElementById("setUser").value = state.settings.user || "admin";
  document.getElementById("setPass").value = state.settings.pass || "1234";
  document.getElementById("setCurrency").value = state.settings.currency || "S/ ";
}

function saveSettings(){
  const u = document.getElementById("setUser").value.trim() || "admin";
  const p = document.getElementById("setPass").value || "1234";
  const cur = document.getElementById("setCurrency").value || "S/ ";

  state.settings = { user: u, pass: p, currency: cur };
  saveState();
  closeSettings();
  alert("Listo ✅ Ajustes guardados. (Si cambiaste usuario/contraseña, recarga para probar.)");
}

/* ---------- BACKUP ---------- */
function exportBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup-control-streaming.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBackup(ev){
  const file = ev.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(String(reader.result||"{}"));
      state = {
        settings: { ...DEFAULTS.settings, ...(parsed.settings||{}) },
        services: Array.isArray(parsed.services) ? parsed.services : [...DEFAULTS.services],
        clients: Array.isArray(parsed.clients) ? parsed.clients : []
      };
      saveState();
      alert("Importado ✅ Recarga la página para ver todo.");
    }catch(e){
      alert("Ese archivo no parece válido.");
    }
  };
  reader.readAsText(file);
  ev.target.value = "";
}

/* ---------- MODAL BACKDROP CLOSE ---------- */
function modalBackdropClose(event, id){
  if(event.target && event.target.id === id){
    document.getElementById(id).classList.add("hidden");
  }
}


/* ---------- AUTO-JSON (File System Access API) ----------
   Funciona en Chrome/Edge. En Firefox/Safari puede no existir.
   Guarda automáticamente el state en el archivo elegido.
*/
const AUTO_JSON_HANDLE_KEY = "streamingControl_autoJsonHandle";

async function setupAutoJson(){
  if(!window.showSaveFilePicker){
    alert("Tu navegador no soporta Auto‑JSON.\nUsa Chrome o Edge.\n\nAlternativa: Exportar/Importar.");
    return;
  }
  try{
    const handle = await window.showSaveFilePicker({
      suggestedName: "control-streaming.json",
      types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
    });
    await saveHandleToStorage(handle);
    await writeAutoJson(); // primera escritura
    updateAutoJsonStatus();
    alert("Listo ✅ Ahora se guardará automáticamente en ese archivo.");
  }catch(e){
    // cancelado
  }
}

async function disableAutoJson(){
  localStorage.removeItem(AUTO_JSON_HANDLE_KEY);
  autoJsonHandle = null;
  updateAutoJsonStatus();
  alert("Auto‑JSON desactivado.");
}

let autoJsonHandle = null;

async function saveHandleToStorage(handle){
  // Mantiene el handle en memoria (esta sesión). Si recargas, vuelve a elegir archivo.
  localStorage.setItem(AUTO_JSON_HANDLE_KEY, "enabled");
  autoJsonHandle = handle;
}

function updateAutoJsonStatus(){
  const el = document.getElementById("autoJsonStatus");
  if(!el) return;
  const enabled = localStorage.getItem(AUTO_JSON_HANDLE_KEY)==="enabled";
  el.textContent = enabled
    ? (autoJsonHandle ? "Activo ✅ (archivo seleccionado en esta sesión)" : "Activo ⚠️ (recargaste: vuelve a elegir archivo)")
    : "Inactivo";
}

async function writeAutoJson(){
  const enabled = localStorage.getItem(AUTO_JSON_HANDLE_KEY)==="enabled";
  if(!enabled || !autoJsonHandle) return;

  try{
    const writable = await autoJsonHandle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
  }catch(e){
    console.warn("Auto-JSON fallo:", e);
    const el = document.getElementById("autoJsonStatus");
    if(el) el.textContent = "Activo ⚠️ (no se pudo escribir; vuelve a elegir archivo)";
  }
}


/* ---------- WHATSAPP (manual) ----------
   Abre WhatsApp con mensaje listo. No envía solo (tú presionas enviar).
*/
function normalizePhoneForWa(raw){
  const s = String(raw||"").trim();
  if(!s) return null;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function buildServicesText(servicios){
  const arr = Array.isArray(servicios) ? servicios : [];
  if(arr.length === 0) return "servicio";
  if(arr.length === 1) return arr[0];
  return arr.join(", ");
}

function msgReminder(c, d){
  const svc = buildServicesText(c.servicios);
  const diasTxt = (d === 1) ? "1 día" : (d + " días");
  return `Hola ${c.nombre}, te quedan ${diasTxt} para que venza tu ${svc}. ¿Deseas renovar?`;
}

function msgRenew(c, d){
  const svc = buildServicesText(c.servicios);
  if(d === 0) return `Hola ${c.nombre}, hoy vence tu ${svc}. ¿Renovamos?`;
  if(d < 0){
    const atras = Math.abs(d);
    const atrasTxt = (atras === 1) ? "1 día" : (atras + " días");
    return `Hola ${c.nombre}, tu ${svc} ya venció hace ${atrasTxt}. ¿Deseas renovar?`;
  }
  return `Hola ${c.nombre}, ¿confirmas la renovación de tu ${svc}?`;
}

function openWhatsApp(type, id){
  const c = state.clients.find(x=>x.id===id);
  if(!c) return;

  const phone = normalizePhoneForWa(c.numero);
  if(!phone){
    alert("Este cliente no tiene número válido.\nUsa formato con código de país, ej: +51 999 999 999");
    return;
  }

  const d = daysLeft(c.vence);
  const text = (type === "renew") ? msgRenew(c, d ?? 0) : msgReminder(c, (d ?? 0));
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}
