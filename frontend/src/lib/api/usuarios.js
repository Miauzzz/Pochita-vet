import { APIClient } from './base.js';

/**
 * API de Usuarios (Clientes)
 */
export class UsuariosAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
  }

  /**
   * Crear nuevo usuario (Cliente)
   * Nota: Esto crea la entidad 'Usuario' en la colección personalizada.
   * Idealmente, el backend debería manejar la creación del usuario de sistema (users-permissions)
   * automáticamente o deberíamos hacerlo aquí si tenemos permisos.
   * 
   * Por ahora, asumiremos que creamos el 'Usuario' y el backend se encarga del resto o
   * que solo necesitamos el 'Usuario' para la gestión básica.
   */
  async crearUsuario(datos) {
    // Asegurar que el tipo de usuario sea cliente
    const datosUsuario = {
      ...datos,
      tipo_usuario: 'cliente',
      fecha_registro: new Date().toISOString()
    };

    const response = await this.client.post('/api/usuarios', {
      data: datosUsuario
    });
    return response.data;
  }

  /**
   * Crear cliente presencial (genera link de activación)
   */
  async crearClientePresencial(datos) {
    const response = await this.client.post('/api/usuarios/crear-cliente-presencial', {
      ...datos
    });
    return response; // Retorna { message, usuario, activationLink }
  }

  /**
   * Buscar usuario por correo (para evitar duplicados antes de crear)
   */
  async buscarPorCorreo(correo) {
    const response = await this.client.get('/api/usuarios', {
      'filters[correo][$eq]': correo
    });
    return response.data;
  }
}
