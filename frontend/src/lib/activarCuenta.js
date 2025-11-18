// src/lib/activarCuenta.js
// @ts-nocheck

function activarCuenta() {
  return {
    email: '',
    token: '',
    nombre: '',
    password: '',
    confirmPassword: '',
    error: '',
    cargando: false,
    activado: false,

    init() {
      // Obtener parámetros de la URL
      const params = new URLSearchParams(window.location.search);
      this.email = params.get('email') || '';
      this.token = params.get('token') || '';

      console.log('Parámetros de activación:', { email: this.email, token: this.token });

      if (!this.email || !this.token) {
        this.error = 'Link de activación inválido o incompleto';
      }
    },

    async activar() {
      this.error = '';

      // Validaciones
      if (!this.nombre || this.nombre.length < 3) {
        this.error = 'El nombre debe tener al menos 3 caracteres';
        return;
      }

      if (!this.password || this.password.length < 8) {
        this.error = 'La contraseña debe tener al menos 8 caracteres';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.error = 'Las contraseñas no coinciden';
        return;
      }

      this.cargando = true;

      try {
        console.log('Enviando solicitud de activación...');

        const res = await fetch(`${window.STRAPI_URL || 'http://localhost:1337'}/api/usuarios/activar-cuenta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            token: this.token,
            nombre: this.nombre,
            password: this.password,
          }),
        });

        const data = await res.json();
        console.log('Respuesta de activación:', res.status, data);

        if (!res.ok) {
          throw new Error(data.error?.message || data?.message || 'Error al activar la cuenta');
        }

        // Éxito
        console.log('Cuenta activada exitosamente');
        this.activado = true;

        // Guardar el JWT y datos del usuario en localStorage
        if (data.jwt) {
          localStorage.setItem('jwt', data.jwt);
          localStorage.setItem('appUser', JSON.stringify(data.appUser));
        }
      } catch (err) {
        console.error('Error al activar cuenta:', err);
        this.error = err.message || 'Error al activar la cuenta';
      } finally {
        this.cargando = false;
      }
    },

    irAlDashboard() {
      // Redirigir según el tipo de usuario
      const appUser = JSON.parse(localStorage.getItem('appUser') || '{}');
      const tipo = appUser?.usuario?.tipo_usuario?.toLowerCase();

      console.log('Redirigiendo al dashboard:', tipo);

      const dashboards = {
        cliente: '/dashboard/cliente',
        veterinario: '/dashboard/veterinario',
        recepcionista: '/dashboard/recepcionista',
      };

      window.location.href = dashboards[tipo] || '/login';
    },
  };
}

// Exportar para uso global en Alpine.js
window.activarCuenta = activarCuenta;
