const STRAPI_URL = 'http://localhost:1337';

// ========== Funciones de Disponibilidad ==========

/**
 * Obtener disponibilidades (filtra automáticamente por veterinario si está autenticado)
 * @param {string|null} jwt - Token de autenticación (opcional)
 */
export async function obtenerDisponibilidades(jwt = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads`, { headers });
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error);
    return [];
  }
}

/**
 * Obtener disponibilidades por mes y año
 * @param {number} mes - Mes (1-12)
 * @param {number} anio - Año
 * @param {number|null} veterinarioId - ID del veterinario (opcional)
 * @param {string|null} jwt - Token de autenticación (opcional)
 */
export async function obtenerDisponibilidadesPorMes(mes, anio, veterinarioId = null, jwt = null) {
  try {
    // Calcular primer y último día del mes
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    
    // Usar populate para incluir veterinario y cita
    let url = `${STRAPI_URL}/api/disponibilidads?filters[fecha][$gte]=${primerDia}&filters[fecha][$lte]=${ultimaFecha}&populate[veterinario]=*&populate[cita]=*&sort[0]=fecha:asc&sort[1]=hora_inicio:asc`;
    
    if (veterinarioId) {
      url += `&filters[veterinario][id][$eq]=${veterinarioId}`;
    }
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    
    console.log('Fetching disponibilidades con JWT:', jwt ? 'Sí' : 'No');
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en respuesta:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('Datos recibidos del servidor (primeros 2):', data.data?.slice(0, 2));
    return data.data || [];
  } catch (error) {
    console.error('Error al obtener disponibilidades por mes:', error);
    return [];
  }
}

/**
 * Obtener disponibilidades por fecha específica
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {number|null} veterinarioId - ID del veterinario (opcional)
 */
export async function obtenerDisponibilidadesPorFecha(fecha, veterinarioId = null) {
  try {
    let url = `${STRAPI_URL}/api/disponibilidads/por-fecha?fecha=${fecha}`;
    
    if (veterinarioId) {
      url += `&veterinario=${veterinarioId}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error al obtener disponibilidades por fecha:', error);
    return [];
  }
}

/**
 * Obtener disponibilidad por veterinario
 * @param {number} veterinarioId - ID del veterinario
 * @param {string|null} jwt - Token de autenticación (opcional pero recomendado)
 */
export async function obtenerDisponibilidadPorVeterinario(veterinarioId, jwt = null) {
  try {
    if (!veterinarioId) {
      console.error('ID de veterinario no proporcionado');
      return [];
    }
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    
    // En Strapi v5, las relaciones no vienen automáticamente con populate=*
    // Necesitamos especificar cada campo
    const response = await fetch(
      `${STRAPI_URL}/api/disponibilidads?populate[veterinario][fields][0]=id&populate[veterinario][fields][1]=username&populate[cita]=*`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en la respuesta:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('Respuesta del servidor (todas):', data);
    
    if (data.data && data.data.length > 0) {
      console.log('Primera disponibilidad completa:', data.data[0]);
      console.log('Veterinario de la primera:', data.data[0].veterinario);
    }
    
    // Filtrar por veterinario
    const disponibilidadesFiltradas = (data.data || []).filter(d => {
      // Acceder correctamente al ID del veterinario
      const vetId = d.veterinario?.id;
      console.log('Disponibilidad:', d.id, 'Veterinario ID:', vetId, 'Buscando:', veterinarioId);
      return vetId == veterinarioId;
    });
    
    console.log('Disponibilidades filtradas:', disponibilidadesFiltradas);
    return disponibilidadesFiltradas;
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return [];
  }
}

/**
 * Obtener disponibilidad por fecha (versión antigua)
 * @deprecated Usar obtenerDisponibilidadesPorFecha
 */
export async function obtenerDisponibilidadPorFecha(fecha) {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/disponibilidads?filters[fecha][$eq]=${fecha}&populate=*`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return [];
  }
}

/**
 * Obtener lista de veterinarios extrayéndolos de las disponibilidades
 * (No requiere permisos especiales, solo find en Disponibilidad)
 */
export async function obtenerVeterinarios(jwt = null) {
  try {
    // Obtener todas las disponibilidades con veterinarios populated
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    }
    
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads?populate=*&pagination[limit]=100`, { headers });
    
    if (!response.ok) {
      console.error('Error obteniendo disponibilidades:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    // Extraer veterinarios únicos
    const veterinariosMap = new Map();
    
    (data.data || []).forEach((disp) => {
      if (disp.veterinario?.id) {
        veterinariosMap.set(disp.veterinario.id, {
          id: disp.veterinario.id,
          username: disp.veterinario.username || '',
          nombreCompleto: disp.veterinario.nombreCompleto || null,
        });
      }
    });
    
    // Convertir a array y ordenar
    return Array.from(veterinariosMap.values()).sort((a, b) => {
      const nombreA = a.nombreCompleto || a.username || '';
      const nombreB = b.nombreCompleto || b.username || '';
      return nombreA.localeCompare(nombreB);
    });
  } catch (error) {
    console.error('Error al obtener veterinarios:', error);
    return [];
  }
}

/**
 * Crear nueva disponibilidad
 * @param {Object} datos - {fecha, hora_inicio, hora_fin, jwt}
 */
export async function crearDisponibilidad(datos) {
  try {
    const { fecha, hora_inicio, hora_fin, jwt } = datos;
    
    // Convertir formato de hora HH:mm a HH:mm:ss.SSS
    const formatearHora = (hora) => {
      if (!hora) return null;
      // Si ya tiene el formato completo, retornarlo
      if (hora.includes('.')) return hora;
      // Si tiene formato HH:mm:ss, agregar milisegundos
      if (hora.split(':').length === 3) return `${hora}.000`;
      // Si tiene formato HH:mm, agregar segundos y milisegundos
      return `${hora}:00.000`;
    };
    
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: {
          fecha,
          hora_inicio: formatearHora(hora_inicio),
          hora_fin: formatearHora(hora_fin),
          estado: 'disponible',
          disponible: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al crear disponibilidad');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al crear disponibilidad:', error);
    throw error;
  }
}

/**
 * Eliminar disponibilidad
 * @param {string} documentId - Document ID de la disponibilidad
 * @param {string} jwt - Token de autenticación
 */
export async function eliminarDisponibilidad(documentId, jwt) {
  try {
    console.log('Eliminando disponibilidad con documentId:', documentId);
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      // Si es 404, el registro ya no existe (fue eliminado)
      if (response.status === 404) {
        console.warn(`Disponibilidad ${documentId} ya fue eliminada`);
        return { success: true };
      }
      
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al eliminar disponibilidad');
    }

    // 204 No Content es exitoso
    console.log('Disponibilidad eliminada correctamente');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar disponibilidad:', error);
    throw error;
  }
}

