const viewInicio = document.getElementById("view-inicio");
const viewConfiguracion = document.getElementById("view-configuracion");
const breadcrumbContainer = document.getElementById("breadcrumbContainer");
const sidebarItems = document.querySelectorAll(".sidebar-item");
const contentPanels = document.querySelectorAll(".content-panel");
const configMenu = document.getElementById("config-menu");
const configDetail = document.getElementById("config-detail");
const configDetailTitle = document.getElementById("config-detail-title");
const configDetailDesc = document.getElementById("config-detail-desc");

const configLabels = {
  app: "App",
  contratos: "Contratos",
  puestos: "Puestos",
  convenios: "Horas convenio",
  "tipos-trabajador": "Tipos de trabajador"
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadTiposContrato() {
  const select = document.getElementById("at-tipo-contrato");
  if (!select) return;
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client
    .schema("contratos")
    .from("tipos")
    .select("contrato")
    .order("orden", { ascending: true });
  if (error || !data) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">Seleccionar...</option>';
  data.forEach((tipo) => {
    const opt = document.createElement("option");
    opt.value = tipo.contrato;
    opt.textContent = tipo.contrato;
    select.appendChild(opt);
  });
  select.value = currentVal;
}

async function loadConveniosSelect() {
  const select = document.getElementById("at-convenio");
  if (!select) return;
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client
    .schema("contratos")
    .from("convenios")
    .select("id_convenio, descripcion_convenio, horas_convenio")
    .order("id_convenio", { ascending: true });
  if (error || !data) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="" data-horas="">Seleccionar...</option>';
  data.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id_convenio;
    opt.textContent = c.descripcion_convenio;
    opt.dataset.horas = c.horas_convenio ?? "";
    select.appendChild(opt);
  });
  select.value = currentVal;
  // Recalcular coeficiente si ya había jornada introducida
  updateJornadaCoeficiente();
}

let currentTarget = "inicio";
let currentCompany = localStorage.getItem("la_company") || "LA";

function applyBreadcrumbTheme(company) {
  const root = document.documentElement;
  if (company === "AL") {
    root.style.setProperty("--breadcrumb-bg", "#d8ebf2");
    root.style.setProperty("--breadcrumb-border", "#d8ebf2");
  } else {
    root.style.setProperty("--breadcrumb-bg", "#ffdbbb");
    root.style.setProperty("--breadcrumb-border", "#ffdbbb");
  }
}

function syncEmpresaSelect(company) {
  const empresaSelect = document.getElementById("at-empresa");
  if (!empresaSelect) return;
  empresaSelect.value = company;
  empresaSelect.disabled = true;
  empresaSelect.setAttribute("aria-disabled", "true");
}

const APP_SECCIONES = [
  { id: "firma-contrato",    label: "NCS - Firma contrato" },
  { id: "alta-ss",           label: "Alta SS" },
  { id: "registro-contrato", label: "Registro contrato" },
  { id: "carpeta",           label: "Carpeta" },
  { id: "cerrado",           label: "Cerrado" },
];

const ESTADOS_CAMPOS = [
  { value: "",                  label: "— ninguno —" },
  { value: "registrado",        label: "registrado" },
  { value: "contrato_fdo",      label: "contrato_fdo" },
  { value: "ss",                label: "ss" },
  { value: "registro_contrato", label: "registro_contrato" },
  { value: "carpeta",           label: "carpeta" },
];

const FECHA_CAMPOS = [
  { value: "",             label: "— sin filtro de fecha —" },
  { value: "fecha_inicio", label: "fecha_inicio" },
];

const FILTRO_FECHA_OPTS = [
  { value: "cualquiera",   label: "Cualquiera" },
  { value: "hoy",          label: "Solo hoy" },
  { value: "hoy_o_pasado", label: "Hoy o en el pasado" },
  { value: "futuro",       label: "Futuro" },
];

function getLabelForTarget(target) {
  if (target === "inicio") return "Inicio";
  if (target === "configuracion") return "Configuracion";
  if (target === "alta-trabajador") return "Añadir trabajador";
  if (target === "firma-contrato") return "NCS - Firma contrato";
  if (target === "alta-ss") return "Alta SS";
  if (target === "registro-contrato") return "Registro contrato";
  if (target === "carpeta") return "Carpeta";
  if (target === "cerrado") return "Cerrado";
  if (target === "config-app") return "App";
  if (target === "config-app-globos") return "Globos";
  if (target.startsWith("config-app-col-")) {
    const sec = target.replace("config-app-col-", "");
    const found = APP_SECCIONES.find(s => s.id === sec);
    return found ? found.label : sec;
  }
  if (target.startsWith("config-")) {
    const key = target.replace("config-", "");
    return configLabels[key] || "Detalle";
  }
  return "Inicio";
}

function buildBreadcrumbItems(target) {
  if (target === "inicio") return ["inicio"];
  if (target === "configuracion") return ["inicio", "configuracion"];
  if (target === "alta-trabajador") return ["inicio", "alta-trabajador"];
  if (target === "firma-contrato") return ["inicio", "firma-contrato"];
  if (target === "alta-ss") return ["inicio", "alta-ss"];
  if (target === "registro-contrato") return ["inicio", "registro-contrato"];
  if (target === "carpeta") return ["inicio", "carpeta"];
  if (target === "cerrado") return ["inicio", "cerrado"];
  if (target === "config-app") return ["inicio", "configuracion", "config-app"];
  if (target === "config-app-globos") return ["inicio", "configuracion", "config-app", "config-app-globos"];
  if (target.startsWith("config-app-col-")) return ["inicio", "configuracion", "config-app", target];
  if (target.startsWith("config-")) {
    return ["inicio", "configuracion", target];
  }
  return ["inicio"];
}

function updateBreadcrumb(target) {
  currentTarget = target;
  const items = buildBreadcrumbItems(target);
  breadcrumbContainer.innerHTML = "";

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const wrapper = document.createElement("span");
    wrapper.className = "breadcrumb-item";

    if (isLast) {
      const label = document.createElement("span");
      label.className = "breadcrumb-last";
      label.textContent = getLabelForTarget(item);
      wrapper.appendChild(label);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "breadcrumb-clickable";
      button.dataset.target = item;
      button.textContent = getLabelForTarget(item);
      wrapper.appendChild(button);
    }

    breadcrumbContainer.appendChild(wrapper);

    if (!isLast) {
      const separator = document.createElement("span");
      separator.className = "breadcrumb-separator";
      separator.textContent = ">";
      breadcrumbContainer.appendChild(separator);
    }
  });
}

