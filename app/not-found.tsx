import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <p className="tabular text-sm font-medium text-primary">404</p>
      <h1 className="font-heading text-2xl font-extrabold tracking-tight">That page is not on the sheet</h1>
      <p className="text-pretty text-muted-foreground">The form you are looking for does not exist.</p>
      <Button asChild>
        <Link href="/">Back to the sheet</Link>
      </Button>
    </div>
  );
}
