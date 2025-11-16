// src/lib/authAPI.js
// @ts-nocheck

const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL;

// Validación crítica
if (!STRAPI_URL) {
  console.error("PUBLIC_STRAPI_URL no está definido en el archivo .env");
  throw new Error("PUBLIC_STRAPI_URL no está configurado. Verifica tu archivo .env");
}

console.log("STRAPI_URL configurado:", STRAPI_URL);

// ---------- Users & Permissions (cuenta) ----------

/** Registro en el plugin Users & Permissions */
export async function registerUser(fullname, email, password) {
  console.log("Intentando registrar usuario:", email);
  
  const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: fullname, email, password }),
  });

  const data = await res.json();
  console.log("Respuesta de registro:", res.status, data);
  
  if (!res.ok) {
    throw new Error(data.error?.message || data?.message || "Error al registrarse");
  }
  return data;
}

/** Login en el plugin Users & Permissions */
export async function loginUser(identifier, password) {
  console.log("Intentando login con:", identifier);
  
  const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await res.json();
  console.log("Respuesta de login:", res.status, data);
  
  if (!res.ok) {
    throw new Error(data.error?.message || data?.message || "Error al iniciar sesión");
  }
  return data;
}

/** /api/users/me: perfil del plugin */
export async function fetchMe(jwt) {
  console.log("Obteniendo perfil /users/me");
  
  const res = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const profile = await res.json();
  console.log("Perfil obtenido:", profile);
  
  if (!res.ok) {
    throw new Error("No se pudo obtener el perfil del usuario.");
  }

  return profile;
}

// ---------- Collection Usuario (Perfiles de usuarios) ----------

function slugifyNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

/** Crea el registro en la collection "usuarios" como cliente */
export async function createUsuarioCliente(profile, jwt, fullname) {
  const slug = slugifyNombre(fullname);
  console.log("Creando usuario en collection con slug:", slug);

  const body = {
    data: {
      nombre_usuario: slug,
      nombre: fullname,
      correo: profile.email,
      telefono: "",
      tipo_usuario: "cliente",
      fecha_registro: profile.createdAt ?? new Date().toISOString(),
    },
  };

  const res = await fetch(`${STRAPI_URL}/api/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  console.log("Respuesta de creación de usuario:", res.status, json);
  
  if (!res.ok) {
    console.error("Error al crear 'usuarios':", res.status, json);
    throw new Error("No se pudo crear el perfil del usuario.");
  }

  const usuario = json.data;
  console.log("Usuario creado exitosamente:", usuario);
  return { ...usuario };
}

/** Busca Usuario por correo en la collection "usuarios" */
export async function fetchUsuarioByEmail(email, jwt) {
  const url = `${STRAPI_URL}/api/usuarios?filters[correo][$eq]=${encodeURIComponent(email)}`;
  console.log("Buscando usuario en collection:", url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  const json = await res.json();
  console.log("Respuesta de búsqueda:", res.status, json);
  
  if (!res.ok) {
    console.error("Error al buscar usuario:", res.status, json);
    throw new Error("Error al obtener usuario de la colección 'usuarios'.");
  }

  const entry = json.data?.[0];
  if (!entry) {
    console.error("Usuario no encontrado en collection. Respuesta completa:", json);
    throw new Error("No se encontró el usuario en la colección 'usuarios'.");
  }

  console.log("Usuario encontrado en collection:", entry);
  console.log("tipo_usuario:", entry.tipo_usuario);
  
  return { ...entry };
}
