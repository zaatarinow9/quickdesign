"use client"

import { useState } from "react";
import { trackOrder } from "@/app/actions/order";
import { PackageSearch, CircleDot, Clock, Truck, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const STEPS = [
  { id: 'PAID', label: 'Bestellung erhalten', icon: CircleDot },
  { id: 'PROCESSING', label: 'In Produktion', icon: Clock },
  { id: 'SHIPPED', label: 'Versendet', icon: Truck },
  { id: 'DELIVERED', label: 'Zugestellt', icon: CheckCircle2 },
];

export default function TrackOrderPage() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState(false);

  async function handleTrack(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setOrder(null);
    const orderNumber = new FormData(e.currentTarget).get("orderNumber") as string;
    
    const result = await trackOrder(orderNumber);
    if (result) {
      setOrder(result);
    } else {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] bg-neutral-50 py-20 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-neutral-950 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl mb-8">
            <PackageSearch className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-950 tracking-tighter uppercase">Sendungsverfolgung</h1>
          <p className="text-neutral-500 text-sm max-w-md mx-auto">Geben Sie Ihre Bestellnummer ein, um den aktuellen Status Ihrer Druckprodukte abzurufen.</p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-4">
          <input 
            name="orderNumber" 
            placeholder="Bestellnummer (z.B. 10000)" 
            required 
            className="flex-1 bg-white border border-neutral-200 p-6 outline-none focus:border-neutral-950 text-lg font-bold shadow-sm"
          />
          <button disabled={loading} className="bg-neutral-950 text-white px-10 font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-all flex items-center gap-3">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Suchen <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-600 text-xs font-bold uppercase tracking-widest">Bestellung nicht gefunden. Bitte prüfen Sie die Nummer.</p>
          </div>
        )}

        {order && (
          <div className="bg-white border border-neutral-200 p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 border-b border-neutral-100 pb-8">
              <div>
                <h2 className="text-2xl font-bold uppercase tracking-tighter text-neutral-950">Auftrag #{order.orderNumber}</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-2">
                  Vom {format(new Date(order.createdAt), "dd. MMMM yyyy")}
                </p>
              </div>
              {order.trackingNumber && (
                <div className="bg-neutral-50 border border-neutral-200 px-6 py-4 text-center">
                  <span className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Tracking ID</span>
                  <span className="text-sm font-bold text-neutral-950">{order.trackingNumber}</span>
                </div>
              )}
            </div>

            <div className="relative flex justify-between items-center w-full max-w-xl mx-auto mb-12">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-100 -z-10 -translate-y-1/2"></div>
              
              {STEPS.map((step, idx) => {
                const currentIdx = STEPS.findIndex(s => s.id === order.status);
                let isCompleted = false;
                if (order.status === 'CANCELED') isCompleted = false; 
                else isCompleted = idx <= currentIdx;

                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-4 bg-white px-2">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isCompleted ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg' : 'border-neutral-200 bg-white text-neutral-300'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest absolute mt-16 text-center w-24 -ml-12 ${isCompleted ? 'text-neutral-950' : 'text-neutral-300'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-12">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-6">Artikel in dieser Bestellung</h3>
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-neutral-50 border border-neutral-100 p-4">
                    <span className="text-xs font-bold text-neutral-950">{item.quantity}x {item.serviceName}</span>
                    <span className="text-xs font-bold text-neutral-950">{item.price.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}