import { APIClient } from './base.js';

/**
 * API de Disponibilidades
 */
export class DisponibilidadesAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
    this.apiClient = this.client; // Alias para compatibilidad con dashboards
  }

  /**
   * Obtener disponibilidades por mes
   */
  async getDisponibilidadesMes(mes, anio, veterinarioId = null) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    const params = {
      'filters[fecha][$gte]': primerDia,
      'filters[fecha][$lte]': ultimaFecha,
      'filters[estado][$eq]': 'disponible',
      'populate': '*',
      'sort[0]': 'fecha:asc',
      'sort[1]': 'hora_inicio:asc'
    };

    if (veterinarioId) {
      params['filters[veterinario][id][$eq]'] = veterinarioId;
    }

    console.log('📡 GET disponibilidades con filtros:', params);

    const response = await this.client.get('/api/disponibilidads', params);
    
    console.log('📥 Respuesta disponibilidades:', response);
    
    return response.data || [];
  }

  /**
   * Obtener disponibilidades por fecha específica
   */
  async getDisponibilidadesFecha(fecha, veterinarioId = null) {
    const params = {
      'filters[fecha][$eq]': fecha,
      'filters[estado][$eq]': 'disponible',
      'populate': '*',
      'sort[0]': 'hora_inicio:asc'
    };

    if (veterinarioId) {
      params['filters[veterinario][id][$eq]'] = veterinarioId;
    }

    const response = await this.client.get('/api/disponibilidads', params);
    return response.data || [];
  }

  /**
   * Crear disponibilidad (solo veterinario)
   */
  async crearDisponibilidad(datos) {
    const response = await this.client.post('/api/disponibilidads', {
      data: {
        fecha: datos.fecha,
        hora_inicio: datos.hora_inicio,
        hora_fin: datos.hora_fin
      }
    });
    return response.data;
  }

  /**
   * Eliminar disponibilidad
   */
  async eliminarDisponibilidad(documentId) {
    await this.client.delete(`/api/disponibilidads/${documentId}`);
    return true;
  }

  /**
   * Obtener veterinarios disponibles
   */
  async getVeterinarios() {
    const response = await this.client.get('/api/disponibilidads', {
      'populate': 'veterinario',
      'pagination[limit]': 100
    });

    // Extraer veterinarios únicos
    const veterinariosMap = new Map();
    (response.data || []).forEach(disp => {
      if (disp.veterinario?.id) {
        veterinariosMap.set(disp.veterinario.id, {
          id: disp.veterinario.id,
          username: disp.veterinario.username,
          nombreCompleto: disp.veterinario.nombreCompleto || null
        });
      }
    });

    return Array.from(veterinariosMap.values());
  }
}
