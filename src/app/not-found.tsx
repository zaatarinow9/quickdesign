import { LogoMark } from "@/components/brand/Logo";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-ink text-paper">
      <LogoMark
        className="pointer-events-none absolute -right-[20%] top-1/2 w-[90vw] max-w-[900px] -translate-y-1/2 animate-[spin_60s_linear_infinite] text-paper/[0.05] motion-reduce:animate-none"
        title=""
      />
      <div className="container-x">
        <p className="eyebrow text-accent">Fehler 404</p>
        <h1 className="display-xl mt-6">
          Seite nicht
          <br />
          gefunden.
        </h1>
        <p className="mt-8 max-w-md text-lg text-paper/60">
          Diese Seite gibt es nicht (mehr). Vielleicht finden Sie über die Startseite, was Sie suchen.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/" size="lg">
            Zur Startseite
          </Button>
          <Button href="/kontakt" variant="outline-light" size="lg">
            Kontakt
          </Button>
        </div>
      </div>
    </section>
  );
}
