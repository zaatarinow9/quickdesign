"use client";

import ServiceConfiguratorFlow from "./ServiceConfiguratorFlow";
import type { NormalizedServiceConfig } from "@/lib/services/configuration/types";

type ServiceWorkspaceService = {
  id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
};

interface Props {
  service: ServiceWorkspaceService;
  config: NormalizedServiceConfig;
}

export default function ServiceWorkspace({ service, config }: Props) {
  return (
    <div className="py-8 md:py-10">
      <ServiceConfiguratorFlow service={service} config={config} />
    </div>
  );
}
