"use client";

import { Suspense } from "react";
import BuilderPageContent from "@/app/builder/BuilderPageContent";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderPageContent />
    </Suspense>
  );
}