function showView(view) {
  if (view === "configuracion") {
    viewInicio.classList.remove("active");
    viewConfiguracion.classList.add("active");
    updateBreadcrumb("configuracion");
  } else {
    viewConfiguracion.classList.remove("active");
    viewInicio.classList.add("active");
    updateBreadcrumb("inicio");
  }
}

function showInicioSection(sectionId, breadcrumbTarget) {
  contentPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === sectionId);
  });

  sidebarItems.forEach((item) => {
    const isActive = item.dataset.section === sectionId;
    item.classList.toggle("active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  showView("inicio");
  if (breadcrumbTarget) {
    updateBreadcrumb(breadcrumbTarget);
  }

  // Cargar datos de la pestaña activa
  const sectionLoaders = {
    "firma-contrato": loadFirmaContratoTab,
    "alta-ss": loadAltaSSTab,
    "registro-contrato": loadRegistroContratoTab,
    "carpeta": loadCarpetaTab,
    "cerrado": loadCerradoTab,
  };
  if (sectionLoaders[sectionId]) sectionLoaders[sectionId]();
}

function _hideAllConfigSections() {
  const configContratos = document.getElementById("config-contratos");
  const configConvenios = document.getElementById("config-convenios");
  const configTiposTrabajador = document.getElementById("config-tipos-trabajador");
  const configApp = document.getElementById("config-app");
  if (configContratos) configContratos.classList.add("is-hidden");
  if (configConvenios) configConvenios.classList.add("is-hidden");
  if (configTiposTrabajador) configTiposTrabajador.classList.add("is-hidden");
  if (configApp) configApp.classList.add("is-hidden");
  configDetail.classList.add("is-hidden");
}

function showConfigMenu() {
  configMenu.classList.add("active");
  _hideAllConfigSections();
  updateBreadcrumb("configuracion");
}

function showConfigSection(sectionKey) {
  configMenu.classList.remove("active");
  _hideAllConfigSections();

  if (sectionKey === "app") {
    const el = document.getElementById("config-app");
    if (el) el.classList.remove("is-hidden");
    showConfigAppMenu();
    return;
  }

  if (sectionKey === "contratos") {
    const el = document.getElementById("config-contratos");
    if (el) el.classList.remove("is-hidden");
    loadConfigContratos();
    updateBreadcrumb("config-contratos");
    return;
  }

  if (sectionKey === "convenios") {
    const el = document.getElementById("config-convenios");
    if (el) el.classList.remove("is-hidden");
    loadConvenios();
    updateBreadcrumb("config-convenios");
    return;
  }

  if (sectionKey === "tipos-trabajador") {
    const el = document.getElementById("config-tipos-trabajador");
    if (el) el.classList.remove("is-hidden");
    loadConfigTiposTrabajador();
    updateBreadcrumb("config-tipos-trabajador");
    return;
  }

  const label = configLabels[sectionKey] || "Detalle";
  configDetailTitle.textContent = label;
  configDetailDesc.textContent = `Seccion ${label} en configuracion.`;
  configDetail.classList.remove("is-hidden");
  updateBreadcrumb(`config-${sectionKey}`);
}

function navigateToBreadcrumb(target) {
  if (target === "inicio") {
    showInicioSection("panel");
    return;
  }

  if (target === "alta-trabajador") {
    showInicioSection("alta-trabajador", "alta-trabajador");
    return;
  }

  if (target === "firma-contrato") {
    showInicioSection("firma-contrato", "firma-contrato");
    return;
  }

  if (target === "alta-ss") {
    showInicioSection("alta-ss", "alta-ss");
    return;
  }

  if (target === "registro-contrato") {
    showInicioSection("registro-contrato", "registro-contrato");
    return;
  }

  if (target === "carpeta") {
    showInicioSection("carpeta", "carpeta");
    return;
  }

  if (target === "cerrado") {
    showInicioSection("cerrado", "cerrado");
    return;
  }

  if (target === "configuracion") {
    showView("configuracion");
    showConfigMenu();
    return;
  }

  if (target === "config-app") {
    showView("configuracion");
    showConfigSection("app");
    return;
  }

  if (target === "config-app-globos") {
    showView("configuracion");
    const el = document.getElementById("config-app");
    if (el) el.classList.remove("is-hidden");
    _hideAllConfigSections();
    el.classList.remove("is-hidden");
    showConfigAppGlobos();
    return;
  }

  if (target.startsWith("config-app-col-")) {
    const sec = target.replace("config-app-col-", "");
    showView("configuracion");
    const el = document.getElementById("config-app");
    _hideAllConfigSections();
    if (el) el.classList.remove("is-hidden");
    showConfigAppColumnas(sec);
    return;
  }

  if (target.startsWith("config-")) {
    const key = target.replace("config-", "");
    showView("configuracion");
    showConfigSection(key);
  }
}

function goBack(target) {
  navigateToBreadcrumb(target);
}

function ensureInitialState(target) {
  navigateToBreadcrumb(target);
}

async function loadConfigContratos() {
  const list = document.getElementById("tipos-contrato-list");
  const msgEl = document.getElementById("tipos-contrato-msg");
  if (!list) return;
  list.innerHTML = '<li class="tipos-list-loading">Cargando...</li>';
  msgEl.textContent = "";
  msgEl.className = "form-msg";
  const client = window.supabaseClient;
  if (!client) {
    list.innerHTML = '<li class="tipos-list-empty">Cliente Supabase no disponible.</li>';
    return;
  }
  const { data, error } = await client
    .schema("contratos")
    .from("tipos")
    .select("id_contrato, contrato, orden")
    .order("orden", { ascending: true });
  if (error) {
    list.innerHTML = `<li class="tipos-list-empty">Error: ${escapeHtml(error.message)}</li>`;
    return;
  }
  renderTiposList(data || []);
}

function renderTiposList(tipos) {
  const list = document.getElementById("tipos-contrato-list");
  list.innerHTML = "";
  if (tipos.length === 0) {
    list.innerHTML = '<li class="tipos-list-empty">No hay tipos de contrato. Añade uno arriba.</li>';
    return;
  }
  tipos.forEach((tipo) => {
    const li = document.createElement("li");
    li.className = "tipo-item";
    li.draggable = true;
    li.dataset.id = tipo.id_contrato;
    li.innerHTML = `
      <span class="tipo-drag-handle" aria-hidden="true">⠇</span>
      <span class="tipo-nombre">${escapeHtml(tipo.contrato)}</span>
      <button type="button" class="tipo-delete-btn" data-id="${tipo.id_contrato}" title="Eliminar">🗑</button>
    `;
    list.appendChild(li);
  });
  setupDragAndDrop(list);
}

function setupDragAndDrop(list) {
  let dragEl = null;

  list.addEventListener("dragstart", (e) => {
    dragEl = e.target.closest(".tipo-item");
    if (!dragEl) return;
    dragEl.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  list.addEventListener("dragend", () => {
    if (dragEl) {
      dragEl.classList.remove("is-dragging");
      dragEl = null;
    }
    list.querySelectorAll(".tipo-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
  });

  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const target = e.target.closest(".tipo-item");
    if (!target || target === dragEl) return;
    list.querySelectorAll(".tipo-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
    target.classList.add("drag-over");
    const rect = target.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      list.insertBefore(dragEl, target);
    } else {
      list.insertBefore(dragEl, target.nextSibling);
    }
  });

  list.addEventListener("dragleave", (e) => {
    const target = e.target.closest(".tipo-item");
    if (target) target.classList.remove("drag-over");
  });

  list.addEventListener("drop", (e) => {
    e.preventDefault();
    list.querySelectorAll(".tipo-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
  });
}

async function saveTiposOrden() {
  const list = document.getElementById("tipos-contrato-list");
  const msgEl = document.getElementById("tipos-contrato-msg");
  const btn = document.getElementById("btn-save-tipos-orden");
  const items = [...list.querySelectorAll(".tipo-item")];
  btn.disabled = true;
  btn.textContent = "Guardando...";
  msgEl.textContent = "";
  msgEl.className = "form-msg";
  const client = window.supabaseClient;
  if (!client) {
    msgEl.textContent = "Error: cliente Supabase no disponible.";
    msgEl.classList.add("form-msg--error");
    btn.disabled = false;
    btn.textContent = "Guardar orden";
    return;
  }
  try {
    for (let i = 0; i < items.length; i++) {
      const { error } = await client
        .schema("contratos")
        .from("tipos")
        .update({ orden: i + 1 })
        .eq("id_contrato", items[i].dataset.id);
      if (error) throw error;
    }
    msgEl.textContent = "Orden guardado correctamente.";
    msgEl.classList.add("form-msg--success");
    loadTiposContrato();
  } catch (err) {
    msgEl.textContent = `Error al guardar: ${err.message}`;
    msgEl.classList.add("form-msg--error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar orden";
  }
}

async function addTipoContrato() {
  const input = document.getElementById("nuevo-tipo-contrato");
  const msgEl = document.getElementById("tipos-contrato-msg");
  const nombre = input.value.trim();
  msgEl.textContent = "";
  msgEl.className = "form-msg";
  if (!nombre) return;
  const client = window.supabaseClient;
  if (!client) return;
  const list = document.getElementById("tipos-contrato-list");
  const currentCount = list.querySelectorAll(".tipo-item").length;
  const { error } = await client
    .schema("contratos")
    .from("tipos")
    .insert([{ contrato: nombre, orden: currentCount + 1 }]);
  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
    msgEl.classList.add("form-msg--error");
    return;
  }
  input.value = "";
  await loadConfigContratos();
  loadTiposContrato();
}

function setupConfigContratos() {
  const addBtn = document.getElementById("btn-add-tipo-contrato");
  const saveBtn = document.getElementById("btn-save-tipos-orden");
  const input = document.getElementById("nuevo-tipo-contrato");
  const list = document.getElementById("tipos-contrato-list");

  if (addBtn) addBtn.addEventListener("click", addTipoContrato);

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addTipoContrato(); }
    });
  }

  if (saveBtn) saveBtn.addEventListener("click", saveTiposOrden);

  if (list) {
    list.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tipo-delete-btn");
      if (!btn) return;
      const id = btn.dataset.id;
      const client = window.supabaseClient;
      if (!client) return;
      const msgEl = document.getElementById("tipos-contrato-msg");
      const { error } = await client
        .schema("contratos")
        .from("tipos")
        .delete()
        .eq("id_contrato", id);
      if (error) {
        msgEl.textContent = `Error al eliminar: ${error.message}`;
        msgEl.classList.add("form-msg--error");
      } else {
        await loadConfigContratos();
        loadTiposContrato();
      }
    });
  }
}

