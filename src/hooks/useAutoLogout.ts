"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAutoLogout() {
  const { status } = useSession();
  const router = useRouter();
  const toasted = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated" && !toasted.current) {
      toasted.current = true;
      toast.error("Your session has expired. Please sign in again.");
      setTimeout(() => router.replace("/login"), 1200);
    }
  }, [status, router]);
}