const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL;

export function activarCuenta() {
  return {
    token: '',
    email: '',
    nombre: '',
    password: '',
    confirmPassword: '',
    cargando: false,
    error: '',
    activado: false,

    init() {
      const params = new URLSearchParams(window.location.search);
      this.token = params.get('token') || '';
      this.email = params.get('email') || '';

      if (!this.token || !this.email) {
        this.error = 'Link de activación inválido';
      }
    },

    async activar() {
      this.error = '';

      if (!this.nombre.trim()) {
        this.error = 'El nombre es obligatorio';
        return;
      }

      if (this.password !== this.confirmPassword) {
        this.error = 'Las contraseñas no coinciden';
        return;
      }

      if (this.password.length < 8) {
        this.error = 'La contraseña debe tener mínimo 8 caracteres';
        return;
      }

      this.cargando = true;

      try {
        // 1. Activar cuenta con contraseña
        const resetResponse = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: this.token,
            password: this.password,
            passwordConfirmation: this.confirmPassword
          })
        });

        const resetData = await resetResponse.json();

        if (!resetResponse.ok) {
          throw new Error(resetData.error?.message || 'Error al activar cuenta');
        }

        const jwt = resetData.jwt;
        
        // 2. Buscar el registro en Usuario por email
        const usuariosResponse = await fetch(
          `${STRAPI_URL}/api/usuarios?filters[correo][$eq]=${encodeURIComponent(this.email)}`,
          {
            headers: { 'Authorization': `Bearer ${jwt}` }
          }
        );

        const usuariosData = await usuariosResponse.json();
        
        if (!usuariosData.data || usuariosData.data.length === 0) {
          throw new Error('No se encontró el perfil de usuario');
        }

        const usuario = usuariosData.data[0];
        
        // 3. Actualizar SOLO el campo nombre en Usuario
        await fetch(`${STRAPI_URL}/api/usuarios/${usuario.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
          },
          body: JSON.stringify({
            data: { 
              nombre: this.nombre.trim() 
            }
          })
        });

        // 4. Guardar todo en localStorage
        localStorage.setItem('jwt', jwt);
        localStorage.setItem('userData', JSON.stringify({
          id: usuario.id,
          email: this.email,
          nombre: this.nombre.trim(),
          tipo_usuario: usuario.tipo_usuario,
          rol: resetData.user.role?.name
        }));

        this.activado = true;

      } catch (err) {
        this.error = err.message;
      } finally {
        this.cargando = false;
      }
    },

    irAlDashboard() {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const tipoUsuario = userData.tipo_usuario;
      
      if (tipoUsuario === 'veterinario') {
        window.location.href = '/dashboard/veterinario';
      } else if (tipoUsuario === 'recepcionista') {
        window.location.href = '/dashboard/recepcionista';
      } else {
        window.location.href = '/dashboard/cliente';
      }
    }
  }
}

// Registrar globalmente para Alpine.js
window.activarCuenta = activarCuenta;
