"use client"

import { useCartStore } from "@/lib/store/cart";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/order";
import { CheckCircle2, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const cartTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  if (!mounted) return null;
  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">Ihr Warenkorb ist leer</p>
        <Link href="/" className="text-xs font-bold uppercase underline">Zurück zum Shop</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await createOrder({
      customerName: formData.get("name") as string,
      customerEmail: formData.get("email") as string,
      items,
      totalAmount: cartTotal
    });

    if (result.success) {
      setSuccess(true);
      clearCart();
    } else {
      alert("Fehler");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-20 h-20 bg-neutral-950 text-white rounded-full flex items-center justify-center mb-8 shadow-2xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold uppercase tracking-tighter mb-4 text-center">Bestellung Erfolgreich!</h1>
        <p className="text-neutral-500 mb-10 text-center max-w-md text-sm">Vielen Dank für Ihren Auftrag. Wir haben die Details erhalten وستصلك رسالة تأكيد قريباً.</p>
        <button onClick={() => router.push("/")} className="bg-neutral-950 text-white px-12 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-all">Weiter Einkaufen</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-10">
          <Link href="/cart" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Zurück zum Warenkorb
          </Link>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">Zahlung & Versand</h1>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white p-10 border border-neutral-200 shadow-sm space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Vollständiger Name</label>
                <input name="name" required className="w-full border border-neutral-200 p-4 text-sm font-bold bg-neutral-50 outline-none focus:border-neutral-950" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">E-Mail Adresse</label>
                <input name="email" type="email" required className="w-full border border-neutral-200 p-4 text-sm font-bold bg-neutral-50 outline-none focus:border-neutral-950" />
              </div>
              <div className="pt-4">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-4">Zahlungsmethode (Test)</label>
                 <div className="flex items-center gap-4 p-5 border-2 border-neutral-950 bg-neutral-50">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Simulierte Zahlung</span>
                    <span className="ml-auto text-[9px] bg-neutral-950 text-white px-2 py-1 font-bold">ACTIVE</span>
                 </div>
              </div>
            </div>
            <button disabled={loading} className="w-full bg-neutral-950 text-white py-6 font-bold uppercase tracking-widest text-[11px] hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Jetzt Zahlung simulieren"}
            </button>
          </form>
        </div>

        <div className="bg-white border border-neutral-200 p-10 shadow-sm h-fit sticky top-24">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-6 mb-8">Zusammenfassung</h2>
          <div className="space-y-6 mb-10 max-h-[300px] overflow-y-auto pr-4">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex gap-6 border-b border-neutral-50 pb-6">
                <div className="w-16 h-16 bg-neutral-100 shrink-0 p-2">
                  <img src={item.image} className="w-full h-full object-contain" alt="" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase text-neutral-950">{item.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-widest">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-neutral-950">{item.totalPrice.toFixed(2)} €</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">Gesamt</span>
            <span className="text-4xl font-bold tracking-tighter text-neutral-950">{cartTotal.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}