/**
 * disponibilidad controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::disponibilidad.disponibilidad', ({ strapi }) => ({
  /**
   * Listar disponibilidades - filtra automáticamente por veterinario si es el rol del usuario
   * GET /api/disponibilidads
   */
  async find(ctx) {
    try {
      const user = ctx.state.user;

      // Si hay usuario autenticado, verificar su rol
      if (user) {
        const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
          where: { id: user.id },
          populate: ['role'],
        });

        // Si es veterinario, filtrar solo sus disponibilidades
        if (userWithRole?.role?.name === 'Veterinario') {
          console.log('Usuario veterinario, filtrando por ID:', user.id);
          
          // Obtener fecha actual en formato YYYY-MM-DD (timezone local)
          const hoy = new Date();
          const fechaHoy = hoy.toISOString().split('T')[0];
          
          const disponibilidades = await strapi.entityService.findMany('api::disponibilidad.disponibilidad', {
            filters: {
              veterinario: {
                id: user.id,
              },
              // Solo disponibilidades de hoy en adelante
              fecha: {
                $gte: fechaHoy,
              },
            },
            populate: ['veterinario', 'cita', 'cita.paciente'], // Populate relaciones
            sort: { fecha: 'asc', hora_inicio: 'asc' }, // Más cercanas primero
          });

          // Enriquecer con datos del perfil Usuario
          const disponibilidadesEnriquecidas = await Promise.all(
            disponibilidades.map(async (disp: any) => {
              if (disp.veterinario?.id) {
                const perfil = await strapi.query('api::usuario.usuario').findOne({
                  where: { user: disp.veterinario.id },
                });
                
                if (perfil) {
                  disp.veterinario.nombreCompleto = perfil.nombre;
                }
              }
              return disp;
            })
          );

          console.log(`Encontradas ${disponibilidadesEnriquecidas.length} disponibilidades futuras`);
          return { data: disponibilidadesEnriquecidas };
        }
      }

      // Para otros roles (recepcionista, cliente), usar comportamiento por defecto CON populate
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const { results, pagination } = await strapi.service('api::disponibilidad.disponibilidad').find({
        ...sanitizedQuery,
        populate: ['veterinario', 'cita', 'cita.paciente'], // Asegurar populate
      });

      // Enriquecer resultados con datos del perfil Usuario
      const resultsEnriquecidos = await Promise.all(
        results.map(async (disp: any) => {
          if (disp.veterinario?.id) {
            const perfil = await strapi.query('api::usuario.usuario').findOne({
              where: { user: disp.veterinario.id },
            });
            
            if (perfil) {
              disp.veterinario.nombreCompleto = perfil.nombre;
            }
          }
          return disp;
        })
      );

      return this.transformResponse(resultsEnriquecidos, { pagination });
    } catch (error) {
      console.error('Error en find():', error);
      return ctx.internalServerError('Error al obtener disponibilidades');
    }
  },

  /**
   * Crear disponibilidad - asigna automáticamente el veterinario autenticado
   * POST /api/disponibilidads
   */
  async create(ctx) {
    try {
      // Obtener el usuario autenticado
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Debes estar autenticado');
      }

      // Verificar que el usuario sea veterinario
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      if (userWithRole?.role?.name !== 'Veterinario') {
        return ctx.forbidden('Solo los veterinarios pueden crear disponibilidades');
      }

      console.log('Usuario veterinario autenticado:', user.id, user.username);

      // Preparar los datos
      const requestData = ctx.request.body.data;
      
      console.log('Datos recibidos:', requestData);

      // Crear la disponibilidad usando entityService con el formato correcto
      const entity = await strapi.entityService.create('api::disponibilidad.disponibilidad', {
        data: {
          fecha: requestData.fecha,
          hora_inicio: requestData.hora_inicio,
          hora_fin: requestData.hora_fin,
          estado: requestData.estado || 'disponible',
          disponible: requestData.disponible !== false,
          veterinario: user.id, // ID directo del veterinario
          publishedAt: new Date(),
        },
      });

      console.log('Disponibilidad creada (antes de populate):', entity);

      // Obtener la disponibilidad con el veterinario populado
      const populatedEntity = await strapi.entityService.findOne('api::disponibilidad.disponibilidad', entity.id, {
        populate: ['veterinario'],
      });

      console.log('Disponibilidad con veterinario populado:', populatedEntity);

      return { data: populatedEntity };
    } catch (error) {
      console.error('Error al crear disponibilidad:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Obtener disponibilidades por mes y año
   * GET /api/disponibilidads/por-mes?mes=11&anio=2025&veterinario=1
   */
  async porMes(ctx) {
    try {
      const { mes, anio, veterinario } = ctx.query;

      if (!mes || !anio) {
        return ctx.badRequest('Los parámetros mes y anio son requeridos');
      }

      const disponibilidades = await strapi
        .service('api::disponibilidad.disponibilidad')
        .obtenerPorMes(
          parseInt(mes as string), 
          parseInt(anio as string), 
          veterinario ? parseInt(veterinario as string) : null
        );

      return { data: disponibilidades };
    } catch (error) {
      console.error('Error en porMes:', error);
      return ctx.internalServerError('Error al obtener disponibilidades');
    }
  },

  /**
   * Obtener disponibilidades por fecha específica
   * GET /api/disponibilidads/por-fecha?fecha=2025-11-18&veterinario=1
   */
  async porFecha(ctx) {
    try {
      const { fecha, veterinario } = ctx.query;

      if (!fecha) {
        return ctx.badRequest('El parámetro fecha es requerido');
      }

      const disponibilidades = await strapi
        .service('api::disponibilidad.disponibilidad')
        .obtenerPorFecha(
          fecha as string, 
          veterinario ? parseInt(veterinario as string) : null
        );

      return { data: disponibilidades };
    } catch (error) {
      console.error('Error en porFecha:', error);
      return ctx.internalServerError('Error al obtener disponibilidades');
    }
  },

  /**
   * Obtener veterinarios con disponibilidades
   * GET /api/disponibilidads/veterinarios
   */
  async veterinarios(ctx) {
    try {
      const veterinarios = await strapi
        .service('api::disponibilidad.disponibilidad')
        .obtenerVeterinarios();

      return { data: veterinarios };
    } catch (error) {
      console.error('Error en veterinarios:', error);
      return ctx.internalServerError('Error al obtener veterinarios');
    }
  },
}));
