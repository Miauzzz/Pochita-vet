// src/lib/authHelpers.js

const STORAGE_KEY_JWT = "jwt";
const STORAGE_KEY_USER = "user";

/** Junta User (plugin) + Usuario (collection) en un solo objeto */
export function buildAppUser(profile, usuario) {
  const appUser = { authUser: profile, usuario };
  console.log("buildAppUser creado:", appUser);
  return appUser;
}

/**
 * Guarda la sesión.
 * persist = true  -> localStorage (mantener sesión iniciada)
 * persist = false -> sessionStorage (se pierde al cerrar pestaña/navegador)
 */
export function saveSession(jwt, appUser, persist = true) {
  const storage = persist ? localStorage : sessionStorage;
  const storageType = persist ? "localStorage" : "sessionStorage";
  
  console.log("Guardando sesión en", storageType);
  console.log("JWT:", jwt ? jwt.substring(0, 20) + "..." : "null");
  console.log("appUser:", appUser);
  
  storage.setItem(STORAGE_KEY_JWT, jwt);
  storage.setItem(STORAGE_KEY_USER, JSON.stringify(appUser));
  
  console.log("Sesión guardada correctamente");
}

/** Intenta cargar sesión, primero de localStorage, luego de sessionStorage */
export function loadSession() {
  console.log("Intentando cargar sesión...");
  
  // 1) Sesión persistente
  let raw = localStorage.getItem(STORAGE_KEY_USER);
  let jwt = localStorage.getItem(STORAGE_KEY_JWT);
  if (jwt && raw) {
    try {
      const appUser = JSON.parse(raw);
      console.log("Sesión cargada desde localStorage:", appUser);
      return { jwt, appUser, persist: true };
    } catch (err) {
      console.error("Error parseando sesión de localStorage:", err);
    }
  }

  // 2) Sesión temporal (solo pestaña actual)
  raw = sessionStorage.getItem(STORAGE_KEY_USER);
  jwt = sessionStorage.getItem(STORAGE_KEY_JWT);
  if (jwt && raw) {
    try {
      const appUser = JSON.parse(raw);
      console.log("Sesión cargada desde sessionStorage:", appUser);
      return { jwt, appUser, persist: false };
    } catch (err) {
      console.error("Error parseando sesión de sessionStorage:", err);
      return null;
    }
  }

  console.log("No se encontró sesión");
  return null;
}

/** Limpia sesión de ambos storages */
export function clearSession() {
  console.log("Limpiando sesión...");
  localStorage.removeItem(STORAGE_KEY_JWT);
  localStorage.removeItem(STORAGE_KEY_USER);
  sessionStorage.removeItem(STORAGE_KEY_JWT);
  sessionStorage.removeItem(STORAGE_KEY_USER);
  console.log("Sesión limpiada");
}

/** Logout reutilizable */
export function logout(redirect = "/login") {
  console.log("Ejecutando logout, redirigiendo a:", redirect);
  try {
    clearSession();
  } catch (err) {
    console.error("Error al limpiar sesión:", err);
  }
  window.location.href = redirect;
}

/** ¿Hay sesión activa? */
export function isAuthenticated() {
  const hasSession = !!loadSession();
  console.log("isAuthenticated:", hasSession);
  return hasSession;
}

/** Redirige según tipo_usuario de la collection "usuarios" */
export function getRoleAndRedirect(appUser) {
  console.log("getRoleAndRedirect llamado con:", appUser);
  
  if (!appUser || !appUser.usuario) {
    console.error("appUser o appUser.usuario es null/undefined");
    return;
  }

  const role = appUser.usuario.tipo_usuario?.toLowerCase();
  console.log("Rol detectado:", role);
  
  const valid = ["cliente", "recepcionista", "veterinario"];
  if (!role || !valid.includes(role)) {
    console.error("Rol inválido o no encontrado:", role);
    return;
  }

  const redirectUrl = `/dashboard/${role}`;
  console.log("Redirigiendo a:", redirectUrl);
  window.location.href = redirectUrl;
}

/**
 * Protege una página del dashboard por rol.
 * allowedRoles: ['cliente'], ['veterinario'], etc.
 * - Si no hay sesión -> /login
 * - Si hay sesión pero rol distinto -> /dashboard/{rol_real}
 */
export function requireRole(allowedRoles = []) {
  // Prevenir ejecución múltiple
  if (window.__roleCheckInProgress) {
    console.log("requireRole ya en progreso, evitando duplicado");
    return;
  }
  window.__roleCheckInProgress = true;
  
  console.log("requireRole ejecutado, roles permitidos:", allowedRoles);
  
  const session = loadSession();
  if (!session || !session.appUser || !session.appUser.usuario) {
    console.log("Sin sesión, redirigiendo a /login");
    window.location.href = "/login";
    return;
  }

  const role = session.appUser.usuario.tipo_usuario?.toLowerCase();
  const valid = ["cliente", "recepcionista", "veterinario"];
  
  if (!role || !valid.includes(role)) {
    console.warn("Rol inválido en sesión, limpiando y redirigiendo");
    clearSession();
    window.location.href = "/login";
    return;
  }

  if (!Array.isArray(allowedRoles)) {
    allowedRoles = [allowedRoles];
  }
  
  if (!allowedRoles.includes(role)) {
    console.log("Rol", role, "no permitido aquí, redirigiendo a su dashboard");
    window.location.href = `/dashboard/${role}`;
  } else {
    console.log("Acceso permitido para rol:", role);
    window.__roleCheckInProgress = false;
  }
}
