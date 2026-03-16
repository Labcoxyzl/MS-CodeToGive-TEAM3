import { useState } from "react";
import { apiFetch } from "@/app/lib/api";

interface UseRegisterEventReturn {
  register: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  loadingId: string | null;
}

export function useRegisterEvent(
  onSuccess?: (id: string, registered: boolean) => void,
  onError?: (id: string, err: string) => void
): UseRegisterEventReturn {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function register(id: string) {
    setLoadingId(id);
    try {
      const res = await apiFetch(`/api/v1/events/${id}/signup`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const text = await res.text();
        onError?.(id, text || "Failed to register");
      } else {
        onSuccess?.(id, true);
      }
    } catch (err) {
      onError?.(id, String(err));
    } finally {
      setLoadingId(null);
    }
  }

  async function cancel(id: string) {
    setLoadingId(id);
    try {
      const res = await apiFetch(`/api/v1/events/${id}/signup`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        onError?.(id, text || "Failed to cancel registration");
      } else {
        onSuccess?.(id, false);
      }
    } catch (err) {
      onError?.(id, String(err));
    } finally {
      setLoadingId(null);
    }
  }

  return { register, cancel, loadingId };
}
