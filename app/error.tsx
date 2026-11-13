"use client";

import { useEffect } from "react";
import { RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-pretty text-muted-foreground">
        The page could not load your progress. This is usually the database connection: check your network and the
        DATABASE_URL in .env.local, then try again.
      </p>
      <Button onClick={() => retry()}>
        <RotateCwIcon />
        Try again
      </Button>
    </div>
  );
}