/**
 * Actualizar disponibilidad
 * @param {string} documentId - Document ID de la disponibilidad
 * @param {Object} datos - {fecha, hora_inicio, hora_fin, estado, disponible}
 * @param {string} jwt - Token de autenticación
 */
export async function actualizarDisponibilidad(documentId, datos, jwt) {
  try {
    // Convertir formato de hora si es necesario
    const formatearHora = (hora) => {
      if (!hora) return null;
      if (hora.includes('.')) return hora;
      if (hora.split(':').length === 3) return `${hora}.000`;
      return `${hora}:00.000`;
    };

    const datosFormateados = {
      ...datos,
    };

    if (datos.hora_inicio) {
      datosFormateados.hora_inicio = formatearHora(datos.hora_inicio);
    }
    if (datos.hora_fin) {
      datosFormateados.hora_fin = formatearHora(datos.hora_fin);
    }

    console.log('Actualizando disponibilidad con documentId:', documentId, datosFormateados);
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        data: datosFormateados,
      }),
    });

    if (!response.ok) {
      // Si es 404, el registro no existe
      if (response.status === 404) {
        throw new Error('Esta disponibilidad ya no existe. La página se recargará.');
      }
      
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al actualizar disponibilidad');
    }

    const data = await response.json();
    console.log('Disponibilidad actualizada correctamente');
    return data.data;
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    throw error;
  }
}

/**
 * Obtener pacientes
 * @param {string|null} jwt - Token de autenticación
 */
export async function obtenerPacientes(jwt = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const response = await fetch(`${STRAPI_URL}/api/pacientes?fields[0]=id&fields[1]=nombre&sort=nombre:asc`, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al obtener pacientes:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    return [];
  }
}

/**
 * Crear cita
 * @param {Object} datos - {fecha, hora, motivo, pacienteId, veterinarioId, recepcionistaId, disponibilidadId, jwt}
 */
export async function crearCita(datos) {
  try {
    const { fecha, hora, motivo, pacienteId, veterinarioId, recepcionistaId, disponibilidadId, disponibilidadDocumentId, jwt } = datos;

    const body = {
      data: {
        fecha,
        hora,
        motivo: motivo || '',
        pacienteId: pacienteId || null,
        veterinarioId: veterinarioId || null,
        recepcionistaId: recepcionistaId || null,
        disponibilidadId: disponibilidadId || null,
        disponibilidadDocumentId: disponibilidadDocumentId || null,
      },
    };

    const response = await fetch(`${STRAPI_URL}/api/citas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error al crear cita:', response.status, errorText);
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error?.message || 'Error al crear cita');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error en crearCita:', error);
    throw error;
  }
}

/**
 * Obtener citas (filtradas automáticamente por rol en backend)
 * @param {string} jwt - Token de autenticación
 */
export async function obtenerCitas(jwt) {
  try {
    console.log('📡 Fetching citas from API...');
    const url = `${STRAPI_URL}/api/citas?populate[paciente]=*&populate[veterinario]=*&populate[recepcionista]=*&populate[disponibilidad]=*&sort[0]=fecha:desc&sort[1]=hora:desc`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Datos recibidos:', data);
    console.log('Total citas:', data.data?.length || 0);
    return data.data || [];
  } catch (error) {
    console.error('❌ Error en obtenerCitas:', error);
    throw error;
  }
}

/**
 * Actualizar estado de cita (confirmar, cancelar, etc)
 * @param {number} citaId - ID de la cita
 * @param {object} datos - Datos a actualizar (ej: {estado: 'confirmada'})
 * @param {string} jwt - Token de autenticación
 */
export async function actualizarCita(citaId, datos, jwt) {
  try {
    const response = await fetch(`${STRAPI_URL}/api/citas/${citaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data: datos }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error?.message || 'Error al actualizar cita');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error en actualizarCita:', error);
    throw error;
  }
}
