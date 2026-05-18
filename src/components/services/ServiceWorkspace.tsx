"use client"

import { useState } from "react";
import TshirtDesigner from "./TshirtDesigner";
import ServiceConfigurator from "./ServiceConfigurator";
import { FullDesignData } from "@/lib/store/cart";
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
  const [designData, setDesignData] = useState<FullDesignData>(() => ({
    model: config.designSettings.defaultModel,
    color: config.designSettings.defaultColor,
    frontLogos: [],
    backLogos: [],
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-16 items-start py-12">
      <div className="w-full lg:w-3/5 space-y-12">
        {config.designSettings.showCanvas ? (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <TshirtDesigner designData={designData} setDesignData={setDesignData} />
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-neutral-50 overflow-hidden border border-neutral-100 flex items-center justify-center p-16 shadow-inner rounded-sm group">
            <img
              src={service.image}
              alt={service.name}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}

        <div className="bg-white p-12 border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neutral-950"></div>
          <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-[0.3em] block mb-4">Produktbeschreibung</span>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-950 tracking-tighter mb-8 uppercase leading-none">
            {service.name}
          </h1>
          <div className="prose prose-neutral max-w-none text-neutral-500 leading-relaxed text-sm">
            <p className="whitespace-pre-line">{service.description}</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-2/5">
        <ServiceConfigurator
          service={service}
          config={config}
          designData={designData}
          setDesignData={setDesignData}
        />
      </div>
    </div>
  );
}
