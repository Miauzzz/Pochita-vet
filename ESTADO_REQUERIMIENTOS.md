# 📋 ESTADO DE REQUERIMIENTOS - POCHITA VET

**Fecha:** 19 de noviembre de 2025  
**Proyecto:** Sistema de Gestión Veterinaria  
**Stack:** Strapi v5 (Backend) + Astro (Frontend)

---
# Cuentas de acceso para pruebas

**Strapi access**
Superadmin : test@test.com
wtmk

admin : admin@admin.com
pass  : Admin123.

**Veterinaria**
correo : asmith.vet@pochita.cl
pass   : veterinario

correo : jdoe.rec@pochita.cl 
pass   : recepcionista

**Clientes**
correo : test@cliente.com
pass   : prueba123

correo : pepitog@gmail.com
pass   : cliente123
---

## ✅ REQUERIMIENTOS COMPLETADOS AL 100%

### **HU002 - Agendar hora de atención (Recepcionista)**

**Estado:** ✅ **COMPLETADO AL 100%**

#### Condiciones cumplidas:
- ✅ **Visualizar el mes en curso con los bloques de atención**
  - Componente: `CalendarioDisponibilidad.astro`
  - Ubicación: Dashboard Recepcionista
  - Funcionalidad: Calendario completo con navegación mes a mes
  - Vista: Muestra todas las disponibilidades del sistema

- ✅ **Mostrar qué bloques están disponibles**
  - Visual: Verde para "disponible", Gris para "ocupado"
  - Estado: Cada bloque muestra si tiene cita asociada
  - Tiempo real: Actualización automática cada 10 segundos

- ✅ **Identificar por veterinario la disponibilidad**
  - Cada bloque muestra: Nombre del veterinario
  - Agrupación: Por fecha y luego por veterinario
  - Populate: Relación veterinario → usuario para obtener nombre completo

#### Archivos involucrados:
- Frontend: `frontend/src/components/dashboard/recepcionista/CalendarioDisponibilidad.astro`
- Backend: `backend/src/api/disponibilidad/controllers/disponibilidad.ts`
- Backend: `backend/src/api/disponibilidad/services/disponibilidad.ts`

---

### **HU005 - Alerta cuando veterinario cancela horario**

**Estado:** ✅ **COMPLETADO AL 100%**

#### Condiciones cumplidas:
- ✅ **Notificación cuando veterinario cancela horario**
  - Endpoint: `DELETE /api/disponibilidads/:id`
  - Lógica implementada (líneas 265-340 del controller):
    1. Detecta si la disponibilidad eliminada tiene cita asociada
    2. Cancela automáticamente la cita (`estado: 'cancelada'`)
    3. **Notifica a TODOS los recepcionistas** con:
       - Tipo: `cancelacion`
       - Título: "Veterinario canceló disponibilidad"
       - Mensaje: Incluye veterinario, fecha, hora, y mascota afectada
       - Relación: Link a la cita afectada (para scroll automático)
    4. **Notifica al cliente** (propietario del paciente) con:
       - Tipo: `cancelacion`
       - Título: "Cita cancelada"
       - Mensaje: Información completa y sugerencia de reagendar

- ✅ **Comunicación completa**:
  - Panel de notificaciones funcional en recepcionista
  - Panel de notificaciones funcional en cliente
  - Contador de notificaciones no leídas (badge)
  - Click en notificación → scroll automático a cita afectada
  - Máximo 3 notificaciones visibles con scroll

#### Flujo completo:
```
Veterinario elimina disponibilidad
         ↓
¿Tiene cita asociada?
         ↓ SI
    1. Cancelar cita automáticamente
    2. Notificar TODOS los recepcionistas
    3. Notificar al cliente (propietario)
         ↓
Recepcionistas ven notificación en panel
Cliente ve notificación en panel
         ↓
Click en notificación → scroll a cita cancelada
```

#### Archivos involucrados:
- Backend: `backend/src/api/disponibilidad/controllers/disponibilidad.ts` (método `delete`)
- Backend: `backend/src/utils/notificaciones.ts` (helpers)
- Frontend: `frontend/src/pages/dashboard/recepcionista.astro` (panel notificaciones)
- Frontend: `frontend/src/pages/dashboard/cliente.astro` (panel notificaciones)

---

## 📋 REQUERIMIENTOS OPCIONALES

### **HU006 - Replanificar horas de atención (Recepcionista)**

