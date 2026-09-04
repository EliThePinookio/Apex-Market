import { Adinkra } from "@/components/ui/adinkra";

export function ClothGround() {
  return (
    <div className="cloth-ground" aria-hidden>
      <div className="cloth-photo" />
      <div className="adinkra-ground">
        <Adinkra name="adinkrahene" className="is-a" />
        <Adinkra name="sankofa" className="is-b" />
        <Adinkra name="nsaa" className="is-c" />
        <Adinkra name="dwennimmen" className="is-d" />
      </div>
      <div className="cloth-veil" />
    </div>
  );
}
