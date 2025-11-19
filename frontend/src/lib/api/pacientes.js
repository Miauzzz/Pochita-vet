import { APIClient } from './base.js';

/**
 * API de Pacientes (Mascotas)
 */
export class PacientesAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
  }

  /**
   * Obtener todos los pacientes del usuario
   * (filtra automáticamente por propietario en backend)
   */
  async getMisPacientes() {
    const response = await this.client.get('/api/pacientes', {
      'populate': '*',
      'sort[0]': 'nombre:asc'
    });
    return response.data || [];
  }

  /**
   * Obtener un paciente por ID
   */
  async getPaciente(id) {
    const response = await this.client.get(`/api/pacientes/${id}`, {
      'populate': '*'
    });
    return response.data;
  }

  /**
   * Crear nuevo paciente
   */
  async crearPaciente(datos) {
    const response = await this.client.post('/api/pacientes', {
      data: datos
    });
    return response.data;
  }

  /**
   * Actualizar paciente
   */
  async actualizarPaciente(id, datos) {
    const response = await this.client.put(`/api/pacientes/${id}`, {
      data: datos
    });
    return response.data;
  }

  /**
   * Eliminar paciente
   */
  async eliminarPaciente(documentId) {
    await this.client.delete(`/api/pacientes/${documentId}`);
    return true;
  }
}
