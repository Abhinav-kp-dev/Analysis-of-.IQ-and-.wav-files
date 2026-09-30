"use client";

import * as React from "react";
import { LiveSDRSimulator } from "@/components/LiveSDRSimulator";
import BlueprintBackground from "@/components/BlueprintBackground";

export default function LiveSDRPage() {
  return (
    <div className="space-y-6">
      <BlueprintBackground />
      <LiveSDRSimulator variant="full" />
    </div>
  );
}
