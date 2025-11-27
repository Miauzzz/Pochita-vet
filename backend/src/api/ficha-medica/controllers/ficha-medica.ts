/**
 * ficha-medica controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::ficha-medica.ficha-medica', ({ strapi }) => ({
  /**
   * Crear ficha médica - solo veterinarios
   */
  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      // Verificar que sea veterinario
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      if (userWithRole?.role?.name !== 'Veterinario') {
        return ctx.forbidden('Solo los veterinarios pueden crear fichas médicas');
      }

      const requestData = ctx.request.body.data;

      console.log('📋 Creando ficha médica:', requestData);

      // Validar campos requeridos
      if (!requestData.motivo_consulta || !requestData.diagnostico || !requestData.tratamiento) {
        return ctx.badRequest('Motivo, diagnóstico y tratamiento son obligatorios');
      }

      if (!requestData.pacienteId) {
        return ctx.badRequest('Debe especificar un paciente');
      }

      // Verificar que exista el paciente
      const paciente = await strapi.documents('api::paciente.paciente').findFirst({
        filters: { id: requestData.pacienteId },
      });

      if (!paciente) {
        return ctx.badRequest('El paciente especificado no existe');
      }

      // Si hay cita, verificar que exista y no tenga ficha
      let citaDocumentId = null;
      if (requestData.citaDocumentId) {
        const cita = await strapi.documents('api::cita.cita').findOne({
          documentId: requestData.citaDocumentId,
          populate: ['ficha_medica'],
        });

        if (!cita) {
          return ctx.badRequest('La cita especificada no existe');
        }

        if (cita.ficha_medica) {
          return ctx.badRequest('Esta cita ya tiene una ficha médica asociada');
        }

        citaDocumentId = requestData.citaDocumentId;
      }

      // Crear la ficha médica
      const entity = await strapi.documents('api::ficha-medica.ficha-medica').create({
        data: {
          fecha_atencion: requestData.fecha_atencion || new Date().toISOString(),
          motivo_consulta: requestData.motivo_consulta,
          sintomas: requestData.sintomas || null,
          diagnostico: requestData.diagnostico,
          tratamiento: requestData.tratamiento,
          observaciones: requestData.observaciones || null,
          peso_actual: requestData.peso_actual || null,
          temperatura: requestData.temperatura || null,
          frecuencia_cardiaca: requestData.frecuencia_cardiaca || null,
          frecuencia_respiratoria: requestData.frecuencia_respiratoria || null,
          procedimientos_realizados: requestData.procedimientos_realizados || null,
          requiere_seguimiento: requestData.requiere_seguimiento || false,
          fecha_proximo_control: requestData.fecha_proximo_control || null,
          medicamentos_recetados: requestData.medicamentos_recetados || null,
          indicaciones_receta: requestData.indicaciones_receta || null,
          paciente: requestData.pacienteDocumentId,
          cita: citaDocumentId,
          veterinario: user.documentId,
          publishedAt: new Date(),
        },
      });

      console.log('✅ Ficha médica creada:', entity.documentId);

      // Si hay cita asociada, actualizar su estado a "atendida"
      if (citaDocumentId) {
        await strapi.documents('api::cita.cita').update({
          documentId: citaDocumentId,
          data: {
            estado: 'atendida',
          },
        });
        console.log('✅ Cita marcada como atendida');
      }

      // Obtener la ficha con relaciones pobladas
      const populatedEntity = await strapi.documents('api::ficha-medica.ficha-medica').findOne({
        documentId: entity.documentId,
        populate: ['paciente', 'cita', 'veterinario'],
      });

      return { data: populatedEntity };
    } catch (error: any) {
      console.error('❌ Error al crear ficha médica:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Obtener fichas médicas - filtra por rol
   */
  async find(ctx) {
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
      let filters: any = {};

      // Veterinario: solo sus fichas
      if (roleName === 'Veterinario') {
        filters = { veterinario: { id: user.id } };
      }
      // Cliente: fichas de sus mascotas
      else if (roleName === 'Cliente' || roleName === 'Authenticated') {
        const misPacientes = await strapi.documents('api::paciente.paciente').findMany({
          filters: { propietario: { id: user.id } },
        });
        const pacienteIds = misPacientes.map((p: any) => p.documentId);
        
        if (pacienteIds.length === 0) {
          return { data: [] };
        }
        
        filters = { paciente: { documentId: { $in: pacienteIds } } };
      }
      // Recepcionista: todas las fichas (sin filtro)

      const fichas = await strapi.documents('api::ficha-medica.ficha-medica').findMany({
        filters,
        populate: {
          paciente: { populate: ['propietario'] },
          cita: true,
          veterinario: true,
        },
        sort: { fecha_atencion: 'desc' },
        status: 'published',
      });

      return { data: fichas };
    } catch (error: any) {
      console.error('❌ Error al obtener fichas médicas:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Obtener una ficha específica
   */
  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    try {
      const ficha = await strapi.documents('api::ficha-medica.ficha-medica').findOne({
        documentId: id,
        populate: {
          paciente: { populate: ['propietario'] },
          cita: true,
          veterinario: true,
        },
      });

      if (!ficha) {
        return ctx.notFound('Ficha médica no encontrada');
      }

      // Verificar acceso según rol
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      const roleName = userWithRole?.role?.name;

      // Cliente solo puede ver fichas de sus mascotas
      if (roleName === 'Cliente' || roleName === 'Authenticated') {
        const paciente = ficha.paciente as any;
        if (paciente?.propietario?.id !== user.id) {
          return ctx.forbidden('No tienes acceso a esta ficha médica');
        }
      }

      return { data: ficha };
    } catch (error: any) {
      console.error('❌ Error al obtener ficha médica:', error);
      ctx.throw(500, error.message);
    }
  },

  /**
   * Obtener historial médico de un paciente
   */
  async historialPaciente(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Debes estar autenticado');
    }

    const { pacienteDocumentId } = ctx.params;

    try {
      // Verificar que el usuario tenga acceso al paciente
      const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: user.id },
        populate: ['role'],
      });

      const roleName = userWithRole?.role?.name;

      // Si es cliente, verificar que sea su mascota
      if (roleName === 'Cliente' || roleName === 'Authenticated') {
        const paciente = await strapi.documents('api::paciente.paciente').findOne({
          documentId: pacienteDocumentId,
          populate: ['propietario'],
        });

        if (!paciente) {
          return ctx.notFound('Paciente no encontrado');
        }

        const propietario = paciente.propietario as any;
        if (propietario?.id !== user.id) {
          return ctx.forbidden('No tienes acceso a este paciente');
        }
      }

      const fichas = await strapi.documents('api::ficha-medica.ficha-medica').findMany({
        filters: { paciente: { documentId: pacienteDocumentId } },
        populate: {
          cita: true,
          veterinario: true,
        },
        sort: { fecha_atencion: 'desc' },
        status: 'published',
      });

      return { data: fichas };
    } catch (error: any) {
      console.error('❌ Error al obtener historial:', error);
      ctx.throw(500, error.message);
    }
  },
}));
