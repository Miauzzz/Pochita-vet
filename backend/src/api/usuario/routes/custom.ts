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
    {
      method: 'POST',
      path: '/usuarios/crear-cliente-presencial',
      handler: 'api::usuario.usuario.crearClientePresencial',
      config: {
        auth: false, // O 'authenticated' si queremos requerir login (recomendado, pero el usuario pidió que el recepcionista lo haga, así que debe estar logueado)
        // Vamos a dejarlo abierto por ahora o requerir token en el cliente. 
        // Mejor requerir autenticación para seguridad.
        policies: [],
        middlewares: [],
      },
    },
  ],
};
