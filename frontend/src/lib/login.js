// src/lib/login.js
// @ts-nocheck

import {
  registerUser,
  loginUser,
  fetchMe,
  createUsuarioCliente,
  fetchUsuarioByEmail,
} from "./authApi.js";

import {
  buildAppUser,
  saveSession,
  loadSession,
  getRoleAndRedirect,
  clearSession,
} from "./authHelpers.js";

export function initLoginPage() {
  // 1) Si ya hay sesión y el rol es válido, redirigimos al dashboard
  const session = loadSession();
  if (session?.appUser) {
    const role = session.appUser?.usuario?.tipo_usuario?.toLowerCase?.();
    const valid = ["cliente", "recepcionista", "veterinario"];
    if (role && valid.includes(role)) {
      getRoleAndRedirect(session.appUser);
      return;
    } else {
      // sesión rota: la limpiamos para evitar bucles raros
      try {
        clearSession();
      } catch {}
    }
  }

  // -------- LOGIN --------
  const loginForm = document.getElementById("login-form");

  if (loginForm instanceof HTMLFormElement) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(loginForm);
      const identifier = formData.get("identifier");
      const password = formData.get("password");
      const remember = formData.get("remember") === "on";

      if (!identifier || !password) {
        alert("Completa correo y contraseña.");
        return;
      }

      try {
        // Login contra Strapi Users & Permissions
        const { jwt, user: profile } = await loginUser(identifier, password);

        // Buscar registro en collection "usuarios" por correo
        const usuario = await fetchUsuarioByEmail(profile.email, jwt);

        // Unificar y guardar sesión respetando "remember"
        const appUser = buildAppUser(profile, usuario);
        saveSession(jwt, appUser, remember);

        // Redirigir según tipo_usuario
        getRoleAndRedirect(appUser);
      } catch (err) {
        console.error("Login error", err);
        alert(err.message || "Error al iniciar sesión");
      }
    });
  }

  // -------- REGISTER --------
  const registerForm = document.getElementById("register-form");

  if (registerForm instanceof HTMLFormElement) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(registerForm);
      const fullname = formData.get("fullname");
      const email = formData.get("email");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirm-password");

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
        const profile = await fetchMe(jwt);
        const usuario = await createUsuarioCliente(profile, jwt, fullname);

        const appUser = buildAppUser(profile, usuario);
        // en registro asumimos que el usuario quiere mantener sesión
        saveSession(jwt, appUser, true);
        getRoleAndRedirect(appUser);
      } catch (err) {
        console.error("Error al registrarse:", err);
        alert(err.message || "Error al registrarse");
      }
    });
  }
}
