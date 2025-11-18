/**
 * Custom routes for usuario
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/usuarios/activar-cuenta',
      handler: 'api::usuario.usuario.activarCuenta',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
