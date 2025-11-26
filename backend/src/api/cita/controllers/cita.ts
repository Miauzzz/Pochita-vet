/**
 * cita controller
 */

import { factories } from '@strapi/strapi'
import { notificarRecepcionistas, crearNotificacion } from '../../../utils/notificaciones';

export default factories.createCoreController('api::cita.cita', ({ strapi }) => ({
  /**
   * Listar citas - filtra según rol del usuario
   */
  async find(ctx) {
    const user = ctx.state.user;

    console.log('🔍 CONTROLLER FIND() EJECUTÁNDOSE');
    console.log('🔍 Usuario:', user?.id, user?.email);

    if (!user) {
      console.error('❌ Usuario NO autenticado');
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      const roleName = userWithRole?.role?.name;
      console.log('🔍 Rol del usuario:', roleName);
      
      let filters: any = {};

      // Cliente o Authenticated: solo sus citas (donde paciente.propietario = user)
      if (roleName === 'Cliente' || roleName === 'Authenticated') {
        const misPacientes = await strapi.entityService.findMany('api::paciente.paciente', {
          filters: { propietario: { id: user.id } },
          fields: ['id'],
        });
        const pacienteIds = misPacientes.map((p: any) => p.id);
        
        console.log('🔍 Cliente - Mis pacientes IDs:', pacienteIds);
        
        filters = {
          paciente: { id: { $in: pacienteIds } },
        };
      }
      
      // Veterinario: solo citas asignadas a él
      else if (roleName === 'Veterinario') {
        filters = {
          veterinario: { id: user.id },
        };
      }
      
      // Recepcionista: ve todas las citas (sin filtro)

      // POPULATE PROFUNDO: paciente.propietario es crítico
      const citas = await strapi.entityService.findMany('api::cita.cita', {
        filters,
        populate: {
          paciente: {
            populate: ['propietario'], // ¡CRÍTICO! Sin esto, propietario = null
          },
          veterinario: true,
          recepcionista: true,
          disponibilidad: true,
        },
        sort: { fecha: 'desc', hora: 'desc' },
      });

      console.log(`✅ ${citas.length} citas encontradas para rol: ${roleName}`);
      if (citas.length > 0) {
        const primeraCita = citas[0] as any;
        console.log('🐞 Primera cita - Paciente:', primeraCita.paciente);
        console.log('🐞 Primera cita - Propietario:', primeraCita.paciente?.propietario);
      }

      // Enriquecer con nombres completos
      const citasEnriquecidas = await Promise.all(
        citas.map(async (cita: any) => {
          if (cita.veterinario?.id) {
            const perfil = await strapi.query('api::usuario.usuario').findOne({
              where: { user: cita.veterinario.id },
            });
            if (perfil) cita.veterinario.nombreCompleto = perfil.nombre;
          }
          
          // Enriquecer propietario con nombreCompleto
          if (cita.paciente?.propietario?.id) {
            const perfilPropietario = await strapi.query('api::usuario.usuario').findOne({
              where: { user: cita.paciente.propietario.id },
            });
            if (perfilPropietario) {
              cita.paciente.propietario.nombreCompleto = perfilPropietario.nombre;
            }
          }
          
          return cita;
        })
      );

      return { data: citasEnriquecidas };
    } catch (error) {
      console.error('Error en find():', error);
      return ctx.internalServerError('Error al obtener citas');
    }
  },

  /**
   * Crear cita
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    console.log('Creando cita, usuario:', user.id, user.email);

    const requestData = ctx.request.body.data;
    console.log('Datos de cita recibidos:', requestData);

    try {
      // Crear la cita
      const entity = await strapi.entityService.create('api::cita.cita', {
        data: {
          fecha: requestData.fecha,
          hora: requestData.hora,
          motivo: requestData.motivo || '',
          estado: 'pendiente',
          paciente: requestData.pacienteId || null,
          veterinario: requestData.veterinarioId || null,
          recepcionista: requestData.recepcionistaId || null,
          disponibilidad: requestData.disponibilidadId || null,
          publishedAt: new Date(),
        },
      });

      console.log('✅ Cita creada exitosamente:', { id: entity.id, documentId: entity.documentId });

      // Actualizar la disponibilidad a ocupado automáticamente
      if (requestData.disponibilidadId) {
        try {
          console.log('Buscando disponibilidad con ID:', requestData.disponibilidadId);
          
          // Buscar la disponibilidad por ID numérico para obtener su documentId
          const disponibilidad = await strapi.entityService.findOne(
            'api::disponibilidad.disponibilidad',
            requestData.disponibilidadId
          );
          
          if (disponibilidad && disponibilidad.documentId) {
            console.log('Actualizando disponibilidad con documentId:', disponibilidad.documentId);
            
            const disponibilidadActualizada = await strapi.documents('api::disponibilidad.disponibilidad').update({
              documentId: disponibilidad.documentId,
              data: {
                estado: 'ocupado',
                disponible: false,
              },
            });
            
            console.log('✅ Disponibilidad actualizada exitosamente:', disponibilidadActualizada);
          } else {
            console.warn('⚠️ No se encontró la disponibilidad con ID:', requestData.disponibilidadId);
          }
        } catch (dispError: any) {
          console.error('❌ Error al actualizar disponibilidad:', dispError.message || dispError);
          console.error('Stack:', dispError.stack);
        }
      } else {
        console.warn('⚠️ No se proporcionó disponibilidadId, no se actualizará el estado');
      }

      // Crear notificación para recepcionistas sobre nueva cita
      try {
        const citaId = typeof entity.id === 'string' ? parseInt(entity.id) : entity.id;
        const citaCompleta: any = await strapi.entityService.findOne('api::cita.cita', citaId, {
          populate: ['paciente', 'veterinario'],
        });

        if (citaCompleta) {
          const pacienteNombre = citaCompleta.paciente?.nombre || 'mascota';
          const veterinarioNombre = citaCompleta.veterinario?.nombreCompleto || citaCompleta.veterinario?.username || 'veterinario';
          const fechaFormateada = new Date(citaCompleta.fecha).toLocaleDateString('es-CL');
          const horaFormateada = citaCompleta.hora?.substring(0, 5) || 'N/A';

          const titulo = 'Nueva cita pendiente';
          const mensaje = `Nueva cita de ${pacienteNombre} con Dr. ${veterinarioNombre} el ${fechaFormateada} a las ${horaFormateada}`;

          await notificarRecepcionistas(
            strapi,
            'general',
            titulo,
            mensaje,
            user.id,
            citaId
          );

          // Notificar al veterinario
          if (citaCompleta.veterinario?.id) {
            await crearNotificacion(
              strapi,
              'agenda',
              'Nueva cita asignada',
              `Tienes una nueva cita con ${pacienteNombre} el ${fechaFormateada} a las ${horaFormateada}`,
              citaCompleta.veterinario.id,
              user.id,
              citaId
            );
            console.log('📢 Notificación enviada: Veterinario notificado de nueva cita');
          }

          console.log('📢 Notificación enviada: Nueva cita creada');
        }
      } catch (notifError: any) {
        console.error('❌ Error creando notificación:', notifError.message);
      }

      return { data: entity };
    } catch (error: any) {
      console.error('Error al crear cita:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Actualizar cita - permite cambiar estado según rol
   */
  async update(ctx) {
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
      const { id: documentId } = ctx.params;
      const requestData = ctx.request.body.data;

      console.log(`Actualizando cita ${documentId}, rol: ${roleName}, datos:`, requestData);

      // Validaciones por rol
      if (requestData.estado) {
        // Solo recepcionista puede confirmar
        if (requestData.estado === 'confirmada' && roleName !== 'Recepcionista') {
          return ctx.forbidden('Solo el recepcionista puede confirmar citas');
        }

        // Veterinario y Recepcionista pueden cancelar
        if (requestData.estado === 'cancelada' && !['Veterinario', 'Recepcionista'].includes(roleName)) {
          return ctx.forbidden('No tienes permisos para cancelar citas');
        }

        // Si se confirma, asignar recepcionista
        if (requestData.estado === 'confirmada') {
          requestData.recepcionista = user.id;

          // Notificar al cliente (propietario)
          try {
            const citaConfirmada: any = await strapi.entityService.findOne('api::cita.cita', documentId, {
              populate: {
                paciente: { populate: ['propietario'] },
                veterinario: true
              }
            });

            if (citaConfirmada?.paciente?.propietario?.id) {
              const fechaFormateada = new Date(citaConfirmada.fecha).toLocaleDateString('es-CL');
              const horaFormateada = citaConfirmada.hora?.substring(0, 5) || 'N/A';
              const vetNombre = citaConfirmada.veterinario?.nombreCompleto || 'Veterinario';

              await crearNotificacion(
                strapi,
                'estado_cita',
                'Cita Confirmada',
                `Tu cita para ${citaConfirmada.paciente.nombre} con Dr. ${vetNombre} el ${fechaFormateada} a las ${horaFormateada} ha sido confirmada.`,
                citaConfirmada.paciente.propietario.id,
                user.id,
                citaConfirmada.id
              );
              console.log('📢 Notificación enviada: Cliente notificado de confirmación');
            }
          } catch (err) {
            console.error('Error notificando confirmación:', err);
          }
        }
        
        // Si se cancela una cita, liberar la disponibilidad
        if (requestData.estado === 'cancelada') {
          try {
            const citaActual: any = await strapi.entityService.findOne('api::cita.cita', documentId, {
              populate: {
                disponibilidad: true,
                veterinario: true,
                paciente: { populate: ['propietario'] }
              }
            });
            
            if (citaActual?.disponibilidad?.documentId) {
              console.log('Liberando disponibilidad:', citaActual.disponibilidad.documentId);
              
              await strapi.documents('api::disponibilidad.disponibilidad').update({
                documentId: citaActual.disponibilidad.documentId,
                data: {
                  estado: 'disponible',
                  disponible: true,
                },
              });
              
              console.log('✅ Disponibilidad liberada');
            }

            // Crear notificación para recepcionistas
            if (roleName === 'Veterinario' && citaActual) {
              const veterinarioNombre = citaActual.veterinario?.nombreCompleto || citaActual.veterinario?.username || 'Veterinario';
              const fechaFormateada = new Date(citaActual.fecha).toLocaleDateString('es-CL');
              const horaFormateada = citaActual.hora?.substring(0, 5) || 'N/A';
              const pacienteNombre = citaActual.paciente?.nombre || 'mascota';

              const titulo = 'Cita cancelada por veterinario';
              const mensaje = `Dr. ${veterinarioNombre} canceló cita de ${pacienteNombre} el ${fechaFormateada} a las ${horaFormateada}`;

              await notificarRecepcionistas(
                strapi,
                'cancelacion',
                titulo,
                mensaje,
                user.id,
                citaActual.id
              );

              // Notificar al cliente
              if (citaActual.paciente?.propietario?.id) {
                await crearNotificacion(
                  strapi,
                  'cancelacion',
                  'Cita Cancelada',
                  `El Dr. ${veterinarioNombre} ha cancelado la cita de ${pacienteNombre} para el ${fechaFormateada}. Por favor reagenda.`,
                  citaActual.paciente.propietario.id,
                  user.id,
                  citaActual.id
                );
              }

              console.log('📢 Notificación enviada: Veterinario canceló cita');
            } else if (roleName === 'Recepcionista' && citaActual) {
              // Cancelada por recepcionista -> Notificar Veterinario y Cliente
              const fechaFormateada = new Date(citaActual.fecha).toLocaleDateString('es-CL');
              const horaFormateada = citaActual.hora?.substring(0, 5) || 'N/A';
              const pacienteNombre = citaActual.paciente?.nombre || 'mascota';

              // Notificar Veterinario
              if (citaActual.veterinario?.id) {
                await crearNotificacion(
                  strapi,
                  'cancelacion',
                  'Cita Cancelada',
                  `La cita con ${pacienteNombre} el ${fechaFormateada} a las ${horaFormateada} ha sido cancelada por recepción.`,
                  citaActual.veterinario.id,
                  user.id,
                  citaActual.id
                );
              }

              // Notificar Cliente
              if (citaActual.paciente?.propietario?.id) {
                await crearNotificacion(
                  strapi,
                  'cancelacion',
                  'Cita Cancelada',
                  `Tu cita para ${pacienteNombre} el ${fechaFormateada} a las ${horaFormateada} ha sido cancelada. Contacta a recepción para más detalles.`,
                  citaActual.paciente.propietario.id,
                  user.id,
                  citaActual.id
                );
              }
              console.log('📢 Notificación enviada: Recepción canceló cita (Vet y Cliente notificados)');
            }
          } catch (dispError: any) {
            console.error('❌ Error al liberar disponibilidad:', dispError.message);
          }
        }
      }

      const entity = await strapi.documents('api::cita.cita').update({
        documentId,
        data: requestData,
      });

      console.log('✅ Cita actualizada:', entity);

      return { data: entity };
    } catch (error: any) {
      console.error('Error al actualizar cita:', error);
      ctx.throw(500, error.message);
    }
  },
}));
