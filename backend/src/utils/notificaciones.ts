/**
 * Helper para crear notificaciones del sistema
 */

interface NotificacionData {
  tipo: string;
  mensaje: string;
  usuarioId?: number;
  metadata?: Record<string, any>;
}

/**
 * Crear una notificación para un usuario específico
 */
export async function crearNotificacion(
  strapi: any,
  tipo: string,
  titulo: string,
  mensaje: string,
  destinatarioId: number,
  emisorId?: number,
  citaId?: number
) {
  try {
    const notificacion = await strapi.entityService.create('api::notificacion.notificacion', {
      data: {
        tipo,
        titulo,
        mensaje,
        leida: false,
        destinatario: destinatarioId,
        emisor: emisorId || null,
        cita_relacionada: citaId || null,
        fecha_notificacion: new Date(),
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Notificación creada: ${tipo} → Usuario ${destinatarioId}`);
    return notificacion;
  } catch (error) {
    console.error('❌ Error creando notificación:', error);
    throw error;
  }
}

/**
 * Crear notificaciones para todos los recepcionistas
 */
export async function notificarRecepcionistas(
  strapi: any,
  tipo: string,
  titulo: string,
  mensaje: string,
  emisorId?: number,
  citaId?: number
) {
  try {
    // Obtener rol de recepcionista
    const rolRecepcionista = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'recepcionista' },
    });

    if (!rolRecepcionista) {
      console.warn('⚠️ Rol recepcionista no encontrado');
      return [];
    }

    // Obtener todos los usuarios con rol recepcionista
    const recepcionistas = await strapi.query('plugin::users-permissions.user').findMany({
      where: { role: rolRecepcionista.id },
      select: ['id'],
    });

    console.log(`📢 Notificando a ${recepcionistas.length} recepcionista(s)`);

    // Crear notificación para cada recepcionista
    const notificaciones = await Promise.all(
      recepcionistas.map((recep: any) =>
        crearNotificacion(strapi, tipo, titulo, mensaje, recep.id, emisorId, citaId)
      )
    );

    return notificaciones;
  } catch (error) {
    console.error('❌ Error notificando recepcionistas:', error);
    throw error;
  }
}

/**
 * Marcar notificación como leída
 */
export async function marcarNotificacionLeida(strapi: any, notificacionId: number) {
  try {
    const notificacion = await strapi.entityService.update(
      'api::notificacion.notificacion',
      notificacionId,
      {
        data: { leida: true },
      }
    );

    return notificacion;
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error);
    throw error;
  }
}

/**
 * Marcar todas las notificaciones de un usuario como leídas
 */
export async function marcarTodasLeidas(strapi: any, usuarioId: number) {
  try {
    // Obtener todas las notificaciones no leídas del usuario
    const notificaciones = await strapi.entityService.findMany('api::notificacion.notificacion', {
      filters: {
        destinatario: { id: usuarioId },
        leida: false,
      },
    });

    // Marcar cada una como leída
    await Promise.all(
      notificaciones.map((notif: any) =>
        strapi.entityService.update('api::notificacion.notificacion', notif.id, {
          data: { leida: true },
        })
      )
    );

    console.log(`✅ ${notificaciones.length} notificaciones marcadas como leídas para usuario ${usuarioId}`);
    return notificaciones.length;
  } catch (error) {
    console.error('❌ Error marcando todas las notificaciones como leídas:', error);
    throw error;
  }
}