**Estado:** ⏳ **PLANIFICADO - NO IMPLEMENTADO**

#### Condiciones solicitadas:
- ⏳ Cuando se cancela horario por parte del veterinario
- ⏳ Mostrar antecedentes de pacientes que tenían hora

#### Planificación propuesta:

**Funcionalidad sugerida:**

1. **Backend - Nuevo endpoint:**
   ```typescript
   GET /api/citas/afectadas-por-disponibilidad/:disponibilidadId
   ```
   - Retorna todas las citas que fueron canceladas por una disponibilidad específica
   - Incluye: Paciente, propietario, fecha original, hora, motivo

2. **Frontend - Modal de Replanificación:**
   - Ubicación: Dashboard Recepcionista
   - Trigger: Click en notificación de cancelación con link especial
   - Contenido:
     - Lista de citas afectadas
     - Datos del paciente (nombre, especie, propietario)
     - Hora original cancelada
     - Botón "Replanificar" por cada cita
   
3. **Proceso de Replanificación:**
   - Seleccionar nueva disponibilidad (mismo u otro veterinario)
   - Actualizar cita con nueva fecha/hora/veterinario
   - Cambiar estado de `cancelada` a `pendiente`
   - Notificar al cliente del cambio con nueva información

**Estimación de implementación:**
- Backend: 2-3 horas
- Frontend: 3-4 horas
- Testing: 1-2 horas
- **Total: ~8 horas**

#### Archivos a crear/modificar:
- `backend/src/api/cita/controllers/cita.ts` (nuevo endpoint)
- `frontend/src/components/dashboard/recepcionista/ModalReplanificar.astro` (nuevo)
- `frontend/src/pages/dashboard/recepcionista.astro` (integración modal)

---

## 📊 RESUMEN GENERAL

### Completados:
- ✅ **HU002** - Agendar hora de atención (100%)
- ✅ **HU005** - Alerta cancelación veterinario (100%)

### Pendientes opcionales:
- ⏳ **HU006** - Replanificar horas (0% - planificado)

### Funcionalidades adicionales implementadas:
- ✅ Sistema completo de autenticación con roles
- ✅ Protección de rutas (sin parpadeo)
- ✅ CRUD mascotas (Cliente)
- ✅ Solicitar citas (Cliente)
- ✅ Confirmar/rechazar citas (Recepcionista)
- ✅ CRUD disponibilidades (Veterinario)
- ✅ Panel notificaciones (Cliente, Recepcionista)
- ✅ Ordenamiento citas por fecha/hora
- ✅ Auto-reload inteligente (preserva estado formularios)
- ✅ Smooth scroll a elementos desde notificaciones

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

### Prioridad ALTA:
1. **Testing completo de HU005:**
   - Crear disponibilidad como veterinario
   - Crear cita como cliente en esa disponibilidad
   - Eliminar disponibilidad como veterinario
   - Verificar notificación en recepcionista
   - Verificar notificación en cliente
   - Verificar que cita se canceló automáticamente

2. **Verificar permisos Strapi:**
   - Settings → Users & Permissions → Roles → Authenticated
   - Marcar permisos en `Notificacion`: `misNotificaciones`, `marcarLeida`, `marcarTodasLeidas`

### Prioridad MEDIA:
3. **Implementar HU006** (si se considera necesario)

4. **Panel notificaciones veterinario:**
   - Similar a cliente/recepcionista
   - Notificar cuando confirman cita para él

### Prioridad BAJA:
5. **Mejoras opcionales:**
   - Recordatorios automáticos 24h antes
   - Historial médico mascotas
   - Reportes y estadísticas
   - Exportar/imprimir agenda

---

## 🐛 TESTING CHECKLIST

### HU002 - Agendar hora:
- [ ] Login como recepcionista
- [ ] Ver calendario de disponibilidades
- [ ] Navegar entre meses
- [ ] Verificar que muestra veterinarios
- [ ] Verificar estados (disponible/ocupado)

### HU005 - Alerta cancelación:
- [ ] Login como veterinario
- [ ] Crear disponibilidad
- [ ] Login como cliente
- [ ] Agendar cita en esa disponibilidad
- [ ] Login como veterinario
- [ ] Eliminar disponibilidad
- [ ] Verificar notificación en panel recepcionista
- [ ] Verificar notificación en panel cliente
- [ ] Verificar que cita cambió a "cancelada"
- [ ] Click en notificación → scroll a cita

---

**Última actualización:** 19 de noviembre de 2025
