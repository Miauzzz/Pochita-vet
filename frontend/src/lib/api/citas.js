import { APIClient } from './base.js';

/**
 * API de Citas
 */
export class CitasAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
  }

  /**
   * Obtener mis citas (filtra automáticamente por rol en backend)
   */
  async getMisCitas(filters = {}) {
    const params = {
      'populate': '*',
      'sort[0]': 'fecha:desc',
      'sort[1]': 'hora:desc'
    };

    // Agregar filtros opcionales
    if (filters.estado) {
      params['filters[estado][$eq]'] = filters.estado;
    }

    const response = await this.client.get('/api/citas', params);
    return response.data || [];
  }

  /**
   * Crear nueva cita (solicitud)
   */
  async solicitarCita(datos) {
    const response = await this.client.post('/api/citas', {
      data: {
        pacienteId: datos.pacienteId,
        veterinarioId: datos.veterinarioId,
        disponibilidadId: datos.disponibilidadId,
        fecha: datos.fecha,
        hora: datos.hora,
        motivo: datos.motivo || ''
      }
    });
    return response.data;
  }

  /**
   * Actualizar estado de cita
   */
  async actualizarCita(id, datos) {
    const response = await this.client.put(`/api/citas/${id}`, {
      data: datos
    });
    return response.data;
  }

  /**
   * Confirmar cita (solo recepcionista)
   */
  async confirmarCita(id) {
    return this.actualizarCita(id, { estado: 'confirmada' });
  }

  /**
   * Cancelar cita
   */
  async cancelarCita(id) {
    return this.actualizarCita(id, { estado: 'cancelada' });
  }
}
