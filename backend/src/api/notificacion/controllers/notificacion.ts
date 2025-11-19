/**
 * notificacion controller
 */

import { factories } from '@strapi/strapi'
import { marcarNotificacionLeida, marcarTodasLeidas } from '../../../utils/notificaciones';

export default factories.createCoreController('api::notificacion.notificacion', ({ strapi }) => ({
  /**
   * Obtener notificaciones del usuario autenticado
   * GET /api/notificaciones/mis-notificaciones
   */
  async misNotificaciones(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      const notificaciones = await strapi.entityService.findMany('api::notificacion.notificacion', {
        filters: {
          destinatario: { id: user.id },
        },
        sort: { fecha_notificacion: 'desc' },
        limit: 50, // Últimas 50 notificaciones
      });

      return { data: notificaciones };
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      ctx.throw(500, 'Error al obtener notificaciones');
    }
  },

  /**
   * Marcar notificación como leída
   * PUT /api/notificaciones/:id/marcar-leida
   */
  async marcarLeida(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      // Verificar que la notificación pertenece al usuario
      const notificacion: any = await strapi.entityService.findOne('api::notificacion.notificacion', id, {
        populate: ['destinatario'],
      });

      if (!notificacion) {
        return ctx.notFound('Notificación no encontrada');
      }

      if (notificacion.destinatario?.id !== user.id) {
        return ctx.forbidden('No tienes permiso para modificar esta notificación');
      }

      const updated = await marcarNotificacionLeida(strapi, id);

      return { data: updated };
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      ctx.throw(500, 'Error al marcar notificación');
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   * POST /api/notificaciones/marcar-todas-leidas
   */
  async marcarTodasLeidas(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      const count = await marcarTodasLeidas(strapi, user.id);

      return { data: { count, message: `${count} notificaciones marcadas como leídas` } };
    } catch (error) {
      console.error('Error marcando todas las notificaciones:', error);
      ctx.throw(500, 'Error al marcar notificaciones');
    }
  },
}));
