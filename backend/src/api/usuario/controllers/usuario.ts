/**
 * usuario controller
 */

import { factories } from '@strapi/strapi';
import crypto from 'crypto';

export default factories.createCoreController('api::usuario.usuario', ({ strapi }) => ({
  /**
   * Endpoint personalizado para activar cuenta de usuario
   * POST /api/usuarios/activar-cuenta
   * Body: { email, token, nombre, password }
   */
  async activarCuenta(ctx) {
    const { email, token, nombre, password } = ctx.request.body;

    console.log('\n=== Solicitud de activación de cuenta ===');
    console.log('Email:', email);
    console.log('Token recibido:', token);
    console.log('Nombre:', nombre);

    // Validaciones
    if (!email || !token || !nombre || !password) {
      console.error('Faltan datos requeridos');
      return ctx.badRequest('Todos los campos son requeridos');
    }

    if (nombre.length < 3) {
      return ctx.badRequest('El nombre debe tener al menos 3 caracteres');
    }

    if (password.length < 8) {
      return ctx.badRequest('La contraseña debe tener al menos 8 caracteres');
    }

    try {
      // 1. Buscar el usuario en users-permissions por email y resetPasswordToken
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { 
          email: email.toLowerCase(),
          resetPasswordToken: token,
        },
        populate: ['role'], // Importante: popular el rol
      });

      console.log('Usuario encontrado:', user ? `ID ${user.id}` : 'No encontrado');
      
      if (user) {
        console.log('Detalles del usuario:', {
          id: user.id,
          email: user.email,
          username: user.username,
          confirmed: user.confirmed,
          role: user.role,
        });
      }

      if (!user) {
        console.error('Usuario no encontrado o token inválido');
        return ctx.badRequest('Token de activación inválido o expirado');
      }

      // 2. Actualizar el usuario: establecer contraseña, username y confirmar cuenta
      // IMPORTANTE: Usar el servicio de users-permissions para que hashee la contraseña correctamente
      const updatedUser = await strapi.plugin('users-permissions').service('user').edit(user.id, {
        username: email.split('@')[0],
        password: password, // El servicio de users-permissions lo hasheará automáticamente
        confirmed: true,
        resetPasswordToken: null,
      });

      console.log('Usuario actualizado en users-permissions:', updatedUser.id);

      // 3. Buscar y actualizar el registro en la collection "usuarios"
      let usuario = await strapi.query('api::usuario.usuario').findOne({
        where: { user: updatedUser.id },
      });

      console.log('Usuario en collection encontrado:', usuario ? `ID ${usuario.id}` : 'No encontrado');

      if (!usuario) {
        console.log('Creando registro en collection usuarios...');
        
        // Determinar tipo de usuario basado en el rol
        let tipoUsuario = 'cliente';
        console.log('Rol del user:', user.role);
        
        if (user.role) {
          // El rol ya viene populado
          const roleName = typeof user.role === 'object' ? user.role.name : null;
          console.log('Nombre del rol:', roleName);
          
          if (roleName === 'Veterinario') tipoUsuario = 'veterinario';
          else if (roleName === 'Recepcionista') tipoUsuario = 'recepcionista';
        }
        
        console.log('Tipo de usuario determinado:', tipoUsuario);
        
        // Crear el registro en "usuarios"
        usuario = await strapi.query('api::usuario.usuario').create({
          data: {
            nombre_usuario: nombre.toLowerCase().replace(/\s+/g, '-'),
            nombre: nombre,
            correo: email.toLowerCase(),
            telefono: '',
            tipo_usuario: tipoUsuario,
            fecha_registro: new Date().toISOString(),
            user: updatedUser.id, // Relación con users-permissions
          },
        });

        console.log('Registro creado en usuarios:', usuario.id, usuario);
      } else {
        console.log('Actualizando registro existente en usuarios:', usuario.id);
        
        // Determinar tipo de usuario basado en el rol
        let tipoUsuario = 'cliente';
        if (user.role) {
          const roleName = typeof user.role === 'object' ? user.role.name : null;
          console.log('Nombre del rol:', roleName);
          
          if (roleName === 'Veterinario') tipoUsuario = 'veterinario';
          else if (roleName === 'Recepcionista') tipoUsuario = 'recepcionista';
        }
        
        console.log('Tipo de usuario determinado:', tipoUsuario);
        
        // Actualizar nombre Y tipo_usuario en el registro existente
        usuario = await strapi.query('api::usuario.usuario').update({
          where: { id: usuario.id },
          data: {
            nombre: nombre,
            nombre_usuario: nombre.toLowerCase().replace(/\s+/g, '-'),
            tipo_usuario: tipoUsuario, // IMPORTANTE: actualizar tipo_usuario también
          },
        });
        
        console.log('Usuario actualizado:', usuario);
      }

      // 4. Generar JWT para login automático
      const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: updatedUser.id });

      console.log('JWT generado para login automático');

      // 5. Construir appUser para el frontend
      const appUser = {
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          confirmed: updatedUser.confirmed,
        },
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          telefono: usuario.telefono,
          tipo_usuario: usuario.tipo_usuario,
        },
      };

      console.log('Activación exitosa');
      console.log('=== Fin de activación ===\n');

      return ctx.send({
        message: 'Cuenta activada exitosamente',
        jwt,
        appUser,
      });
    } catch (err) {
      console.error('Error al activar cuenta:', err);
      return ctx.internalServerError('Error al activar la cuenta');
    }
  },
}));
