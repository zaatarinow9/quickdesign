"use client";

import { useEffect, useRef } from "react";

/**
 * Wehende Fahne als Vollbild-Hintergrund (WebGL, ohne Bilddatei).
 * Pausiert außerhalb des Sichtbereichs; bei „reduzierter Bewegung“ ein ruhiges Standbild.
 */
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uShift;
float star(vec2 p, float r){
  const vec2 k1=vec2(0.809016994375,-0.587785252292);
  const vec2 k2=vec2(-0.809016994375,-0.587785252292);
  p.x=abs(p.x);
  p-=2.0*max(dot(k1,p),0.0)*k1;
  p-=2.0*max(dot(k2,p),0.0)*k2;
  p.x=abs(p.x);
  p.y-=r;
  vec2 ba=0.38*vec2(-k1.y,k1.x)-vec2(0.,1.);
  float h=clamp(dot(p,ba)/dot(ba,ba),0.0,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float t=uTime;
  float A=uRes.x/uRes.y;
  // Wellen (Höhe und Ableitung für Licht)
  float a1=uv.x*5.2-t*1.35+uv.y*1.4;
  float a2=uv.x*9.7-t*2.10+uv.y*2.6;
  float a3=uv.x*2.3-t*0.55-uv.y*1.1;
  float h=sin(a1)*0.55+sin(a2)*0.22+sin(a3)*0.35;
  float dh=cos(a1)*0.55*5.2+cos(a2)*0.22*9.7+cos(a3)*0.35*2.3;
  vec2 q=uv+vec2(0.004*h, 0.016*h);
  // Fahne „cover“ (3:2), leicht vergrößert und verschoben
  vec2 f=q-0.5;
  float zoom=1.08;
  if(A>1.5){ f.y*=1.5/A; } else { f.x*=A/1.5; }
  f/=zoom; f.x-=uShift;
  vec2 fl=f+0.5;
  vec3 green=vec3(0.035,0.42,0.22);
  vec3 white=vec3(0.93,0.92,0.89);
  vec3 black=vec3(0.055,0.055,0.06);
  float px=1.6/uRes.y;
  float s1=smoothstep(2.0/3.0-px,2.0/3.0+px,fl.y);
  float s2=smoothstep(1.0/3.0-px,1.0/3.0+px,fl.y);
  vec3 col=mix(black,mix(white,green,s1),s2);
  // drei rote Sterne im weißen Streifen
  vec2 sp=vec2(fl.x*1.5,fl.y);
  float d=1e3;
  for(int i=0;i<3;i++){
    vec2 c=vec2((0.3+0.2*float(i))*1.5,0.5);
    d=min(d,star(sp-c,0.105));
  }
  col=mix(col,vec3(0.78,0.07,0.1),1.0-smoothstep(-px,px,d));
  // Licht: Falten, Satinglanz, Gewebe
  float light=0.80+0.20*clamp(dh*0.18,-1.0,1.0);
  float spec=pow(max(0.0,dh*0.18),6.0)*0.22;
  float weave=0.012*sin(gl_FragCoord.x*1.9)*sin(gl_FragCoord.y*1.9);
  col=col*light+spec+weave;
  // Vignette
  float v=smoothstep(1.25,0.35,length((uv-vec2(0.55,0.55))*vec2(1.1,1.0)));
  col*=mix(0.55,1.0,v);
  gl_FragColor=vec4(col,1.0);
}`;

export function HeroFlag({ shift = 0.12 }: { shift?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      canvas.dataset.fallback = "1";
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.dataset.fallback = "1";
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uShift = gl.getUniformLocation(prog, "uShift");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      // Auf schmalen Bildschirmen Sterne mittig halten
      gl.uniform1f(uShift, canvas.clientWidth < 768 ? 0 : shift);
    };
    const draw = (now: number) => {
      gl.uniform1f(uTime, reduce ? 2.2 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      draw(now);
      if (visible && !reduce) raf = requestAnimationFrame(loop);
    };
    resize();
    draw(performance.now());
    canvas.dataset.ready = "1";
    if (!reduce) raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting && !document.hidden;
      if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onVis = () => {
      const was = visible;
      visible = !document.hidden;
      if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [shift]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-1000 data-[ready=1]:opacity-100 data-[fallback=1]:hidden"
    />
  );
}