// ---- Tipos de trabajador ----

async function loadTiposTrabajadorSelect() {
  const select = document.getElementById("at-tipo-trabajador");
  if (!select) return;
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client
    .schema("contratos")
    .from("tipos_trabajador")
    .select("id_tipo_trabajador, nombre")
    .order("orden", { ascending: true });
  if (error || !data) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">Seleccionar...</option>';
  data.forEach((tipo) => {
    const opt = document.createElement("option");
    opt.value = tipo.nombre;
    opt.textContent = tipo.nombre;
    select.appendChild(opt);
  });
  const otrosOpt = document.createElement("option");
  otrosOpt.value = "otros";
  otrosOpt.textContent = "Otros...";
  select.appendChild(otrosOpt);
  select.value = currentVal;
}

async function loadConfigTiposTrabajador() {
  const list = document.getElementById("tipos-trabajador-list");
  const msgEl = document.getElementById("tipos-trabajador-msg");
  if (!list) return;
  list.innerHTML = '<li class="tipos-list-loading">Cargando...</li>';
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "form-msg"; }
  const client = window.supabaseClient;
  if (!client) {
    list.innerHTML = '<li class="tipos-list-empty">Cliente Supabase no disponible.</li>';
    return;
  }
  const { data, error } = await client
    .schema("contratos")
    .from("tipos_trabajador")
    .select("id_tipo_trabajador, nombre, orden")
    .order("orden", { ascending: true });
  if (error) {
    list.innerHTML = `<li class="tipos-list-empty">Error: ${escapeHtml(error.message)}</li>`;
    return;
  }
  renderTiposTrabajadorList(data || []);
}

function renderTiposTrabajadorList(tipos) {
  const list = document.getElementById("tipos-trabajador-list");
  list.innerHTML = "";
  if (tipos.length === 0) {
    list.innerHTML = '<li class="tipos-list-empty">No hay tipos de trabajador. Añade uno arriba.</li>';
    return;
  }
  tipos.forEach((tipo) => {
    const li = document.createElement("li");
    li.className = "tipo-item";
    li.draggable = true;
    li.dataset.id = tipo.id_tipo_trabajador;
    li.innerHTML = `
      <span class="tipo-drag-handle" aria-hidden="true">⠇</span>
      <span class="tipo-nombre">${escapeHtml(tipo.nombre)}</span>
      <button type="button" class="tipo-delete-btn" data-id="${tipo.id_tipo_trabajador}" title="Eliminar">🗑</button>
    `;
    list.appendChild(li);
  });
  setupDragAndDrop(list);
}

