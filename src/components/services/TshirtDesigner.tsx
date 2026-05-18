"use client"

import { useState } from "react";
import { Rnd } from "react-rnd";
import { UploadCloud, Trash2 } from "lucide-react";
import { LogoDesign, FullDesignData } from "@/lib/store/cart";
import { v4 as uuidv4 } from "uuid";

interface Props {
  designData: FullDesignData;
  setDesignData: React.Dispatch<React.SetStateAction<FullDesignData>>;
}

const COMMON_COLORS = [
  { name: 'Weiß', hex: '#FFFFFF' },
  { name: 'Schwarz', hex: '#222222' },
  { name: 'Marineblau', hex: '#1a2942' },
  { name: 'Rot', hex: '#c91a1a' },
  { name: 'Grau', hex: '#9ca3af' },
  { name: 'Königsblau', hex: '#1d4ed8' },
  { name: 'Waldgrün', hex: '#15803d' },
  { name: 'Sonnengelb', hex: '#eab308' },
];

const FabricTextureDef = () => (
  <defs>
    <filter id="fabricTexture" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.03 0" in="noise" result="coloredNoise" />
      <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
    </filter>
  </defs>
);

const ClothingSVG = ({ model, color, isBack }: { model: string, color: string, isBack: boolean }) => {
  const paths: Record<string, string> = {
    tee: "M 230 100 C 270 140, 330 140, 370 100 L 480 130 L 520 220 L 450 250 L 420 180 L 420 500 L 180 500 L 180 180 L 150 250 L 80 220 L 120 130 Z",
    longsleeve: "M 230 100 C 270 140, 330 140, 370 100 L 480 130 L 550 450 L 490 470 L 420 180 L 420 500 L 180 500 L 180 180 L 110 470 L 50 450 L 120 130 Z",
    hoodie: "M 230 100 C 270 140, 330 140, 370 100 L 490 140 L 550 450 L 490 470 L 430 200 L 430 520 L 170 520 L 170 200 L 110 470 L 50 450 L 110 140 Z"
  };

  const getBasePath = () => {
    if (['hoodie', 'pullover', 'jacket'].includes(model)) return paths.hoodie;
    if (model === 'longsleeve') return paths.longsleeve;
    return paths.tee;
  };

  return (
    <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-all duration-500">
      <FabricTextureDef />
      <g filter="url(#fabricTexture)">
        {!isBack && <path d="M 230 100 C 270 130, 330 130, 370 100 C 330 110, 270 110, 230 100 Z" fill="#000" opacity="0.08"/>}
        <path d={getBasePath()} fill={color}/>
        {['hoodie', 'pullover', 'jacket'].includes(model) && (
          <path d="M 200 380 L 400 380 L 430 480 L 170 480 Z" fill={color} stroke="#000" strokeOpacity="0.04" strokeWidth="2" />
        )}
        <path d="M 180 180 C 200 300, 190 450, 180 500 C 200 450, 220 300, 200 180 Z" fill="#000" opacity="0.02" />
        <path d="M 420 180 C 400 300, 410 450, 420 500 C 400 450, 380 300, 400 180 Z" fill="#000" opacity="0.02" />
      </g>
    </svg>
  );
};

