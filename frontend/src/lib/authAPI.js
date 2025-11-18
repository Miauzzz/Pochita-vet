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

/** Busca o crea el registro en la collection "usuarios" */
export async function ensureUsuarioCliente(profile, jwt, fullname) {
  const slug = slugifyNombre(fullname);
  console.log("Asegurando usuario en collection para:", profile.email);

  // Intentar buscar el usuario con reintentos (el lifecycle puede tardar)
  const maxRetries = 5;
  let usuario = null;
  
  for (let i = 0; i < maxRetries; i++) {
    console.log(`Intento ${i + 1}/${maxRetries} - Buscando usuario...`);
    
    const searchUrl = `${STRAPI_URL}/api/usuarios?filters[correo][$eq]=${encodeURIComponent(profile.email)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    const searchJson = await searchRes.json();
    
    if (searchRes.ok && searchJson.data?.[0]) {
      usuario = searchJson.data[0];
      console.log("Usuario encontrado:", usuario);
      break;
    }
    
    // Esperar 500ms antes del siguiente intento
    if (i < maxRetries - 1) {
      console.log("Usuario no encontrado aún, esperando...");
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Si después de los reintentos no existe, crearlo nosotros
  if (!usuario) {
    console.log("Usuario no encontrado después de reintentos, creándolo...");
    
    const createBody = {
      data: {
        nombre_usuario: slug,
        nombre: fullname,
        correo: profile.email,
        telefono: "",
        tipo_usuario: "cliente",
        fecha_registro: profile.createdAt ?? new Date().toISOString(),
        user: profile.id,
      },
    };

    const createRes = await fetch(`${STRAPI_URL}/api/usuarios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(createBody),
    });

    const createJson = await createRes.json();
    console.log("Respuesta de creación:", createRes.status, createJson);
    
    if (!createRes.ok) {
      console.error("Error al crear usuario:", createRes.status, createJson);
      throw new Error("No se pudo crear el perfil del usuario.");
    }

    usuario = createJson.data;
    console.log("Usuario creado exitosamente:", usuario);
  } else {
    // Si existe pero no tiene nombre, actualizarlo
    if (!usuario.nombre || usuario.nombre === '') {
      console.log("Actualizando nombre del usuario existente...");
      
      const updateBody = {
        data: {
          nombre_usuario: slug,
          nombre: fullname,
        },
      };

      const updateRes = await fetch(`${STRAPI_URL}/api/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(updateBody),
      });

      const updateJson = await updateRes.json();
      
      if (updateRes.ok) {
        usuario = updateJson.data;
        console.log("Nombre actualizado exitosamente");
      } else {
        console.warn("No se pudo actualizar el nombre, pero el usuario existe");
      }
    }
  }

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