async function addTipoTrabajador() {
  const input = document.getElementById("nuevo-tipo-trabajador");
  const msgEl = document.getElementById("tipos-trabajador-msg");
  const nombre = input.value.trim();
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "form-msg"; }
  if (!nombre) return;
  const client = window.supabaseClient;
  if (!client) return;
  const list = document.getElementById("tipos-trabajador-list");
  const currentCount = list.querySelectorAll(".tipo-item").length;
  const { error } = await client
    .schema("contratos")
    .from("tipos_trabajador")
    .insert([{ nombre, orden: currentCount + 1 }]);
  if (error) {
    if (msgEl) { msgEl.textContent = `Error: ${error.message}`; msgEl.classList.add("form-msg--error"); }
    return;
  }
  input.value = "";
  await loadConfigTiposTrabajador();
  loadTiposTrabajadorSelect();
}

async function saveTiposTrabajadorOrden() {
  const list = document.getElementById("tipos-trabajador-list");
  const msgEl = document.getElementById("tipos-trabajador-msg");
  const btn = document.getElementById("btn-save-tipos-trabajador-orden");
  const items = [...list.querySelectorAll(".tipo-item")];
  btn.disabled = true;
  btn.textContent = "Guardando...";
  if (msgEl) { msgEl.textContent = ""; msgEl.className = "form-msg"; }
  const client = window.supabaseClient;
  if (!client) {
    btn.disabled = false;
    btn.textContent = "Guardar orden";
    return;
  }
  try {
    for (let i = 0; i < items.length; i++) {
      const { error } = await client
        .schema("contratos")
        .from("tipos_trabajador")
        .update({ orden: i + 1 })
        .eq("id_tipo_trabajador", items[i].dataset.id);
      if (error) throw error;
    }
    if (msgEl) { msgEl.textContent = "Orden guardado correctamente."; msgEl.classList.add("form-msg--success"); }
    loadTiposTrabajadorSelect();
  } catch (err) {
    if (msgEl) { msgEl.textContent = `Error al guardar: ${err.message}`; msgEl.classList.add("form-msg--error"); }
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar orden";
  }
}

function setupConfigTiposTrabajador() {
  const addBtn = document.getElementById("btn-add-tipo-trabajador");
  const saveBtn = document.getElementById("btn-save-tipos-trabajador-orden");
  const input = document.getElementById("nuevo-tipo-trabajador");
  const list = document.getElementById("tipos-trabajador-list");

  if (addBtn) addBtn.addEventListener("click", addTipoTrabajador);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addTipoTrabajador(); }
    });
  }
  if (saveBtn) saveBtn.addEventListener("click", saveTiposTrabajadorOrden);
  if (list) {
    list.addEventListener("click", async (e) => {
      const btn = e.target.closest(".tipo-delete-btn");
      if (!btn) return;
      const id = btn.dataset.id;
      const client = window.supabaseClient;
      if (!client) return;
      const msgEl = document.getElementById("tipos-trabajador-msg");
      const { error } = await client
        .schema("contratos")
        .from("tipos_trabajador")
        .delete()
        .eq("id_tipo_trabajador", id);
      if (error) {
        if (msgEl) { msgEl.textContent = `Error al eliminar: ${error.message}`; msgEl.classList.add("form-msg--error"); }
      } else {
        await loadConfigTiposTrabajador();
        loadTiposTrabajadorSelect();
      }
    });
  }
}

// ---- Horas convenio ----

let _editingConvenioId = null;

async function loadConvenios() {
  const container = document.getElementById("convenios-list");
  if (!container) return;
  container.innerHTML = '<p class="tipos-list-loading">Cargando...</p>';
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client
    .schema("contratos")
    .from("convenios")
    .select("id_convenio, descripcion_convenio, horas_convenio, vigencia_convenio")
    .order("id_convenio", { ascending: true });
  if (error) {
    container.innerHTML = `<p class="tipos-list-empty">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  renderConvenios(data || []);
}

function renderConvenios(list) {
  const container = document.getElementById("convenios-list");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = '<p class="tipos-list-empty">No hay convenios. Crea uno nuevo.</p>';
    return;
  }
  list.forEach((c) => {
    const card = document.createElement("div");
    card.className = "setting-card";
    card.innerHTML = `
      <div class="setting-card__info">
        <span class="setting-card__name">${escapeHtml(c.descripcion_convenio)}</span>
        <span class="setting-card__meta">Horas: <strong>${c.horas_convenio}</strong> &nbsp;&bull;&nbsp; Vigencia: ${escapeHtml(c.vigencia_convenio ?? "-")}</span>
      </div>
      <div class="setting-card__actions">
        <button type="button" class="setting-edit-btn" data-id="${c.id_convenio}" title="Editar">✏️</button>
        <button type="button" class="setting-delete-btn" data-id="${c.id_convenio}" title="Eliminar">🗑</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openConvenioForm(convenio) {
  _editingConvenioId = convenio ? convenio.id_convenio : null;
  const wrapper = document.getElementById("convenios-form-wrapper");
  const title = document.getElementById("convenios-form-title");
  document.getElementById("cv-descripcion").value = convenio ? convenio.descripcion_convenio : "";
  document.getElementById("cv-horas").value = convenio ? convenio.horas_convenio : "";
  document.getElementById("cv-vigencia").value = convenio ? convenio.vigencia_convenio : "";
  document.getElementById("convenios-form-msg").textContent = "";
  document.getElementById("convenios-form-msg").className = "form-msg";
  title.textContent = convenio ? "Editar convenio" : "Nuevo convenio";
  wrapper.classList.remove("is-hidden");
  document.getElementById("cv-descripcion").focus();
}

function closeConvenioForm() {
  _editingConvenioId = null;
  document.getElementById("convenios-form-wrapper").classList.add("is-hidden");
}

async function saveConvenio() {
  const msgEl = document.getElementById("convenios-form-msg");
  msgEl.textContent = "";
  msgEl.className = "form-msg";
  const descripcion = document.getElementById("cv-descripcion").value.trim();
  const horas = parseFloat(document.getElementById("cv-horas").value);
  const vigencia = document.getElementById("cv-vigencia").value;
  if (!descripcion) {
    msgEl.textContent = "La descripción es obligatoria.";
    msgEl.classList.add("form-msg--error");
    return;
  }
  if (isNaN(horas) || horas <= 0) {
    msgEl.textContent = "Las horas deben ser un número válido.";
    msgEl.classList.add("form-msg--error");
    return;
  }
  if (!vigencia) {
    msgEl.textContent = "La vigencia es obligatoria.";
    msgEl.classList.add("form-msg--error");
    return;
  }
  const client = window.supabaseClient;
  if (!client) return;
  const btn = document.getElementById("btn-save-convenio");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Tiempo de espera agotado. Inténtalo de nuevo.")), 15000)
    );

    const op = _editingConvenioId
      ? client.schema("contratos").from("convenios")
          .update({ descripcion_convenio: descripcion, horas_convenio: horas, vigencia_convenio: vigencia })
          .eq("id_convenio", _editingConvenioId)
      : client.schema("contratos").from("convenios")
          .insert([{ descripcion_convenio: descripcion, horas_convenio: horas, vigencia_convenio: vigencia }]);

    const { error } = await Promise.race([op, timeout]);

    if (error) {
      msgEl.textContent = `Error: ${error.message}`;
      msgEl.classList.add("form-msg--error");
    } else {
      closeConvenioForm();
      await loadConvenios();
    }
  } catch (err) {
    msgEl.textContent = err.message || "Error inesperado al guardar.";
    msgEl.classList.add("form-msg--error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
}

async function deleteConvenio(id) {
  const pwd = prompt("Introduce la contraseña para eliminar el convenio:");
  if (pwd === null) return;
  if (pwd !== "1234") {
    alert("Contraseña incorrecta. No se ha eliminado el convenio.");
    return;
  }
  const client = window.supabaseClient;
  if (!client) return;
  const { error } = await client.schema("contratos").from("convenios").delete().eq("id_convenio", id);
  if (!error) await loadConvenios();
}

function setupConfigConvenios() {
  const newBtn = document.getElementById("btn-new-convenio");
  const cancelBtn = document.getElementById("btn-cancel-convenio");
  const saveBtn = document.getElementById("btn-save-convenio");
  const list = document.getElementById("convenios-list");
  if (newBtn) newBtn.addEventListener("click", () => openConvenioForm(null));
  if (cancelBtn) cancelBtn.addEventListener("click", closeConvenioForm);
  if (saveBtn) saveBtn.addEventListener("click", saveConvenio);
  if (list) {
    list.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".setting-edit-btn");
      const delBtn = e.target.closest(".setting-delete-btn");
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const client = window.supabaseClient;
        const { data } = await client.schema("contratos").from("convenios")
          .select("*").eq("id_convenio", id).single();
        if (data) openConvenioForm(data);
      }
      if (delBtn) {
        await deleteConvenio(Number(delBtn.dataset.id));
      }
    });
  }
}

