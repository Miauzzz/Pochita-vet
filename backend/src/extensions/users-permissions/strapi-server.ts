import crypto from 'crypto';

// Función para convertir nombre a slug
function slugifyNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

export default (plugin: any) => {
  console.log('\n>>> strapi-server.ts de users-permissions CARGADO <<<\n');

  const originalContentTypes = plugin.contentTypes;

  if (originalContentTypes && originalContentTypes.user) {
    console.log('\n>>> Content-type user encontrado, agregando lifecycles <<<\n');

    const originalLifecycles = originalContentTypes.user.lifecycles || {};

    originalContentTypes.user.lifecycles = {
      ...originalLifecycles,

      // CUANDO SE CREA UN USER
      async afterCreate(event: any) {
        const { result } = event;

        console.log('\n>>> afterCreate de plugin::users-permissions.user EJECUTADO <<<');
        
        // Obtener el user completo con el rol populado
        const userWithRole = await strapi.query('plugin::users-permissions.user').findOne({
          where: { id: result.id },
          populate: ['role'],
        });
        
        console.log('Usuario creado:', {
          id: userWithRole.id,
          email: userWithRole.email,
          username: userWithRole.username,
          confirmed: userWithRole.confirmed,
          role: userWithRole.role?.name || '(sin rol)',
        });

        // 1) Mapear rol de Strapi a tipo_usuario
        let tipoUsuario = 'cliente';
        if (userWithRole.role?.name === 'Veterinario') tipoUsuario = 'veterinario';
        else if (userWithRole.role?.name === 'Recepcionista') tipoUsuario = 'recepcionista';

        // 2) Crear perfil en collection Usuario si no existe
        const existing = await strapi.query('api::usuario.usuario').findOne({
          where: { user: userWithRole.id },
        });

        if (!existing) {
          // Generar nombre_usuario (slug) a partir del username
          const nombreUsuarioSlug = userWithRole.username 
            ? slugifyNombre(userWithRole.username)
            : userWithRole.email?.split('@')[0] || '';

          const perfil = await strapi.query('api::usuario.usuario').create({
            data: {
              nombre_usuario: nombreUsuarioSlug,
              nombre: userWithRole.username || '', // nombre completo para clientes, vacío para empleados
              correo: userWithRole.email,
              tipo_usuario: tipoUsuario,
              fecha_registro: new Date(),
              user: userWithRole.id,
            },
          });

          console.log('>>> Perfil Usuario creado:', {
            id: perfil.id,
            correo: perfil.correo,
            tipo_usuario: perfil.tipo_usuario,
          });
        } else {
          console.log('>>> Perfil Usuario ya existía, no se crea de nuevo');
        }

        // 3) Generar token de activación (resetPasswordToken)
        const token = crypto.randomBytes(32).toString('hex');

        await strapi.query('plugin::users-permissions.user').update({
          where: { id: userWithRole.id },
          data: { resetPasswordToken: token },
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
        const link = `${frontendUrl}/activar-cuenta?token=${token}&email=${encodeURIComponent(
          userWithRole.email,
        )}`;

        console.log('\n📧 Nueva cuenta de empleado');
        console.log('Username :', userWithRole.username);
        console.log('Email    :', userWithRole.email);
        console.log('Rol      :', userWithRole.role?.name || '(sin rol)');
        console.log('Tipo     :', tipoUsuario);
        console.log('\n🔗 LINK DE ACTIVACIÓN (cópialo y envíalo al empleado):');
        console.log(link);
        console.log('========================================\n');
      },

      // CUANDO SE ACTUALIZA UN USER (por ejemplo, cambio de rol)
      async afterUpdate(event: any) {
        const { result, params } = event;

        console.log('\n>>> afterUpdate de plugin::users-permissions.user EJECUTADO <<<');
        console.log('Usuario actualizado:', {
          id: result.id,
          email: result.email,
          role: result.role?.name,
        });

        // Si en la actualización viene un cambio de rol
        if (params?.data?.role) {
          // Buscar el rol por ID
          const role = await strapi.query('plugin::users-permissions.role').findOne({
            where: { id: params.data.role },
          });

          let tipoUsuario = 'cliente';
          if (role?.name === 'Veterinario') tipoUsuario = 'veterinario';
          else if (role?.name === 'Recepcionista') tipoUsuario = 'recepcionista';

          // Buscar el perfil Usuario vinculado a este user
          const usuarioRecord = await strapi.query('api::usuario.usuario').findOne({
            where: { user: result.id },
          });

          if (usuarioRecord) {
            await strapi.query('api::usuario.usuario').update({
              where: { id: usuarioRecord.id },
              data: { tipo_usuario: tipoUsuario },
            });

            console.log(
              `>>> Tipo_usuario sincronizado: ${result.email} → ${tipoUsuario}\n`,
            );
          } else {
            console.log(
              '>>> No se encontró perfil Usuario para sincronizar tipo_usuario\n',
            );
          }
        }
      },
    };
  } else {
    console.warn(
      '\n>>> [WARN] No se encontró plugin.contentTypes.user en users-permissions <<<\n',
    );
  }

  return plugin;
};
