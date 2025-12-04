// src/app/profilo/page.tsx
import { Suspense } from "react";
import ProfiloClient from "./ProfiloClient";

export const dynamic = "force-dynamic"; // puoi anche toglierlo, ma così siamo sicuri

export default function ProfiloPage() {
  return (
    <Suspense fallback={<div>Caricamento profilo...</div>}>
      <ProfiloClient />
    </Suspense>
  );
}