// ---- Tablas de trabajadores por pestaña ----

const TAB_COLUMNS = ["Nombre y apellidos", "Empresa", "Fecha inicio", "Tipo trabajador", "Tipo contrato", "Jornada"];

function renderWorkersTable(wrapperId, rows, actionLabel, actionCallback) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  if (!rows || rows.length === 0) {
    wrapper.innerHTML = '<p class="workers-table-empty">No hay registros.</p>';
    return;
  }
  const table = document.createElement("table");
  table.className = "workers-table";
  table.innerHTML = `
    <thead>
      <tr>
        ${TAB_COLUMNS.map(c => `<th>${c}</th>`).join("")}
        ${actionLabel ? "<th>Acción</th>" : ""}
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const w = row.alta_trabajadores || {};
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(w.nombre_y_apellidos ?? "-")}</td>
      <td>${escapeHtml(w.empresa ?? "-")}</td>
      <td>${escapeHtml(w.fecha_inicio ?? "-")}</td>
      <td>${escapeHtml(w.tipo_trabajador ?? "-")}</td>
      <td>${escapeHtml(w.tipo_contrato ?? "-")}</td>
      <td>${escapeHtml(w.jornada != null ? String(w.jornada) : "-")}</td>
      ${actionLabel ? `<td><button type="button" class="btn-primary btn-sm workers-table-action" data-estado-id="${row.id}">✔ ${escapeHtml(actionLabel)}</button></td>` : "<td>-</td>"}
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.innerHTML = "";
  wrapper.appendChild(table);
  if (actionCallback) {
    wrapper.addEventListener("click", (e) => {
      const btn = e.target.closest(".workers-table-action");
      if (!btn) return;
      actionCallback(Number(btn.dataset.estadoId), btn);
    }, { once: true });
  }
}

async function loadTabEstados(wrapperId, filters, actionLabel, actionField) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  wrapper.innerHTML = '<p class="workers-table-loading">Cargando...</p>';
  const client = window.supabaseClient;
  if (!client) { wrapper.innerHTML = '<p class="workers-table-empty">Cliente no disponible.</p>'; return; }

  let query = client
    .schema("contratos")
    .from("estados")
    .select("id, id_trabajador, registrado, contrato_fdo, ss, registro_contrato, carpeta, alta_trabajadores(id, nombre_y_apellidos, empresa, fecha_inicio, tipo_trabajador, tipo_contrato, jornada)");

  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { data, error } = await query.order("id_trabajador", { ascending: false });

  if (error) {
    wrapper.innerHTML = `<p class="workers-table-empty">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const callback = actionField ? async (estadoId, btn) => {
    btn.disabled = true;
    btn.textContent = "Guardando...";
    const { error: upErr } = await client
      .schema("contratos")
      .from("estados")
      .update({ [actionField]: true })
      .eq("id", estadoId);
    if (upErr) { btn.disabled = false; btn.textContent = `✔ ${actionLabel}`; alert(`Error: ${upErr.message}`); }
    else loadTabEstados(wrapperId, filters, actionLabel, actionField);
  } : null;

  renderWorkersTable(wrapperId, data, actionLabel, callback);
}

function loadFirmaContratoTab() {
  loadTabEstados("firma-contrato-table-wrapper", { contrato_fdo: false }, "Marcar firmado", "contrato_fdo");
}

function loadAltaSSTab() {
  loadTabEstados("alta-ss-table-wrapper", { ss: false }, "Marcar SS hecha", "ss");
}

function loadRegistroContratoTab() {
  // Mostrar cuando registrado=true, contrato_fdo=true, ss=true, registro_contrato=false
  const wrapper = document.getElementById("registro-contrato-table-wrapper");
  if (!wrapper) return;
  wrapper.innerHTML = '<p class="workers-table-loading">Cargando...</p>';
  const client = window.supabaseClient;
  if (!client) { wrapper.innerHTML = '<p class="workers-table-empty">Cliente no disponible.</p>'; return; }

  client
    .schema("contratos")
    .from("estados")
    .select("id, id_trabajador, alta_trabajadores(id, nombre_y_apellidos, empresa, fecha_inicio, tipo_trabajador, tipo_contrato, jornada)")
    .eq("registrado", true)
    .eq("contrato_fdo", true)
    .eq("ss", true)
    .eq("registro_contrato", false)
    .order("id_trabajador", { ascending: false })
    .then(({ data, error }) => {
      if (error) { wrapper.innerHTML = `<p class="workers-table-empty">Error: ${escapeHtml(error.message)}</p>`; return; }
      renderWorkersTable("registro-contrato-table-wrapper", data, "Marcar registrado", async (estadoId, btn) => {
        btn.disabled = true;
        btn.textContent = "Guardando...";
        const { error: upErr } = await client.schema("contratos").from("estados").update({ registro_contrato: true }).eq("id", estadoId);
        if (upErr) { btn.disabled = false; btn.textContent = "✔ Marcar registrado"; alert(`Error: ${upErr.message}`); }
        else loadRegistroContratoTab();
      });
    });
}

