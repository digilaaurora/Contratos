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
  contratos: "Contratos",
  puestos: "Puestos",
  settings: "Settings"
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

function getLabelForTarget(target) {
  if (target === "inicio") return "Inicio";
  if (target === "configuracion") return "Configuracion";
  if (target === "alta-trabajador") return "Añadir trabajador";
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
}

function _hideAllConfigSections() {
  const configContratos = document.getElementById("config-contratos");
  const configSettings = document.getElementById("config-settings");
  if (configContratos) configContratos.classList.add("is-hidden");
  if (configSettings) configSettings.classList.add("is-hidden");
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

  if (sectionKey === "contratos") {
    const el = document.getElementById("config-contratos");
    if (el) el.classList.remove("is-hidden");
    loadConfigContratos();
    updateBreadcrumb("config-contratos");
    return;
  }

  if (sectionKey === "settings") {
    const el = document.getElementById("config-settings");
    if (el) el.classList.remove("is-hidden");
    loadSettings();
    updateBreadcrumb("config-settings");
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

  if (target === "configuracion") {
    showView("configuracion");
    showConfigMenu();
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

// ---- Settings generales ----

let _editingSettingId = null;

async function loadSettings() {
  const container = document.getElementById("settings-list");
  if (!container) return;
  container.innerHTML = '<p class="tipos-list-loading">Cargando...</p>';
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client
    .schema("contratos")
    .from("settings")
    .select("id, nombre, valores, activo, updated_at")
    .order("id", { ascending: true });
  if (error) {
    container.innerHTML = `<p class="tipos-list-empty">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }
  renderSettings(data || []);
}

function renderSettings(list) {
  const container = document.getElementById("settings-list");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = '<p class="tipos-list-empty">No hay configuraciones. Crea una nueva.</p>';
    return;
  }
  list.forEach((s) => {
    const v = s.valores || {};
    const card = document.createElement("div");
    card.className = "setting-card" + (s.activo ? " setting-card--active" : "");
    card.innerHTML = `
      <div class="setting-card__info">
        <span class="setting-card__name">${escapeHtml(s.nombre)}</span>
        <span class="setting-card__meta">Horas: <strong>${v.horas_convenio ?? "-"}</strong> &nbsp;&bull;&nbsp; v${escapeHtml(String(v.version ?? "-"))}</span>
      </div>
      <div class="setting-card__actions">
        <label class="toggle" title="Activar">
          <input type="checkbox" class="toggle__input" data-id="${s.id}" ${s.activo ? "checked" : ""} />
          <span class="toggle__track"></span>
        </label>
        <button type="button" class="setting-edit-btn" data-id="${s.id}" title="Editar">✏️</button>
        <button type="button" class="setting-delete-btn" data-id="${s.id}" title="Eliminar">🗑</button>
      </div>
    `;
    container.appendChild(card);
  });
}

async function toggleSettingActive(id, checked) {
  const client = window.supabaseClient;
  if (!client) return;
  if (!checked) return; // Solo se puede activar, no desactivar directamente
  // Desactivar todas y luego activar la seleccionada
  await client.schema("contratos").from("settings").update({ activo: false }).neq("id", id);
  await client.schema("contratos").from("settings").update({ activo: true }).eq("id", id);
  await loadSettings();
}

function openSettingForm(setting) {
  _editingSettingId = setting ? setting.id : null;
  const wrapper = document.getElementById("settings-form-wrapper");
  const title = document.getElementById("settings-form-title");
  const v = setting ? (setting.valores || {}) : {};
  document.getElementById("s-nombre").value = setting ? setting.nombre : "";
  document.getElementById("s-horas").value = v.horas_convenio ?? "";
  document.getElementById("s-version").value = v.version ?? "";
  document.getElementById("settings-form-msg").textContent = "";
  document.getElementById("settings-form-msg").className = "form-msg";
  title.textContent = setting ? "Editar configuración" : "Nueva configuración";
  wrapper.classList.remove("is-hidden");
  document.getElementById("s-nombre").focus();
}

function closeSettingForm() {
  _editingSettingId = null;
  document.getElementById("settings-form-wrapper").classList.add("is-hidden");
}

async function saveSetting() {
  const msgEl = document.getElementById("settings-form-msg");
  msgEl.textContent = "";
  msgEl.className = "form-msg";
  const nombre = document.getElementById("s-nombre").value.trim();
  const horas = parseFloat(document.getElementById("s-horas").value);
  const version = document.getElementById("s-version").value.trim();
  if (!nombre) {
    msgEl.textContent = "El nombre es obligatorio.";
    msgEl.classList.add("form-msg--error");
    return;
  }
  const client = window.supabaseClient;
  if (!client) return;
  const valores = {};
  if (!isNaN(horas)) valores.horas_convenio = horas;
  if (version) valores.version = version;
  const btn = document.getElementById("btn-save-setting");
  btn.disabled = true;
  btn.textContent = "Guardando...";
  let error;
  if (_editingSettingId) {
    ({ error } = await client.schema("contratos").from("settings")
      .update({ nombre, valores, updated_at: new Date().toISOString() })
      .eq("id", _editingSettingId));
  } else {
    ({ error } = await client.schema("contratos").from("settings")
      .insert([{ nombre, valores, activo: false }]));
  }
  btn.disabled = false;
  btn.textContent = "Guardar";
  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
    msgEl.classList.add("form-msg--error");
  } else {
    closeSettingForm();
    await loadSettings();
  }
}

async function deleteSetting(id) {
  const client = window.supabaseClient;
  if (!client) return;
  const { error } = await client.schema("contratos").from("settings").delete().eq("id", id);
  if (!error) await loadSettings();
}

function setupConfigSettings() {
  const newBtn = document.getElementById("btn-new-setting");
  const cancelBtn = document.getElementById("btn-cancel-setting");
  const saveBtn = document.getElementById("btn-save-setting");
  const list = document.getElementById("settings-list");
  if (newBtn) newBtn.addEventListener("click", () => openSettingForm(null));
  if (cancelBtn) cancelBtn.addEventListener("click", closeSettingForm);
  if (saveBtn) saveBtn.addEventListener("click", saveSetting);
  if (list) {
    list.addEventListener("change", async (e) => {
      const cb = e.target.closest(".toggle__input");
      if (!cb) return;
      await toggleSettingActive(Number(cb.dataset.id), cb.checked);
    });
    list.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".setting-edit-btn");
      const delBtn = e.target.closest(".setting-delete-btn");
      if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const client = window.supabaseClient;
        const { data } = await client.schema("contratos").from("settings").select("*").eq("id", id).single();
        if (data) openSettingForm(data);
      }
      if (delBtn) {
        await deleteSetting(Number(delBtn.dataset.id));
      }
    });
  }
}

function setupSidebar() {
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      if (section) {
        const breadcrumb = section === "alta-trabajador" ? section : undefined;
        showInicioSection(section, breadcrumb);
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

function setupBreadcrumb() {
  breadcrumbContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".breadcrumb-clickable");
    if (!button) return;
    navigateToBreadcrumb(button.dataset.target);
  });
}

function setupAltaTrabajadoresForm() {
  const form = document.getElementById("form-alta-trabajador");
  if (!form) return;

  syncEmpresaSelect(currentCompany);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("alta-trabajador-msg");
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    const data = {
      nombre_y_apellidos: form.nombre_y_apellidos.value.trim(),
      empresa: currentCompany,
      tipo_trabajador: form.tipo_trabajador.value.trim() || null,
      tipo_contrato: form.tipo_contrato.value.trim() || null,
      jornada: form.jornada.value.trim() || null,
      fecha_inicio: form.fecha_inicio.value || null,
      fecha_firma_contrato: form.fecha_firma_contrato.value || null,
      codigo_ncs: form.codigo_ncs.value.trim() || null,
      codigo_fichaje: form.codigo_fichaje.value.trim() || null,
    };

    if (!data.nombre_y_apellidos) {
      msgEl.textContent = "El campo Nombre y apellidos es obligatorio.";
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
      const { error } = await client
        .schema("contratos")
        .from("alta_trabajadores")
        .insert([data]);

      if (error) {
        msgEl.textContent = `Error al guardar: ${error.message}`;
        msgEl.classList.add("form-msg--error");
      } else {
        msgEl.textContent = "Trabajador registrado correctamente.";
        msgEl.classList.add("form-msg--success");
        form.reset();
      }
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
  setupBreadcrumb();
  setupAltaTrabajadoresForm();
  setupConfigContratos();
  setupConfigSettings();
  setupCompanyLogoToggle();
  applyBreadcrumbTheme(currentCompany);
  ensureInitialState("inicio");
  window.addEventListener("authSuccess", () => {
    loadTiposContrato();
  });
});
