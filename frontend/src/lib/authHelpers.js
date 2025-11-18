const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL;

if (!STRAPI_URL) {
  console.error("PUBLIC_STRAPI_URL no está definido en el archivo .env");
  throw new Error("PUBLIC_STRAPI_URL no está configurado. Verifica tu archivo .env");
}

// ========== Funciones de Autenticación ==========

/**
 * Construye el objeto appUser unificando profile (users-permissions) y usuario (collection)
 */
export function buildAppUser(profile, usuario) {
  return {
    profile: {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      confirmed: profile.confirmed,
    },
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      tipo_usuario: usuario.tipo_usuario,
    },
  };
}

/**
 * Guarda la sesión en localStorage o sessionStorage
 */
export function saveSession(jwt, appUser, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('jwt', jwt);
  storage.setItem('appUser', JSON.stringify(appUser));
  console.log('Sesión guardada en', remember ? 'localStorage' : 'sessionStorage');
}

/**
 * Carga la sesión desde localStorage o sessionStorage
 */
export function loadSession() {
  const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
  const appUserStr = localStorage.getItem('appUser') || sessionStorage.getItem('appUser');
  
  if (!jwt || !appUserStr) {
    return null;
  }
  
  try {
    const appUser = JSON.parse(appUserStr);
    return { jwt, appUser };
  } catch (err) {
    console.error('Error al parsear appUser:', err);
    clearSession();
    return null;
  }
}

/**
 * Limpia la sesión de ambos storages
 */
export function clearSession() {
  localStorage.removeItem('jwt');
  localStorage.removeItem('appUser');
  sessionStorage.removeItem('jwt');
  sessionStorage.removeItem('appUser');
  console.log('Sesión limpiada');
}

/**
 * Redirige al dashboard según el tipo de usuario
 */
export function getRoleAndRedirect(appUser) {
  const tipo = appUser?.usuario?.tipo_usuario?.toLowerCase();
  
  console.log('Redirigiendo según tipo:', tipo);
  
  const dashboards = {
    cliente: '/dashboard/cliente',
    veterinario: '/dashboard/veterinario',
    recepcionista: '/dashboard/recepcionista',
  };
  
  const url = dashboards[tipo] || '/login';
  console.log('Redirigiendo a:', url);
  window.location.href = url;
}

/**
 * Cierra sesión y redirige a la página especificada
 */
export function logout(redirectTo = '/login') {
  clearSession();
  console.log('Logout ejecutado, redirigiendo a:', redirectTo);
  window.location.href = redirectTo;
}

/**
 * Requiere un rol específico para acceder a la página
 * Redirige al login si no está autenticado o al dashboard correcto si el rol no coincide
 */
export async function requireRole(allowedRoles = []) {
  const session = loadSession();
  
  if (!session || !session.appUser) {
    console.warn('No hay sesión, redirigiendo a login');
    window.location.href = '/login';
    return;
  }
  
  // Verificar que el usuario aún exista en el backend
  try {
    const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337';
    const response = await fetch(`${STRAPI_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    });
    
    if (!response.ok) {
      console.warn('Usuario no válido en backend, limpiando sesión');
      clearSession();
      window.location.href = '/login';
      return;
    }
    
    const user = await response.json();
    console.log('Usuario verificado en backend:', user.email);
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    clearSession();
    window.location.href = '/login';
    return;
  }
  
  const tipo = session.appUser?.usuario?.tipo_usuario?.toLowerCase();
  
  if (!allowedRoles.includes(tipo)) {
    console.warn(`Rol "${tipo}" no permitido. Roles permitidos:`, allowedRoles);
    getRoleAndRedirect(session.appUser);
  }
}

// ========== Funciones de Disponibilidad ==========


// Obtener todas las disponibilidades
export async function obtenerDisponibilidades() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads?populate=*`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error);
    return [];
  }
}

// Obtener disponibilidad por veterinario
export async function obtenerDisponibilidadPorVeterinario(veterinarioId) {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/disponibilidads?filters[veterinario][id][$eq]=${veterinarioId}&populate=*`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return [];
  }
}

// Obtener disponibilidad por fecha
export async function obtenerDisponibilidadPorFecha(fecha) {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/disponibilidads?filters[fecha][$eq]=${fecha}&populate=*`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return [];
  }
}
