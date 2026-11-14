import { Suspense } from "react";
import { leafIds } from "@/content";
import { Overview } from "@/components/sheet/overview";
import { getSheetSnapshot } from "@/lib/db/sheet";

export default function SheetPage() {
  // The sheet's structure is static; only the ticks come from the database.
  return (
    <Suspense fallback={<Overview done={null} />}>
      <LiveOverview />
    </Suspense>
  );
}

async function LiveOverview() {
  const { done } = await getSheetSnapshot(null);
  return <Overview done={new Set(done.filter((id) => leafIds.has(id)))} />;
}
