/**
 * notificacion router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Rutas personalizadas PRIMERO
    {
      method: 'GET',
      path: '/notificaciones/mis-notificaciones',
      handler: 'notificacion.misNotificaciones',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/notificaciones/:id/marcar-leida',
      handler: 'notificacion.marcarLeida',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/notificaciones/marcar-todas-leidas',
      handler: 'notificacion.marcarTodasLeidas',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Rutas CRUD por defecto
    {
      method: 'GET',
      path: '/notificaciones',
      handler: 'notificacion.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/notificaciones/:id',
      handler: 'notificacion.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/notificaciones',
      handler: 'notificacion.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/notificaciones/:id',
      handler: 'notificacion.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/notificaciones/:id',
      handler: 'notificacion.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
