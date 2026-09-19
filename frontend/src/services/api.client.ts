import { ApiResponseDto } from "@/dtos/auth.dto";

const API_BASE_URL = "";

export class ApiClient {
  private static getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }
  
  private static getRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshToken");
    }
    return null;
  }

  private static setTokens(token: string, refreshToken: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  private static clearTokens() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  }

  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponseDto<T>> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    let token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, { ...options, headers });

      // Si el token expiró (401) y no estamos ya en la ruta de refresh
      if (response.status === 401 && !url.includes("/api/auth/refresh") && !url.includes("/api/auth/login")) {
        const refreshToken = this.getRefreshToken();
        
        if (refreshToken) {
          try {
            console.log("Renovando token con refreshToken...");
            const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              // Guardar los nuevos tokens
              this.setTokens(refreshData.data.token, refreshData.data.refreshToken);
              
              // Reintentar la petición original con el nuevo token
              headers["Authorization"] = `Bearer ${refreshData.data.token}`;
              response = await fetch(url, { ...options, headers });
            } else {
              // Si falla el refresh token, cerrar sesión
              this.clearTokens();
              if (typeof window !== "undefined") window.location.href = "/login";
              throw new Error("Sesión expirada");
            }
          } catch (e) {
            this.clearTokens();
            if (typeof window !== "undefined") window.location.href = "/login";
            throw e;
          }
        } else {
            this.clearTokens();
            if (typeof window !== "undefined") window.location.href = "/login";
        }
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.message || `Error HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data as ApiResponseDto<T>;
    } catch (error: any) {
      console.error(`[API ERROR] ${options.method || "GET"} ${url}:`, error.message);
      throw error;
    }
  }

  static get<T>(endpoint: string): Promise<ApiResponseDto<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  static post<T>(endpoint: string, body: any): Promise<ApiResponseDto<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body: any): Promise<ApiResponseDto<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string): Promise<ApiResponseDto<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}
