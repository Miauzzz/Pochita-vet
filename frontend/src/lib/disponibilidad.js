const STRAPI_URL = 'http://localhost:1337';

// Obtener todas las disponibilidades
export async function obtenerDisponibilidades() {
  try {
    const response = await fetch(`${STRAPI_URL}/api/disponibilidads?populate=*`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidades:', error);
    return [];
  }
}

// Obtener disponibilidad por veterinario
export async function obtenerDisponibilidadPorVeterinario(veterinarioId) {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/disponibilidads?filters[veterinario][id][$eq]=${veterinarioId}&populate=*`
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return [];
  }
}

// Obtener disponibilidad por fecha
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

// Crear una nueva disponibilidad (requiere JWT y veterinario: user id)
export async function crearDisponibilidad({ fecha, hora_inicio, hora_fin, veterinarioId, jwt }) {
  try {
    const body = {
      data: {
        fecha,
        hora_inicio,
        hora_fin,
        disponible: true,
        estado: 'disponible',
        veterinario: veterinarioId,
      },
    };

    const res = await fetch(`${STRAPI_URL}/api/disponibilidades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error('Error al crear disponibilidad:', res.status, json);
      throw new Error(json.error?.message || 'No se pudo crear la disponibilidad');
    }

    return json.data;
  } catch (err) {
    console.error('crearDisponibilidad error:', err);
    throw err;
  }
}

// Eliminar disponibilidad por ID (requiere JWT)
export async function eliminarDisponibilidad(disponibilidadId, jwt) {
  try {
    const res = await fetch(`${STRAPI_URL}/api/disponibilidades/${disponibilidadId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      const json = await res.json();
      console.error('Error al eliminar disponibilidad:', res.status, json);
      throw new Error(json.error?.message || 'No se pudo eliminar la disponibilidad');
    }

    return true;
  } catch (err) {
    console.error('eliminarDisponibilidad error:', err);
    throw err;
  }
}
