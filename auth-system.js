class ModernAuth {
  constructor() {
    this.userKey = "contratos_user_profile";
    this.supabaseConfig = this.getSupabaseConfig();
    this.init();
  }

  getSupabaseConfig() {
    const env = window.__ENV || {};
    return {
      url: env.SUPABASE_URL || "",
      key: env.SUPABASE_ANON_KEY || ""
    };
  }

  async init() {
    if (!this.supabaseConfig.url || !this.supabaseConfig.key) {
      this.showLoginModal();
      this.showMessage("Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY.", "error");
      return;
    }

    if (!window.supabaseInitialized) {
      const { createClient } = window.supabase;
      window.supabase = createClient(
        this.supabaseConfig.url,
        this.supabaseConfig.key,
        {
          auth: {
            storage: window.localStorage,
            persistSession: true,
            detectSessionInUrl: false,
          }
        }
      );
      window.supabaseClient = window.supabase;
      window.supabaseInitialized = true;
    }

    this.setupModalEventListeners();
    this._setupStorageWatcher();

    // onAuthStateChange es la única fuente de verdad.
    // Maneja INITIAL_SESSION (recarga de página), SIGNED_IN (login nuevo)
    // y TOKEN_REFRESHED, además de SIGNED_OUT.
    window.supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED") &&
        session
      ) {
        // En recarga de página, verificar que el token almacenado es válido.
        // Si está caducado o roto, limpiar y mostrar el login.
        if (event === "INITIAL_SESSION") {
          const { error } = await window.supabase.auth.getUser();
          if (error) {
            await window.supabase.auth.signOut();
            this.showLoginModal();
            return;
          }
        }
        await this._onSignedIn(session);
      } else if (event === "INITIAL_SESSION" && !session) {
        // No hay sesión activa al cargar la página
        this.showLoginModal();
      } else if (event === "SIGNED_OUT") {
        this._onSignedOut();
      }
    });
  }

  // Detecta borrado de storage con la página ya cargada
  _setupStorageWatcher() {
    // Evento storage: se dispara cuando otra pestaña borra el storage,
    // o en algunos navegadores cuando se borra desde DevTools
    window.addEventListener("storage", async (e) => {
      if (e.key === null) {
        // localStorage.clear() fue llamado
        await this._checkSessionAlive();
      }
    });

    // Al recuperar el foco de la pestaña verificamos que la sesión sigue viva
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        await this._checkSessionAlive();
      }
    });
  }

  async _checkSessionAlive() {
    // Solo verificar si ya teníamos sesión activa
    const cached = sessionStorage.getItem(this.userKey);
    if (!cached) return;
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      this._onSignedOut();
    }
  }

  async _onSignedIn(session) {
    const meta = session.user.user_metadata || {};

    // Enriquecer con la tabla usuarios si faltan datos
    let user = {
      email: session.user.email,
      nombre: meta.nombre || null,
      tipo: meta.tipo || null,
      departamento: meta.departamento || null
    };

    if (!user.nombre) {
      const { data: profile } = await window.supabase
        .from("usuarios")
        .select("id, email, nombre, departamento, tipo, descripcion, tutorizado")
        .eq("email", session.user.email)
        .single();
      if (profile) user = { ...user, ...profile };
    }

    sessionStorage.setItem(this.userKey, JSON.stringify(user));
    this._initializeUserWidget(user);
    this.hideLoginModal();
    window.dispatchEvent(new CustomEvent("authSuccess", { detail: user }));
  }

  _onSignedOut() {
    sessionStorage.removeItem(this.userKey);
    const widget = document.getElementById("user-widget");
    if (widget) widget.classList.remove("show");
    this.clearLoginForm();
    this.showLoginModal();
    window.dispatchEvent(new CustomEvent("authLogout"));
  }

  getCurrentUser() {
    try {
      const data = sessionStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  showLoginModal() {
    document.getElementById("login-modal-overlay").classList.add("show");
    this.clearLoginForm();
  }

  hideLoginModal() {
    document.getElementById("login-modal-overlay").classList.remove("show");
  }

  clearLoginForm() {
    const emailEl = document.getElementById("login-modal-email");
    const passEl = document.getElementById("login-modal-password");
    const errorDiv = document.getElementById("login-modal-error");
    if (emailEl) emailEl.value = "";
    if (passEl) passEl.value = "";
    if (errorDiv) errorDiv.style.display = "none";
  }

  _initializeUserWidget(user) {
    const widget = document.getElementById("user-widget");
    const initialsSpan = document.getElementById("user-initials");
    const nameSpan = document.getElementById("user-name");
    if (initialsSpan) initialsSpan.textContent = this._getUserInitials(user);
    if (nameSpan) nameSpan.textContent = user.nombre || user.email || "Usuario";
    if (widget) widget.classList.add("show");
  }

  _getUserInitials(user) {
    const name = (user.nombre || "").trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "US";
    }
    const email = (user.email || "").trim();
    return email ? email[0].toUpperCase() : "US";
  }

  async logout() {
    if (!confirm("¿Estás seguro de que quieres cerrar sesión?")) return;
    await window.supabase.auth.signOut();
  }

  setupModalEventListeners() {
    const form = document.getElementById("login-modal-form");
    if (form) form.addEventListener("submit", (e) => this.handleLoginSubmit(e));
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("login-modal-email").value.trim();
    const password = document.getElementById("login-modal-password").value;
    const loginBtn = document.getElementById("login-modal-btn");
    const errorDiv = document.getElementById("login-modal-error");

    if (!email || !password) {
      if (errorDiv) {
        errorDiv.textContent = "Por favor completa todos los campos";
        errorDiv.style.display = "block";
      }
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = "<span class=\"login-loading\"></span>Verificando...";

    // Limpiar cualquier sesión caducada antes de hacer login nuevo
    await window.supabase.auth.signOut({ scope: "local" });

    const { error } = await window.supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (errorDiv) {
        errorDiv.textContent = "Email o contraseña incorrectos.";
        errorDiv.className = "error-message";
        errorDiv.style.display = "block";
      }
      loginBtn.disabled = false;
      loginBtn.innerHTML = "Iniciar Sesión";
      return;
    }
    // Exito: onAuthStateChange -> _onSignedIn se encarga del resto
  }

  showMessage(text, type) {
    const errorDiv = document.getElementById("login-modal-error");
    if (errorDiv) {
      errorDiv.className = type === "error" ? "error-message" : "success-message";
      errorDiv.textContent = text;
      errorDiv.style.display = "block";
    }
  }
}

function handleLogout() {
  if (window.auth) window.auth.logout();
}

document.addEventListener("DOMContentLoaded", () => {
  window.auth = new ModernAuth();
});