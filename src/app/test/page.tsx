"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/supabase/client";

type Status = "idle" | "loading" | "success" | "error";

type CheckResult = {
  status: Status;
  details: string;
};

const INITIAL_STATE: CheckResult = {
  status: "idle",
  details: "Connection check has not started yet.",
};

export default function SupabaseConnectionTest() {
  const [result, setResult] = useState<CheckResult>(INITIAL_STATE);

  const runCheck = useCallback(async () => {
    setResult({ status: "loading", details: "Checking Supabase connection..." });

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setResult({ status: "error", details: error.message });
        return;
      }

      const sessionState = data.session ? "Active session detected." : "Connected successfully. No active session found.";
      setResult({ status: "success", details: sessionState });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setResult({ status: "error", details: message });
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const statusColor = {
    idle: "text-gray-500",
    loading: "text-blue-500",
    success: "text-green-600",
    error: "text-red-600",
  }[result.status];

  return (
    <div className="flex flex-col gap-4 p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Supabase Connection Test</h1>
      <p className={`text-sm font-medium ${statusColor}`}>Status: {result.status.toUpperCase()}</p>
      <p className="text-sm text-gray-700 dark:text-gray-300">{result.details}</p>
      <button
        type="button"
        className="self-start rounded bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
        onClick={() => {
          setResult(INITIAL_STATE);
          void runCheck();
        }}
      >
        Re-run check
      </button>
    </div>
  );
}
