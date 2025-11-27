import { APIClient } from './base.js';

/**
 * API de Fichas Médicas
 */
export class FichasMedicasAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
  }

  /**
   * Obtener todas las fichas médicas (filtradas por rol en backend)
   */
  async getMisFichas() {
    const response = await this.client.get('/api/fichas-medicas', {
      'populate': '*',
      'sort[0]': 'fecha_atencion:desc'
    });
    return response.data || [];
  }

  /**
   * Obtener una ficha médica por su documentId
   */
  async getFicha(documentId) {
    const response = await this.client.get(`/api/fichas-medicas/${documentId}`, {
      'populate': '*'
    });
    return response.data;
  }

  /**
   * Obtener historial médico de un paciente
   */
  async getHistorialPaciente(pacienteDocumentId) {
    const response = await this.client.get(`/api/fichas-medicas/historial/${pacienteDocumentId}`);
    return response.data || [];
  }

  /**
   * Crear nueva ficha médica (solo veterinarios)
   */
  async crearFicha(datos) {
    const response = await this.client.post('/api/fichas-medicas', {
      data: {
        pacienteId: datos.pacienteId,
        pacienteDocumentId: datos.pacienteDocumentId,
        citaDocumentId: datos.citaDocumentId || null,
        fecha_atencion: datos.fecha_atencion || new Date().toISOString(),
        motivo_consulta: datos.motivo_consulta,
        sintomas: datos.sintomas || null,
        diagnostico: datos.diagnostico,
        tratamiento: datos.tratamiento,
        observaciones: datos.observaciones || null,
        peso_actual: datos.peso_actual || null,
        temperatura: datos.temperatura || null,
        frecuencia_cardiaca: datos.frecuencia_cardiaca || null,
        frecuencia_respiratoria: datos.frecuencia_respiratoria || null,
        procedimientos_realizados: datos.procedimientos_realizados || null,
        requiere_seguimiento: datos.requiere_seguimiento || false,
        fecha_proximo_control: datos.fecha_proximo_control || null,
        medicamentos_recetados: datos.medicamentos_recetados || null,
        indicaciones_receta: datos.indicaciones_receta || null
      }
    });
    return response.data;
  }

  /**
   * Actualizar ficha médica
   */
  async actualizarFicha(documentId, datos) {
    const response = await this.client.put(`/api/fichas-medicas/${documentId}`, {
      data: datos
    });
    return response.data;
  }
}
