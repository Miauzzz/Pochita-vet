const STRAPI_URL = 'http://localhost:1337';

/**
 * Cliente HTTP base para todas las llamadas a Strapi
 */
export class APIClient {
  constructor(jwt = null) {
    this.jwt = jwt;
    this.baseURL = STRAPI_URL;
  }

  /**
   * Headers por defecto
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
    }

    return headers;
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * POST request
   */
  async post(endpoint, body) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('❌ POST Error:', { endpoint, status: response.status, error });
      throw new Error(error.error?.message || error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * PUT request
   */
  async put(endpoint, body) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Error ${response.status}`);
    }

    return response.json();
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Error ${response.status}`);
    }

    return response.status === 204 ? null : response.json();
  }
}

export default STRAPI_URL;
