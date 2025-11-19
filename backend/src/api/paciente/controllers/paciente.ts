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
   * Crear paciente - asigna automáticamente el propietario al usuario autenticado
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    console.log('Creando paciente para usuario:', user.id, user.email);

    const requestData = ctx.request.body.data;
    console.log('Datos recibidos:', requestData);

    try {
      // Crear el paciente asignando automáticamente el propietario
      const entity = await strapi.entityService.create('api::paciente.paciente', {
        data: {
          ...requestData,
          propietario: user.id, // Asignar automáticamente
          publishedAt: new Date(), // Publicar automáticamente
        },
      });

      console.log('Paciente creado:', entity);

      return { data: entity };
    } catch (error: any) {
      console.error('Error al crear paciente:', error);
      ctx.throw(500, error.message);
    }
  },
}));
