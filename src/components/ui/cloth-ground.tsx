import { Adinkra } from "@/components/ui/adinkra";

export function ClothGround() {
  return (
    <div className="cloth-ground" aria-hidden>
      <svg className="liquid-filter" width="0" height="0">
        <filter id="beannel-liquid" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="3" result="n">
            <animate attributeName="baseFrequency" dur="16s" values="0.008 0.02;0.014 0.03;0.008 0.02" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
        </filter>
      </svg>
      <div className="cloth-photo" />
      <div className="adinkra-ground">
        <Adinkra name="adinkrahene" className="is-a" />
        <Adinkra name="sankofa" className="is-b" />
        <Adinkra name="nsaa" className="is-c" />
        <Adinkra name="dwennimmen" className="is-d" />
      </div>
      <div className="cloth-caustic" />
      <div className="cloth-veil" />
    </div>
  );
}
