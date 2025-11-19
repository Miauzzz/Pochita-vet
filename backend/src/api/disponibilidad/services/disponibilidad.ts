/**
 * disponibilidad service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::disponibilidad.disponibilidad', ({ strapi }) => ({
  /**
   * Obtener disponibilidades por mes y año
   */
  async obtenerPorMes(mes: number, anio: number, veterinarioId: number | null = null) {
    // Construir filtros base
    const filters: any = {};

    // Filtrar por veterinario si se proporciona
    if (veterinarioId) {
      filters.veterinario = { id: { $eq: veterinarioId } };
    }

    // Obtener primer y último día del mes
    const primerDia = new Date(anio, mes - 1, 1);
    const ultimoDia = new Date(anio, mes, 0);

    // Filtrar por rango de fechas
    filters.fecha = {
      $gte: primerDia.toISOString().split('T')[0],
      $lte: ultimoDia.toISOString().split('T')[0],
    };

    // Consultar disponibilidades
    const disponibilidades = await strapi.entityService.findMany(
      'api::disponibilidad.disponibilidad',
      {
        filters,
        populate: {
          veterinario: {
            fields: ['id', 'username', 'email'],
          },
          cita: {
            populate: {
              paciente: {
                fields: ['id', 'nombre'],
              },
            },
          },
        },
        sort: ['fecha:asc', 'hora_inicio:asc'],
      }
    );

    return disponibilidades;
  },

  /**
   * Obtener disponibilidades por fecha específica
   */
  async obtenerPorFecha(fecha: string, veterinarioId: number | null = null) {
    const filters: any = {
      fecha: { $eq: fecha },
    };

    if (veterinarioId) {
      filters.veterinario = { id: { $eq: veterinarioId } };
    }

    const disponibilidades = await strapi.entityService.findMany(
      'api::disponibilidad.disponibilidad',
      {
        filters,
        populate: {
          veterinario: {
            fields: ['id', 'username', 'email'],
          },
          cita: {
            populate: {
              paciente: {
                fields: ['id', 'nombre'],
              },
            },
          },
        },
        sort: ['hora_inicio:asc'],
      }
    );

    return disponibilidades;
  },

  /**
   * Obtener lista de veterinarios que tienen disponibilidades
   */
  async obtenerVeterinarios() {
    // Obtener el rol de veterinario
    const roleVeterinario = await strapi.query('plugin::users-permissions.role').findOne({
      where: { name: 'Veterinario' },
    });

    if (!roleVeterinario) {
      return [];
    }

    // Obtener usuarios con rol veterinario
    const veterinarios = await strapi.entityService.findMany(
      'plugin::users-permissions.user',
      {
        filters: {
          role: { id: { $eq: roleVeterinario.id } },
        },
        fields: ['id', 'username', 'email'],
        sort: ['username:asc'],
      }
    );

    return veterinarios;
  },
}));
