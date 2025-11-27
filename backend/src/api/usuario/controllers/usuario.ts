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

  /**
   * Crear cliente presencial (desde Recepción)
   * POST /api/usuarios/crear-cliente-presencial
   */
  async crearClientePresencial(ctx) {
    const { nombre, correo, telefono } = ctx.request.body;

    console.log('\n=== Creando Cliente Presencial ===');
    console.log('Datos:', { nombre, correo });

    if (!nombre || !correo) {
      return ctx.badRequest('Nombre y correo son requeridos');
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return ctx.badRequest('El formato del correo electrónico no es válido');
    }

    try {
      // 1. Verificar si el correo ya existe en users-permissions
      const existingAuthUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: correo.toLowerCase() }
      });

      if (existingAuthUser) {
        console.log('❌ Correo ya existe en users-permissions:', correo);
        return ctx.badRequest('El correo ya está registrado en el sistema');
      }

      // 2. Verificar también en la colección usuarios (por seguridad adicional)
      const existingUsuario = await strapi.query('api::usuario.usuario').findOne({
        where: { correo: correo.toLowerCase() }
      });

      if (existingUsuario) {
        console.log('❌ Correo ya existe en colección usuarios:', correo);
        return ctx.badRequest('El correo ya está registrado como cliente');
      }

      // 2. Obtener rol "Authenticated" (Cliente)
      const role = await strapi.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      if (!role) {
        throw new Error('No se encontró el rol Authenticated');
      }

      // 3. Generar token y password temporal
      const token = crypto.randomBytes(32).toString('hex');
      const randomPassword = crypto.randomBytes(10).toString('hex');

      // 4. Crear User en users-permissions
      const newUser = await strapi.plugin('users-permissions').service('user').add({
        username: correo.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
        email: correo.toLowerCase(),
        password: randomPassword,
        role: role.id,
        confirmed: true,
        blocked: false,
        resetPasswordToken: token, // Guardamos el token para la activación
        provider: 'local'
      });

      // 5. Crear Usuario en collection
      const nuevoUsuario = await strapi.query('api::usuario.usuario').create({
        data: {
          nombre_usuario: newUser.username,
          nombre: nombre,
          correo: correo.toLowerCase(),
          telefono: telefono || '',
          tipo_usuario: 'cliente',
          fecha_registro: new Date().toISOString(),
          user: newUser.id
        }
      });

      // 6. Generar Link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
      const activationLink = `${frontendUrl}/activar-cuenta?token=${token}&email=${encodeURIComponent(correo)}`;

      console.log('✅ Cliente creado exitosamente');
      console.log('🔗 Link:', activationLink);
      console.log('📋 Usuario documentId:', nuevoUsuario.documentId);
      console.log('📋 User ID (auth):', newUser.id);

      return ctx.send({
        message: 'Cliente creado exitosamente',
        usuario: {
          ...nuevoUsuario,
          userId: newUser.id, // Incluir el userId de auth para referencia
        },
        activationLink: activationLink
      });

    } catch (error) {
      console.error('Error creando cliente presencial:', error);
      return ctx.internalServerError('Error al crear el cliente: ' + error.message);
    }
  }
}));
