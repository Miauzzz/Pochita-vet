/**
 * API de Notificaciones
 */

import { APIClient } from './base.js';

/**
 * API de Notificaciones
 */
export class NotificacionesAPI {
  constructor(jwt) {
    this.client = new APIClient(jwt);
  }

  /**
   * Obtener notificaciones del usuario autenticado
   */
  async getMisNotificaciones() {
    const response = await this.client.get('/api/notificaciones/mis-notificaciones');
    return response.data || [];
  }

  /**
   * Marcar notificación como leída
   */
  async marcarLeida(notificacionId) {
    const response = await this.client.put(`/api/notificaciones/${notificacionId}/marcar-leida`, {});
    return response.data;
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasLeidas() {
    const response = await this.client.post('/api/notificaciones/marcar-todas-leidas', {});
    return response.data;
  }

  /**
   * Obtener solo notificaciones no leídas
   */
  async getNoLeidas() {
    const todas = await this.getMisNotificaciones();
    return todas.filter(n => !n.leida);
  }

  /**
   * Obtener contador de notificaciones no leídas
   */
  async getContadorNoLeidas() {
    const noLeidas = await this.getNoLeidas();
    return noLeidas.length;
  }
}