function loadCarpetaTab() {
  loadTabEstados("carpeta-table-wrapper", { registrado: true, carpeta: false }, "Marcar carpeta lista", "carpeta");
}

function loadCerradoTab() {
  loadTabEstados("cerrado-table-wrapper", { carpeta: true }, null, null);
}

function setupSidebar() {
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      if (section) {
        showInicioSection(section);
      }
    });
  });

  const configButton = document.getElementById("tab-configuracion");
  configButton.addEventListener("click", () => {
    showView("configuracion");
    showConfigMenu();
  });
}

function setupConfigCards() {
  const cards = document.querySelectorAll(".emesa-config-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;
      if (target) {
        showView("configuracion");
        showConfigSection(target);
      }
    });
  });
}

// ---- Configuración App ----

let _configAppColumnasSeccActual = null;

function showConfigAppMenu() {
  document.getElementById("config-app-menu").classList.remove("is-hidden");
  document.getElementById("config-app-columnas").classList.add("is-hidden");
  document.getElementById("config-app-globos").classList.add("is-hidden");
  updateBreadcrumb("config-app");
}

function showConfigAppColumnas(seccion) {
  document.getElementById("config-app-menu").classList.add("is-hidden");
  document.getElementById("config-app-columnas").classList.remove("is-hidden");
  document.getElementById("config-app-globos").classList.add("is-hidden");
  const sec = APP_SECCIONES.find(s => s.id === seccion);
  document.getElementById("config-app-columnas-title").textContent =
    "Columnas — " + (sec ? sec.label : seccion);
  _configAppColumnasSeccActual = seccion;
  loadAppColumnas(seccion);
  updateBreadcrumb("config-app-col-" + seccion);
}

function showConfigAppGlobos() {
  document.getElementById("config-app-menu").classList.add("is-hidden");
  document.getElementById("config-app-columnas").classList.add("is-hidden");
  document.getElementById("config-app-globos").classList.remove("is-hidden");
  loadAppGlobos();
  updateBreadcrumb("config-app-globos");
}

async function loadAppColumnas(seccion) {
  const list = document.getElementById("config-app-columnas-list");
  const msg  = document.getElementById("config-app-columnas-msg");
  list.innerHTML = '<li class="tipos-list-loading">Cargando...</li>';
  msg.textContent = "";
  msg.className = "form-msg";

  const client = window.supabaseClient;
  if (!client) {
    list.innerHTML = '<li class="tipos-list-empty">Cliente no disponible.</li>';
    return;
  }

  // 1. Columnas reales vía RPC
  const { data: allCols, error: rpcErr } = await client
    .schema("contratos")
    .rpc("get_columnas_alta_trabajadores");

  const columnasBD = (rpcErr || !allCols)
    ? ["nombre_y_apellidos","empresa","fecha_inicio","tipo_trabajador","tipo_contrato","jornada"]
        .map((c, i) => ({ campo_db: c, tipo_dato: "text", posicion_original: i + 1 }))
    : allCols;

  // 2. Preferencias guardadas
  const { data: prefs } = await client
    .schema("contratos")
    .from("config_columnas")
    .select("*")
    .eq("seccion", seccion);

  const prefsMap = {};
  (prefs || []).forEach(p => { prefsMap[p.campo_db] = p; });

  // 3. Merge: visibles primero (por orden), luego ocultas (por posición original)
  const merged = columnasBD.map((col, idx) => {
    const pref = prefsMap[col.campo_db] || {};
    return {
      campo_db:  col.campo_db,
      etiqueta:  pref.etiqueta != null ? pref.etiqueta : col.campo_db,
      orden:     pref.orden    != null ? pref.orden    : 999,
      visible:   pref.visible  != null ? pref.visible  : false,
      posOrig:   col.posicion_original || idx + 1,
    };
  }).sort((a, b) => {
    if (a.visible && !b.visible) return -1;
    if (!a.visible && b.visible) return 1;
    if (a.visible)  return a.orden   - b.orden;
    return a.posOrig - b.posOrig;
  });

  renderAppColumnasList(merged);
}

function renderAppColumnasList(columnas) {
  const list = document.getElementById("config-app-columnas-list");
  list.innerHTML = "";
  if (!columnas.length) {
    list.innerHTML = '<li class="tipos-list-empty">No hay columnas disponibles.</li>';
    return;
  }
  columnas.forEach(col => {
    const li = document.createElement("li");
    li.className = "tipo-item config-col-item";
    li.draggable = true;
    li.dataset.campo = col.campo_db;
    li.innerHTML = `
      <span class="tipo-drag-handle" aria-hidden="true">⠇</span>
      <label class="config-col-visible-label" title="Visible">
        <input type="checkbox" class="config-col-visible" ${col.visible ? "checked" : ""}>
      </label>
      <input type="text" class="config-col-etiqueta" value="${escapeHtml(col.etiqueta)}" placeholder="${escapeHtml(col.campo_db)}" aria-label="Etiqueta">
      <span class="config-col-field-badge">${escapeHtml(col.campo_db)}</span>
    `;
    list.appendChild(li);
  });
  setupDragAndDrop(list);
}

