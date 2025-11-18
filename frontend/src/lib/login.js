// src/lib/login.js
// @ts-nocheck

import {
  registerUser,
  loginUser,
  fetchMe,
  ensureUsuarioCliente,
  fetchUsuarioByEmail,
} from "/src/lib/authAPI.js";

import {
  buildAppUser,
  saveSession,
  loadSession,
  getRoleAndRedirect,
  clearSession,
} from "/src/lib/authHelpers.js";

export function initLoginPage() {
  console.log("=== initLoginPage ejecutado ===");
  
  // 1) Si ya hay sesión y el rol es válido, redirigimos al dashboard
  const session = loadSession();
  if (session?.appUser) {
    const role = session.appUser?.usuario?.tipo_usuario?.toLowerCase?.();
    const valid = ["cliente", "recepcionista", "veterinario"];
    if (role && valid.includes(role)) {
      console.log("Sesión válida encontrada, redirigiendo...");
      getRoleAndRedirect(session.appUser);
      return; // IMPORTANTE: salir completamente
    } else {
      console.warn("Sesión con rol inválido, limpiando...");
      clearSession();
      // Permitir que continúe y configure los formularios
    }
  } else {
    console.log("No hay sesión previa, configurando formularios");
  }

  // 2) Configurar formularios solo si no hay sesión válida
  setupLoginForm();
  setupRegisterForm();
}

function setupLoginForm() {
  const loginForm = document.getElementById("login-form");
  
  if (!loginForm) {
    console.error("Formulario de login no encontrado en el DOM");
    return;
  }

  console.log("Configurando event listener para login-form");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    console.log("=== Formulario de login enviado ===");

    const formData = new FormData(loginForm);
    const identifier = formData.get("identifier");
    const password = formData.get("password");
    const remember = formData.get("remember") === "on";

    console.log("Datos del formulario:");
    console.log("- identifier:", identifier);
    console.log("- remember:", remember);

    if (!identifier || !password) {
      alert("Completa correo y contraseña.");
      return;
    }

    try {
      // Login contra Strapi Users & Permissions
      const { jwt, user: profile } = await loginUser(identifier, password);
      console.log("Login exitoso, JWT obtenido");

      // Buscar registro en collection "usuarios" por correo
      const usuario = await fetchUsuarioByEmail(profile.email, jwt);
      console.log("Usuario encontrado en collection");

      // Unificar y guardar sesión respetando "remember"
      const appUser = buildAppUser(profile, usuario);
      saveSession(jwt, appUser, remember);
      console.log("Sesión guardada, procediendo a redirección");

      // Redirigir según tipo_usuario
      getRoleAndRedirect(appUser);
    } catch (err) {
      console.error("Error en proceso de login:", err);
      alert(err.message || "Error al iniciar sesión");
    }
  });
}

function setupRegisterForm() {
  const registerForm = document.getElementById("register-form");
  
  if (!registerForm) {
    console.error("Formulario de registro no encontrado en el DOM");
    return;
  }

  console.log("Configurando event listener para register-form");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    console.log("=== Formulario de registro enviado ===");

    const formData = new FormData(registerForm);
    const fullname = formData.get("fullname");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm-password");

    console.log("Datos del formulario:");
    console.log("- fullname:", fullname);
    console.log("- email:", email);

    if (!fullname || !email || !password || !confirmPassword) {
      alert("Completa todos los campos.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    try {
      const { jwt } = await registerUser(fullname, email, password);
      console.log("Registro exitoso, JWT obtenido");
      
      const profile = await fetchMe(jwt);
      console.log("Perfil obtenido");
      
      // Buscar o crear el Usuario con reintentos (el lifecycle puede tardar)
      await ensureUsuarioCliente(profile, jwt, fullname);
      console.log("Usuario asegurado en collection");

      // Limpiar cualquier sesión previa
      clearSession();
      console.log("Registro completado, redirigiendo al login");
      
      // Mostrar mensaje de éxito y redirigir al login
      alert("¡Registro exitoso! Por favor, inicia sesión con tus credenciales.");
      window.location.href = "/login";
    } catch (err) {
      console.error("Error en proceso de registro:", err);
      alert(err.message || "Error al registrarse");
    }
  });
}
