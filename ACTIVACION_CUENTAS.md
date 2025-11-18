# 🔐 Sistema de Activación de Cuentas - Pochita Vet

## 📋 Resumen del Flujo Implementado

Este sistema permite que un administrador o recepcionista cree cuentas de empleados (veterinarios/recepcionistas) que luego deben ser activadas por el propio empleado.

### Flujo completo:

```
1. Admin crea usuario en Strapi panel
   ↓
2. Backend genera token de activación (lifecycle)
   ↓
3. Admin envía link al empleado
   ↓
4. Empleado accede a /activar-cuenta?token=xxx&email=xxx
   ↓
5. Empleado ingresa su nombre + contraseña
   ↓
6. Backend actualiza user + crea registro en usuarios
   ↓
7. Login automático → Dashboard
```

## 🚀 Cómo Probar

### 1. Iniciar el Backend

```powershell
cd backend
pnpm dev
```

### 2. Iniciar el Frontend

```powershell
cd frontend
pnpm dev
```

### 3. Crear un Usuario de Prueba

**Opción A: Desde el Panel de Admin de Strapi**

1. Ve a `http://localhost:1337/admin`
2. Login con tus credenciales de admin
3. Ve a `Content Manager` → `User (plugin::users-permissions.user)`
4. Click en `Create new entry`
5. Rellena:
   - **Email**: `veterinario@test.com`
   - **Username**: `vet-test` (opcional, se generará automático)
   - **Role**: Selecciona `Veterinario` (asegúrate de tener este rol creado)
   - **Confirmed**: DEJAR EN `false` ❌
   - **Password**: NO establecer (dejar vacío)
6. Click en `Save`

**Opción B: Usando la API REST (Postman/Thunder Client)**

```http
POST http://localhost:1337/api/auth/local/register
Content-Type: application/json

{
  "username": "vet-test",
  "email": "veterinario@test.com",
  "password": "temporal123"
}
```

Luego actualiza el usuario para que `confirmed = false` desde el panel de admin.

### 4. Obtener el Link de Activación

Después de crear el usuario, verás en la **consola del backend** algo como:

```
╔════════════════════════════════════════════════════════════════╗
║             LINK DE ACTIVACIÓN GENERADO                        ║
╠════════════════════════════════════════════════════════════════╣
║ Email: veterinario@test.com                                    ║
║ Token: 3f7a8b2c...                                             ║
║ Link:  http://localhost:4321/activar-cuenta?token=...         ║
╚════════════════════════════════════════════════════════════════╝
```

### 5. Activar la Cuenta

1. **Copia el link** de la consola
2. **Pégalo en el navegador**
3. Verás la página de activación con:
   - Email prellenado (no editable)
   - Campo para nombre completo
   - Campos para contraseña
4. Rellena:
   - **Nombre**: `Dr. Juan Pérez`
   - **Contraseña**: `MiPassword123!`
   - **Confirmar contraseña**: `MiPassword123!`
5. Click en `Activar cuenta`

### 6. Verificación

Si todo salió bien:

✅ Verás la pantalla de éxito con el nombre ingresado  
✅ Click en "Ir a mi dashboard" te redirigirá a `/dashboard/veterinario`  
✅ La sesión estará guardada en localStorage

## 🔍 Verificar en Base de Datos

### En Strapi Admin Panel:

**Content-Type: User (users-permissions)**
- `email`: veterinario@test.com
- `confirmed`: `true` ✅
- `resetPasswordToken`: `null` (limpiado)
- `password`: [hash generado]

**Content-Type: Usuario (api::usuario)**
- `nombre`: Dr. Juan Pérez
- `correo`: veterinario@test.com
- `tipo_usuario`: veterinario
- `user`: [relación al user de arriba]

## 🐛 Debugging

### Ver logs en consola del backend:

```
>>> afterCreate de plugin::users-permissions.user EJECUTADO <<<
Usuario creado: { id: 1, email: 'veterinario@test.com', ... }
>>> Perfil Usuario creado: { id: 1, correo: '...', tipo_usuario: 'veterinario' }

📧 Nueva cuenta de empleado
Email    : veterinario@test.com
Rol      : Veterinario
Tipo     : veterinario

🔗 LINK DE ACTIVACIÓN (cópialo y envíalo al empleado):
http://localhost:4321/activar-cuenta?token=...&email=...
```

### Ver logs en consola del navegador (F12):

```
Parámetros de activación: { email: 'veterinario@test.com', token: '...' }
Enviando solicitud de activación...
Respuesta de activación: 200 { message: 'Cuenta activada exitosamente', ... }
Cuenta activada exitosamente
Redirigiendo al dashboard: veterinario
```

## 📝 Archivos Modificados/Creados

### Backend:
- ✅ `src/extensions/users-permissions/strapi-server.ts` - Lifecycle afterCreate
- ✅ `src/api/usuario/controllers/usuario.ts` - Endpoint `activarCuenta`
- ✅ `src/api/usuario/routes/usuario.ts` - Ruta POST `/usuarios/activar-cuenta`

### Frontend:
- ✅ `src/lib/activarCuenta.js` - Lógica de Alpine.js
- ✅ `src/pages/activar-cuenta.astro` - Página de activación

## 🔮 Próximos Pasos (TODO)

- [ ] Implementar envío de emails real (Strapi Email Plugin o servicio externo)
- [ ] Agregar expiración de tokens (ej: 24 horas)
- [ ] Permitir reenvío de link de activación
- [ ] Panel de admin para gestionar usuarios pendientes de activación
- [ ] Validación de email con código de verificación adicional

## ⚠️ Notas Importantes

1. **No usar el flujo de registro estándar** para crear empleados. Solo debe usarse el panel de admin.
2. El token se guarda en `resetPasswordToken` (no en `confirmationToken`).
3. El `tipo_usuario` se sincroniza automáticamente según el `role` de Strapi.
4. Si cambias el rol en Strapi, el `tipo_usuario` se actualizará automáticamente (lifecycle `afterUpdate`).

## 🔐 Variables de Entorno

Asegúrate de tener en tu `.env` del backend:

```env
FRONTEND_URL=http://localhost:4321
```

Y en el frontend:

```env
PUBLIC_STRAPI_URL=http://localhost:1337
```