async function saveAppColumnas() {
  const list    = document.getElementById("config-app-columnas-list");
  const msg     = document.getElementById("config-app-columnas-msg");
  const btn     = document.getElementById("btn-save-app-columnas");
  const seccion = _configAppColumnasSeccActual;
  if (!seccion) return;

  btn.disabled = true;
  btn.textContent = "Guardando...";
  msg.textContent = "";
  msg.className = "form-msg";

  const client = window.supabaseClient;
  if (!client) {
    msg.textContent = "Error: cliente no disponible.";
    msg.classList.add("form-msg--error");
    btn.disabled = false;
    btn.textContent = "Guardar";
    return;
  }

  const rows = [...list.querySelectorAll(".config-col-item")].map((li, idx) => ({
    seccion,
    campo_db: li.dataset.campo,
    etiqueta: li.querySelector(".config-col-etiqueta").value.trim() || li.dataset.campo,
    orden:    idx + 1,
    visible:  li.querySelector(".config-col-visible").checked,
  }));

  try {
    const { error } = await client
      .schema("contratos")
      .from("config_columnas")
      .upsert(rows, { onConflict: "seccion,campo_db" });
    if (error) throw error;
    msg.textContent = "Guardado correctamente.";
    msg.classList.add("form-msg--success");
  } catch (err) {
    msg.textContent = `Error: ${err.message}`;
    msg.classList.add("form-msg--error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
}

async function loadAppGlobos() {
  const container = document.getElementById("config-app-globos-list");
  const msg       = document.getElementById("config-app-globos-msg");
  container.innerHTML = '<p class="workers-table-loading">Cargando...</p>';
  msg.textContent = "";
  msg.className = "form-msg";

  const client = window.supabaseClient;
  if (!client) {
    container.innerHTML = '<p class="workers-table-empty">Cliente no disponible.</p>';
    return;
  }

  const { data, error } = await client
    .schema("contratos")
    .from("config_globos")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="workers-table-empty">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }

  renderGlobosEditor(data || []);
}

function renderGlobosEditor(rows) {
  const container = document.getElementById("config-app-globos-list");
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = '<p class="workers-table-empty">No hay secciones configuradas.</p>';
    return;
  }

  rows.forEach(row => {
    const secLabel = APP_SECCIONES.find(s => s.id === row.seccion)?.label || row.seccion;

    const estadoOpts = ESTADOS_CAMPOS.map(o =>
      `<option value="${o.value}" ${(row.campo_estado || "") === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`
    ).join("");

    const fechaOpts = FECHA_CAMPOS.map(o =>
      `<option value="${o.value}" ${(row.campo_fecha || "") === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`
    ).join("");

    const filtroOpts = FILTRO_FECHA_OPTS.map(o =>
      `<option value="${o.value}" ${row.filtro_fecha === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`
    ).join("");

    const div = document.createElement("div");
    div.className = "globo-config-item";
    div.dataset.id      = row.id;
    div.dataset.seccion = row.seccion;
    div.innerHTML = `
      <div class="globo-config-header">
        <label class="globo-activo-label">
          <input type="checkbox" class="globo-activo" ${row.activo ? "checked" : ""}>
          <strong>${escapeHtml(secLabel)}</strong>
        </label>
      </div>
      <div class="globo-config-body">
        <div class="form-field">
          <label>Descripción</label>
          <input type="text" class="globo-descripcion" value="${escapeHtml(row.descripcion || "")}" placeholder="Descripción del contador..." maxlength="200">
        </div>
        <div class="form-grid globo-config-grid">
          <div class="form-field">
            <label>Campo de estado</label>
            <select class="globo-campo-estado">${estadoOpts}</select>
          </div>
          <div class="form-field">
            <label>Valor buscado</label>
            <select class="globo-valor-estado">
              <option value="false" ${!row.valor_estado ? "selected" : ""}>false — pendiente</option>
              <option value="true"  ${row.valor_estado  ? "selected" : ""}>true — hecho</option>
            </select>
          </div>
          <div class="form-field">
            <label>Campo de fecha</label>
            <select class="globo-campo-fecha">${fechaOpts}</select>
          </div>
          <div class="form-field">
            <label>Filtro de fecha</label>
            <select class="globo-filtro-fecha">${filtroOpts}</select>
          </div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

async function saveAppGlobos() {
  const container = document.getElementById("config-app-globos-list");
  const msg       = document.getElementById("config-app-globos-msg");
  const btn       = document.getElementById("btn-save-app-globos");

  btn.disabled = true;
  btn.textContent = "Guardando...";
  msg.textContent = "";
  msg.className = "form-msg";

  const client = window.supabaseClient;
  if (!client) {
    msg.textContent = "Error: cliente no disponible.";
    msg.classList.add("form-msg--error");
    btn.disabled = false;
    btn.textContent = "Guardar";
    return;
  }

  const rows = [...container.querySelectorAll(".globo-config-item")].map(item => ({
    id:           Number(item.dataset.id),
    seccion:      item.dataset.seccion,
    activo:       item.querySelector(".globo-activo").checked,
    descripcion:  item.querySelector(".globo-descripcion").value.trim(),
    campo_estado: item.querySelector(".globo-campo-estado").value || null,
    valor_estado: item.querySelector(".globo-valor-estado").value === "true",
    campo_fecha:  item.querySelector(".globo-campo-fecha").value  || null,
    filtro_fecha: item.querySelector(".globo-filtro-fecha").value,
  }));

  try {
    const { error } = await client
      .schema("contratos")
      .from("config_globos")
      .upsert(rows, { onConflict: "seccion" });
    if (error) throw error;
    msg.textContent = "Guardado correctamente.";
    msg.classList.add("form-msg--success");
  } catch (err) {
    msg.textContent = `Error: ${err.message}`;
    msg.classList.add("form-msg--error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
}

function setupConfigApp() {
  const appMenu = document.getElementById("config-app-menu");
  if (appMenu) {
    appMenu.addEventListener("click", e => {
      const card = e.target.closest("[data-appconfig]");
      if (!card) return;
      const target = card.dataset.appconfig;
      if (target === "globos") showConfigAppGlobos();
      else showConfigAppColumnas(target);
    });
  }
  const btnCols   = document.getElementById("btn-save-app-columnas");
  const btnGlobos = document.getElementById("btn-save-app-globos");
  if (btnCols)   btnCols.addEventListener("click", saveAppColumnas);
  if (btnGlobos) btnGlobos.addEventListener("click", saveAppGlobos);
}

function setupBreadcrumb() {
  breadcrumbContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".breadcrumb-clickable");
    if (!button) return;
    navigateToBreadcrumb(button.dataset.target);
  });
}

function hhmmToDecimal(value) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return Math.round((h + m / 60) * 100) / 100;
}

function updateJornadaCoeficiente() {
  const input = document.getElementById("at-jornada");
  const coefDisplay = document.getElementById("at-jornada-coeficiente");
  const convenioSelect = document.getElementById("at-convenio");
  if (!input || !coefDisplay || !convenioSelect) return;
  const dec = hhmmToDecimal(input.value);
  const selectedOpt = convenioSelect.options[convenioSelect.selectedIndex];
  const horasConvenio = selectedOpt ? parseFloat(selectedOpt.dataset.horas) : NaN;
  if (dec !== null && !isNaN(horasConvenio) && horasConvenio > 0) {
    const coef = dec / horasConvenio;
    coefDisplay.textContent = `(coef. ${coef.toFixed(3)})`;
    coefDisplay.classList.add("jornada-decimal--valid");
  } else {
    coefDisplay.textContent = "";
    coefDisplay.classList.remove("jornada-decimal--valid");
  }
}

function setupJornadaInput() {
  const input = document.getElementById("at-jornada");
  const display = document.getElementById("at-jornada-decimal");
  const convenioSelect = document.getElementById("at-convenio");
  if (!input || !display) return;
  input.addEventListener("input", () => {
    const dec = hhmmToDecimal(input.value);
    display.textContent = dec !== null ? `${dec.toFixed(2)} h` : "";
    display.classList.toggle("jornada-decimal--valid", dec !== null);
    updateJornadaCoeficiente();
  });
  if (convenioSelect) {
    convenioSelect.addEventListener("change", updateJornadaCoeficiente);
  }
}

function setupAltaTrabajadoresForm() {
  const form = document.getElementById("form-alta-trabajador");
  if (!form) return;

  syncEmpresaSelect(currentCompany);
  setupJornadaInput();

  // Lógica "Otros" en tipo de trabajador
  const tipoTrabajadorSelect = document.getElementById("at-tipo-trabajador");
  const tipoTrabajadorOtros = document.getElementById("at-tipo-trabajador-otros");
  if (tipoTrabajadorSelect && tipoTrabajadorOtros) {
    tipoTrabajadorSelect.addEventListener("change", () => {
      tipoTrabajadorOtros.style.display = tipoTrabajadorSelect.value === "otros" ? "" : "none";
      if (tipoTrabajadorSelect.value !== "otros") tipoTrabajadorOtros.value = "";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msgEl = document.getElementById("alta-trabajador-msg");
    msgEl.className = "form-msg";
    msgEl.textContent = "";

    const tipoTrabVal = tipoTrabajadorSelect ? tipoTrabajadorSelect.value : "";
    const tipoTrabajador = tipoTrabVal === "otros"
      ? (tipoTrabajadorOtros ? tipoTrabajadorOtros.value.trim() : "")
      : tipoTrabVal;

    const data = {
      nombre_y_apellidos: form.nombre_y_apellidos.value.trim(),
      empresa: currentCompany,
      tipo_trabajador: tipoTrabajador || null,
      tipo_contrato: form.tipo_contrato.value.trim() || null,
      jornada: hhmmToDecimal(form.jornada.value) ?? null,
      fecha_inicio: form.fecha_inicio.value || null,
      id_convenio: form.id_convenio.value ? Number(form.id_convenio.value) : null,
    };

    if (!data.nombre_y_apellidos) {
      msgEl.textContent = "El campo Nombre y apellidos es obligatorio.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (!data.fecha_inicio) {
      msgEl.textContent = "La fecha de inicio es obligatoria.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (!data.tipo_trabajador) {
      msgEl.textContent = "El tipo de trabajador es obligatorio.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (tipoTrabVal === "otros" && !data.tipo_trabajador) {
      msgEl.textContent = "Especifica el tipo de trabajador en el campo libre.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (!data.tipo_contrato) {
      msgEl.textContent = "El tipo de contrato es obligatorio.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (!data.id_convenio) {
      msgEl.textContent = "El convenio es obligatorio.";
      msgEl.classList.add("form-msg--error");
      return;
    }
    if (data.jornada === null) {
      msgEl.textContent = "La jornada es obligatoria y debe tener formato HH:MM.";
      msgEl.classList.add("form-msg--error");
      return;
    }

    const client = window.supabaseClient;
    if (!client) {
      msgEl.textContent = "Error: cliente Supabase no disponible.";
      msgEl.classList.add("form-msg--error");
      return;
    }

    const submitBtn = form.querySelector("[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Tiempo de espera agotado. Inténtalo de nuevo.")), 8000)
      );

      const insertPromise = client
        .schema("contratos")
        .from("alta_trabajadores")
        .insert([data])
        .select("id")
        .single();

      const { data: inserted, error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) {
        msgEl.textContent = `Error al guardar: ${error.message}`;
        msgEl.classList.add("form-msg--error");
        return;
      }

      if (!inserted || !inserted.id) {
        msgEl.textContent = "No se pudo guardar el trabajador. Comprueba los permisos.";
        msgEl.classList.add("form-msg--error");
        return;
      }

      // Crear registro de estados con registrado = true
      const estadosPromise = client
        .schema("contratos")
        .from("estados")
        .insert([{ id_trabajador: inserted.id, registrado: true }]);

      const { error: estadosError } = await Promise.race([estadosPromise, new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout al crear estados.")), 8000)
      )]);

      if (estadosError) {
        msgEl.textContent = `Trabajador guardado pero error en estados: ${estadosError.message}`;
        msgEl.classList.add("form-msg--error");
        return;
      }

      msgEl.textContent = "Trabajador registrado correctamente.";
      msgEl.classList.add("form-msg--success");
      form.reset();
      syncEmpresaSelect(currentCompany);
    } catch (err) {
      msgEl.textContent = err.message || "Error inesperado al guardar.";
      msgEl.classList.add("form-msg--error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Guardar trabajador";
    }
  });
}

function setupCompanyLogoToggle() {
  const logo = document.getElementById("sidebarLogo");
  if (!logo) return;

  const storedCompany = localStorage.getItem("la_company");
  if (storedCompany === "AL" || storedCompany === "LA") {
    logo.dataset.company = storedCompany;
    currentCompany = storedCompany;
  }

  const applyCompany = (company) => {
    const laLogo = logo.dataset.laLogo;
    const alLogo = logo.dataset.alLogo;
    const nextSrc = company === "AL" ? alLogo : laLogo;
    logo.src = nextSrc;
    logo.dataset.company = company;
    currentCompany = company;
    localStorage.setItem("la_company", company);
    applyBreadcrumbTheme(company);
    syncEmpresaSelect(company);
    window.dispatchEvent(new CustomEvent("companyChange", { detail: { company } }));
  };

  applyCompany(logo.dataset.company || "LA");

  logo.addEventListener("dblclick", () => {
    const nextCompany = logo.dataset.company === "AL" ? "LA" : "AL";
    applyCompany(nextCompany);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupConfigCards();
  setupConfigApp();
  setupBreadcrumb();
  setupAltaTrabajadoresForm();
  setupConfigContratos();
  setupConfigConvenios();
  setupConfigTiposTrabajador();
  setupCompanyLogoToggle();
  applyBreadcrumbTheme(currentCompany);
  ensureInitialState("inicio");
  window.addEventListener("authSuccess", () => {
    loadTiposContrato();
    loadConveniosSelect();
    loadTiposTrabajadorSelect();
  });
});
