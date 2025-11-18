# 🧪 Test de Activación de Cuenta

## Pasos para verificar:

### 1. Verificar el usuario en Strapi Admin

Ve a: http://localhost:1337/admin

1. Content Manager → User (users-permissions)
2. Encuentra el usuario con email: `cmorada.vet@pochita.cl`
3. Verifica:
   - ✅ **Email**: cmorada.vet@pochita.cl
   - ✅ **Reset password token**: debe tener un token largo (64 caracteres hex)
   - ✅ **Confirmed**: debe estar en `false`
   - ✅ **Role**: debe tener asignado un rol (Veterinario, Recepcionista, etc.)

### 2. Si el token NO coincide:

El token que aparece en la consola del backend cuando creaste el usuario es:
```
cd2358a0eadd918390de7f53fdb16cf02a8bbcbe4ed1cb191bdb05776b2f9a7b
```

**ACTUALIZA** el campo `resetPasswordToken` del usuario en Strapi Admin con ese token exacto.

### 3. Probar la activación

1. Abre el navegador en modo incógnito (Ctrl+Shift+N)
2. Ve a la URL:
```
http://localhost:4321/activar-cuenta?token=cd2358a0eadd918390de7f53fdb16cf02a8bbcbe4ed1cb191bdb05776b2f9a7b&email=cmorada.vet@pochita.cl
```

3. Abre la consola del navegador (F12)
4. Deberías ver:
```
Parámetros de activación: {email: 'cmorada.vet@pochita.cl', token: '...'}
```

5. Rellena el formulario:
   - **Nombre**: Camilo Morada
   - **Contraseña**: Password123!
   - **Confirmar**: Password123!

6. Click en "Activar cuenta"

### 4. Verificar en consola del backend

Deberías ver:

```
=== Solicitud de activación de cuenta ===
Email: cmorada.vet@pochita.cl
Token recibido: cd2358a0eadd918390de7f53fdb16cf02a8bbcbe4ed1cb191bdb05776b2f9a7b
Nombre: Camilo Morada
Usuario encontrado: ID 1
Detalles del usuario: { id: 1, email: '...', role: {...} }
Usuario actualizado en users-permissions: 1
Usuario en collection encontrado: No encontrado
Creando registro en collection usuarios...
Rol del user: { id: X, name: 'Veterinario' }
Nombre del rol: Veterinario
Tipo de usuario determinado: veterinario
Registro creado en usuarios: 1 { ... }
JWT generado para login automático
Activación exitosa
=== Fin de activación ===
```

### 5. Verificar resultado

**En Strapi Admin:**

1. User (users-permissions):
   - confirmed: `true` ✅
   - resetPasswordToken: `null` ✅
   - username: `cmorada.vet` ✅
   - password: [hash] ✅

2. Usuario (api::usuario):
   - nombre: Camilo Morada ✅
   - correo: cmorada.vet@pochita.cl ✅
   - tipo_usuario: veterinario ✅
   - user: [relación al user de arriba] ✅

**En el navegador:**
- Deberías ver la pantalla de éxito
- Click en "Ir a mi dashboard" → `/dashboard/veterinario`

### 6. Probar login

1. Ve a: http://localhost:4321/login
2. Ingresa:
   - Email: `cmorada.vet@pochita.cl`
   - Contraseña: `Password123!`
3. Click en "Acceder"
4. Deberías ser redirigido a `/dashboard/veterinario`

## ⚠️ Problemas comunes

### "Token de activación inválido"
- El token en la URL no coincide con el `resetPasswordToken` del usuario en la BD
- Verifica que copiaste el token completo de la consola
- Actualiza manualmente el campo en Strapi Admin

### "No se encontró el usuario en la colección usuarios"
- El endpoint creó el user en users-permissions pero falló al crear en usuarios
- Verifica los logs del backend para ver el error exacto
- Puede ser un problema de permisos o relaciones

### Login no funciona
- Verifica que `confirmed = true` en users-permissions
- Verifica que existe el registro en la collection usuarios
- Abre consola del navegador (F12) y revisa errores
