/**
 * cita controller
 */

import { factories } from '@strapi/strapi'

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
        }
        
        // Si se cancela una cita, liberar la disponibilidad
        if (requestData.estado === 'cancelada') {
          try {
            const citaActual: any = await strapi.entityService.findOne('api::cita.cita', documentId, {
              populate: ['disponibilidad']
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
