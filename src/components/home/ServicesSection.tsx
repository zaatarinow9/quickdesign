import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma"; // استيراد Prisma للتعامل مع قاعدة البيانات
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";

export default async function ServicesSection() {
  // جلب الخدمات الحقيقية والمضافة فقط من قاعدة البيانات
  const services = await prisma.service.findMany({
    take: 3, // عرض آخر 3 خدمات مضافة فقط في الصفحة الرئيسية
    orderBy: {
      createdAt: 'desc'
    }
  });

  // إذا لم تكن هناك خدمات مضافة بعد، لا نعرض القسم أو نعرض رسالة بسيطة
  if (services.length === 0) return null;

  return (
    <section className="w-full bg-white py-32 px-6 md:px-12">
      <div className="w-full flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
        <div className="max-w-2xl">
          <span className="text-neutral-500 uppercase tracking-widest text-[10px] font-bold mb-4 block">
            Unsere Expertise
          </span>
          <h2 className="text-4xl md:text-6xl font-bold text-neutral-950 tracking-tighter leading-[1.1]">
            Exzellenz in jedem Druckformat.
          </h2>
        </div>
        <Link 
          href="/services" 
          className="group flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-neutral-950 hover:text-neutral-500 transition-colors"
        >
          Alle Leistungen
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
        </Link>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service) => (
          <Link 
            key={service.id} 
            href={`/services/${service.slug}`}
            className="group relative w-full h-[650px] overflow-hidden bg-neutral-100 block"
          >
            <div className="absolute inset-0 bg-neutral-950/10 z-10 transition-opacity duration-500 group-hover:opacity-40"></div>
            
            {/* عرض الصورة الحقيقية للخدمة المضافة من لوحة التحكم */}
            <img 
              src={service.image} 
              alt={service.name} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />

            <div className="absolute bottom-0 left-0 w-full p-8 z-20 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
              <div className="bg-white/95 backdrop-blur-md p-10 shadow-2xl">
                <h3 className="text-2xl font-bold text-neutral-950 mb-4 tracking-tight">
                  {service.name}
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-8 line-clamp-2">
                  {service.description}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                  Details <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}