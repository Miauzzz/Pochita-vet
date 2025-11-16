// src/lib/authHelpers.js

const STORAGE_KEY_JWT = "jwt";
const STORAGE_KEY_USER = "user";

/** Junta User (plugin) + Usuario (collection) en un solo objeto */
export function buildAppUser(profile, usuario) {
  return { authUser: profile, usuario };
}

/**
 * Guarda la sesión.
 * persist = true  -> localStorage (mantener sesión iniciada)
 * persist = false -> sessionStorage (se pierde al cerrar pestaña/navegador)
 */
export function saveSession(jwt, appUser, persist = true) {
  const storage = persist ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY_JWT, jwt);
  storage.setItem(STORAGE_KEY_USER, JSON.stringify(appUser));
}

/** Intenta cargar sesión, primero de localStorage, luego de sessionStorage */
export function loadSession() {
  // 1) Sesión persistente
  let raw = localStorage.getItem(STORAGE_KEY_USER);
  let jwt = localStorage.getItem(STORAGE_KEY_JWT);
  if (jwt && raw) {
    try {
      const appUser = JSON.parse(raw);
      return { jwt, appUser, persist: true };
    } catch {
      // seguimos abajo
    }
  }

  // 2) Sesión temporal (solo pestaña actual)
  raw = sessionStorage.getItem(STORAGE_KEY_USER);
  jwt = sessionStorage.getItem(STORAGE_KEY_JWT);
  if (jwt && raw) {
    try {
      const appUser = JSON.parse(raw);
      return { jwt, appUser, persist: false };
    } catch {
      return null;
    }
  }

  return null;
}

/** Limpia sesión de ambos storages */
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY_JWT);
  localStorage.removeItem(STORAGE_KEY_USER);
  sessionStorage.removeItem(STORAGE_KEY_JWT);
  sessionStorage.removeItem(STORAGE_KEY_USER);
}

/** Logout reutilizable */
export function logout(redirect = "/login") {
  try {
    clearSession();
  } catch {}
  window.location.href = redirect;
}

/** ¿Hay sesión activa? */
export function isAuthenticated() {
  return !!loadSession();
}

/** Redirige según tipo_usuario de la collection "usuarios" */
export function getRoleAndRedirect(appUser) {
  if (!appUser || !appUser.usuario) return;

  const role = appUser.usuario.tipo_usuario?.toLowerCase();
  const valid = ["cliente", "recepcionista", "veterinario"];
  if (!role || !valid.includes(role)) return;

  const redirectUrl = `/dashboard/${role}`;
  window.location.href = redirectUrl;
}

/**
 * Protege una página del dashboard por rol.
 * allowedRoles: ['cliente'], ['veterinario'], etc.
 * - Si no hay sesión -> /login
 * - Si hay sesión pero rol distinto -> /dashboard/{rol_real}
 */
export function requireRole(allowedRoles = []) {
  const session = loadSession();
  if (!session || !session.appUser || !session.appUser.usuario) {
    window.location.href = "/login";
    return;
  }

  const role = session.appUser.usuario.tipo_usuario?.toLowerCase();
  const valid = ["cliente", "recepcionista", "veterinario"];
  if (!role || !valid.includes(role)) {
    clearSession();
    window.location.href = "/login";
    return;
  }

  if (!Array.isArray(allowedRoles)) allowedRoles = [allowedRoles];
  if (!allowedRoles.includes(role)) {
    // Tiene sesión pero no el rol correcto: lo mandamos a SU dashboard real
    window.location.href = `/dashboard/${role}`;
  }
}