export default function TshirtDesigner({ designData, setDesignData }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const initialWidth = 140;
        const initialHeight = initialWidth / aspectRatio;

        const newLogo: LogoDesign = { 
          id: uuidv4(), 
          url: base64, // حفظ الصورة كـ Base64 لضمان عدم اختفائها
          x: 20, 
          y: 20, 
          width: initialWidth, 
          height: initialHeight 
        };
        
        if (view === 'front') {
          setDesignData({ ...designData, frontLogos: [...designData.frontLogos, newLogo] });
        } else {
          setDesignData({ ...designData, backLogos: [...designData.backLogos, newLogo] });
        }
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeLogo = (id: string) => {
    if (view === 'front') {
      setDesignData({ ...designData, frontLogos: designData.frontLogos.filter(l => l.id !== id) });
    } else {
      setDesignData({ ...designData, backLogos: designData.backLogos.filter(l => l.id !== id) });
    }
  };

  const updateLogoPos = (id: string, d: { x: number, y: number }, size: { width: number, height: number }) => {
    const update = (logos: LogoDesign[]) => logos.map(l => l.id === id ? { ...l, x: d.x, y: d.y, width: size.width, height: size.height } : l);
    if (view === 'front') {
      setDesignData({ ...designData, frontLogos: update(designData.frontLogos) });
    } else {
      setDesignData({ ...designData, backLogos: update(designData.backLogos) });
    }
  };

  const activeLogos = view === 'front' ? designData.frontLogos : designData.backLogos;

  return (
    <div className="w-full bg-white border border-neutral-200 shadow-sm p-6 rounded-md">
      <div className="flex justify-center mb-8 border-b border-neutral-100 pb-6">
        <div className="flex bg-neutral-100 p-1 rounded-sm">
          <button onClick={() => setView('front')} className={`px-8 py-3 text-[12px] font-bold uppercase tracking-widest transition-all rounded-sm ${view === 'front' ? 'bg-neutral-950 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-950'}`}>Vorderseite</button>
          <button onClick={() => setView('back')} className={`px-8 py-3 text-[12px] font-bold uppercase tracking-widest transition-all rounded-sm ${view === 'back' ? 'bg-neutral-950 text-white shadow-md' : 'text-neutral-500 hover:text-neutral-950'}`}>Rückseite</button>
        </div>
      </div>

      <div className="mb-10">
        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 block mb-4">Farbe wählen</label>
        <div className="flex flex-wrap gap-4">
          {COMMON_COLORS.map(c => (
            <button 
              key={c.hex} 
              onClick={() => setDesignData({...designData, color: c.hex})}
              className={`w-10 h-10 rounded-full border-2 transition-all duration-300 hover:scale-110 ${designData.color === c.hex ? 'border-neutral-950 scale-110 shadow-lg ring-2 ring-neutral-100 ring-offset-2' : 'border-neutral-200 shadow-sm'}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-[500px] mx-auto aspect-square flex items-center justify-center mb-8 bg-neutral-50/50 rounded-lg overflow-hidden border border-neutral-100">
        <div className="absolute inset-0 z-0 p-4">
          <ClothingSVG model={designData.model} color={designData.color} isBack={view === 'back'} />
        </div>
        
        {/* منطقة العمل - العرض ثابت داخلياً بـ 200px للحفاظ على التناسب في السلة */}
        <div className="absolute z-20" style={{ top: '22%', left: '30%', width: '40%', height: '55%' }}>
          <div className="relative w-full h-full" id="printable-area">
             {activeLogos.map((logo) => (
              <Rnd
                key={logo.id}
                size={{ width: logo.width, height: logo.height }}
                position={{ x: logo.x, y: logo.y }}
                onDragStop={(e, d) => updateLogoPos(logo.id, { x: d.x, y: d.y }, { width: logo.width, height: logo.height })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  updateLogoPos(logo.id, position, { width: parseInt(ref.style.width, 10), height: parseInt(ref.style.height, 10) });
                }}
                lockAspectRatio={true}
                bounds="parent"
                className="group border border-transparent hover:border-blue-500/50 transition-colors"
              >
                <div className="relative w-full h-full">
                  <img src={logo.url} alt="Logo" className="w-full h-full object-contain pointer-events-none drop-shadow-md" />
                  <button 
                    onClick={() => removeLogo(logo.id)}
                    className="absolute -top-3 -right-3 bg-white text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-xl transition-opacity border border-neutral-200 z-50 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </Rnd>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <label className="w-full flex items-center justify-center gap-3 bg-neutral-950 text-white px-6 py-5 font-bold uppercase tracking-widest text-[11px] hover:bg-neutral-800 transition-all cursor-pointer shadow-lg rounded-sm">
          <UploadCloud className="w-5 h-5" /> Neues Motiv hochladen
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}