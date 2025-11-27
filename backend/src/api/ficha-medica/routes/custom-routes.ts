/**
 * Rutas personalizadas para ficha-medica
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/fichas-medicas/historial/:pacienteDocumentId',
      handler: 'ficha-medica.historialPaciente',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
