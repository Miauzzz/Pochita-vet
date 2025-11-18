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
