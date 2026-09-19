"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { ApiClient } from "@/services/api.client";

export default function InactivityWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  // 2 minutos de inactividad
  const INACTIVITY_LIMIT = 2 * 60 * 1000;

  const handleLogout = async () => {
    try {
      // 1. Notificar al backend
      await ApiClient.post("/api/auth/logout", {});
    } catch (e) {
      console.error("Error al notificar logout al backend", e);
    } finally {
      // 2. Limpiar local storage
      AuthService.logout();
      // 3. Redirigir al login con un parámetro para mostrar mensaje
      router.push("/login?reason=inactivity");
    }
  };

  const resetTimer = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    // Solo vigilar inactividad si no estamos en el login
    if (pathname !== "/login" && pathname !== "/") {
      timeoutId.current = setTimeout(handleLogout, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    // Eventos que reinician el temporizador
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Iniciar el temporizador
    resetTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [pathname]);

  return <>{children}</>;
}
