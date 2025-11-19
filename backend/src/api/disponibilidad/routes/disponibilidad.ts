/**
 * disponibilidad router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Rutas personalizadas PRIMERO (antes de las rutas con parámetros)
    {
      method: 'GET',
      path: '/disponibilidads/por-mes',
      handler: 'disponibilidad.porMes',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/disponibilidads/por-fecha',
      handler: 'disponibilidad.porFecha',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/disponibilidads/veterinarios',
      handler: 'disponibilidad.veterinarios',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Rutas CRUD por defecto (DESPUÉS de las personalizadas)
    {
      method: 'GET',
      path: '/disponibilidads',
      handler: 'disponibilidad.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/disponibilidads/:id',
      handler: 'disponibilidad.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/disponibilidads',
      handler: 'disponibilidad.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/disponibilidads/:id',
      handler: 'disponibilidad.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/disponibilidads/:id',
      handler: 'disponibilidad.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
