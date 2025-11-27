/**
 * paciente controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::paciente.paciente', ({ strapi }) => ({
  /**
   * Listar pacientes - filtra automáticamente por propietario si es cliente
   */
  async find(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    console.log('Listando pacientes para usuario:', user.id, user.email);

    // Obtener rol del usuario
    const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role'],
    });

    // Si es cliente, filtrar solo sus pacientes
    const roleName = userWithRole?.role?.name;
    console.log('🔍 Rol del usuario:', roleName);
    
    if (roleName === 'Cliente' || roleName === 'Authenticated') {
      console.log('Usuario es Cliente/Authenticated, filtrando por propietario');
      
      const pacientes = await strapi.entityService.findMany('api::paciente.paciente', {
        filters: {
          propietario: {
            id: user.id,
          },
        },
        populate: {
          propietario: true,
        },
      });

      console.log(`✅ Encontrados ${pacientes.length} pacientes del cliente`);
      return { data: pacientes };
    }

    // Para Recepcionista y Veterinario: mostrar TODOS los pacientes con propietarios
    console.log('Usuario es', roleName, '- mostrando todos los pacientes');
    const pacientes = await strapi.entityService.findMany('api::paciente.paciente', {
      populate: {
        propietario: true,
      },
      sort: { nombre: 'asc' },
    });

    console.log(`✅ Encontrados ${pacientes.length} pacientes (todos)`);
    return { data: pacientes };
  },

  /**
   * Crear paciente - maneja diferentes escenarios según el rol
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      const roleName = userWithRole?.role?.name;
      const requestData = ctx.request.body.data;

      console.log('📝 Creando paciente, rol:', roleName, 'datos:', requestData);

      let propietarioId: number | null = null;

      // Si es cliente, el propietario es él mismo
      if (roleName === 'Cliente' || roleName === 'Authenticated') {
        propietarioId = user.id;
        console.log('👤 Cliente creando su propia mascota, propietario:', propietarioId);
      }
      // Si es recepcionista, debe especificar el propietario
      else if (roleName === 'Recepcionista') {
        // Opción 1: Se envía el user.id directamente (propietario)
        if (requestData.propietario && typeof requestData.propietario === 'number') {
          propietarioId = requestData.propietario;
          console.log('👤 Recepcionista asignó propietario por user.id:', propietarioId);
        }
        // Opción 2: Se envía el correo del cliente (más confiable)
        else if (requestData.clienteCorreo) {
          const authUser = await strapi.query('plugin::users-permissions.user').findOne({
            where: { email: requestData.clienteCorreo.toLowerCase() },
          });

          if (authUser) {
            propietarioId = authUser.id;
            console.log('👤 Propietario encontrado por correo:', propietarioId);
          } else {
            console.log('⚠️ No se encontró usuario por correo, intentando por documentId...');
          }
        }
        
        // Opción 3: Si no se encontró por correo, buscar por documentId del Usuario (collection)
        if (!propietarioId && requestData.clienteDocumentId) {
          // Buscar el usuario de auth relacionado con ese Usuario
          const usuarioCollection = await strapi.query('api::usuario.usuario').findOne({
            where: { documentId: requestData.clienteDocumentId },
            populate: ['user'],
          });

          console.log('🔍 Usuario encontrado por documentId:', usuarioCollection);

          if (usuarioCollection?.user?.id) {
            propietarioId = usuarioCollection.user.id;
            console.log('👤 Propietario obtenido desde Usuario collection:', propietarioId);
          } else if (usuarioCollection?.user && typeof usuarioCollection.user === 'number') {
            propietarioId = usuarioCollection.user;
            console.log('👤 Propietario (referencia no poblada):', propietarioId);
          } else if (usuarioCollection?.correo) {
            // Fallback: buscar en users-permissions por correo del usuario encontrado
            const authUser = await strapi.query('plugin::users-permissions.user').findOne({
              where: { email: usuarioCollection.correo.toLowerCase() },
            });

            if (authUser) {
              propietarioId = authUser.id;
              console.log('👤 Propietario encontrado por correo (fallback):', propietarioId);
            }
          }
        }
        
        if (!propietarioId) {
          return ctx.badRequest(
            'El cliente seleccionado no tiene un usuario de sistema vinculado. ' +
            'Asegúrese de que el cliente haya sido creado correctamente.'
          );
        }
      }
      // Veterinario también puede crear mascotas (mismo flujo que recepcionista)
      else if (roleName === 'Veterinario') {
        // Primero intentar por correo
        if (requestData.clienteCorreo) {
          const authUser = await strapi.query('plugin::users-permissions.user').findOne({
            where: { email: requestData.clienteCorreo.toLowerCase() },
          });
          if (authUser) {
            propietarioId = authUser.id;
            console.log('👤 Veterinario: Propietario encontrado por correo:', propietarioId);
          }
        }
        
        // Si no se encontró por correo, intentar por documentId
        if (!propietarioId && requestData.clienteDocumentId) {
          const usuarioCollection = await strapi.query('api::usuario.usuario').findOne({
            where: { documentId: requestData.clienteDocumentId },
            populate: ['user'],
          });

          if (usuarioCollection?.user?.id) {
            propietarioId = usuarioCollection.user.id;
          } else if (usuarioCollection?.correo) {
            const authUser = await strapi.query('plugin::users-permissions.user').findOne({
              where: { email: usuarioCollection.correo.toLowerCase() },
            });
            if (authUser) propietarioId = authUser.id;
          }
        }

        if (!propietarioId) {
          return ctx.badRequest('Debe especificar un cliente válido para la mascota');
        }
      }
      else {
        return ctx.forbidden('No tienes permiso para crear mascotas');
      }

      // Crear el paciente
      const entity = await strapi.entityService.create('api::paciente.paciente', {
        data: {
          nombre: requestData.nombre,
          especie: requestData.especie,
          raza: requestData.raza || null,
          sexo: requestData.sexo || null,
          peso: requestData.peso || null,
          fecha_nacimiento: requestData.fecha_nacimiento || null,
          color: requestData.color || null,
          propietario: propietarioId,
          publishedAt: new Date(),
        },
      });

      console.log('✅ Paciente creado:', entity);

      // Obtener con propietario poblado
      const populatedEntity = await strapi.entityService.findOne('api::paciente.paciente', entity.id, {
        populate: ['propietario'],
      });

      return { data: populatedEntity };
    } catch (error: any) {
      console.error('❌ Error al crear paciente:', error);
      return ctx.internalServerError(error.message || 'Error al crear paciente');
    }
  },
}));
