import { cn } from "@/lib/cn";

export type AdinkraName = "adinkrahene" | "sankofa" | "nsaa" | "dwennimmen" | "gyeNyame";

const TITLE: Record<AdinkraName, string> = {
  adinkrahene: "Adinkrahene — greatness, leadership",
  sankofa: "Sankofa — return and fetch it",
  nsaa: "Nsaa — excellence, authenticity",
  dwennimmen: "Dwennimmen — humility and strength",
  gyeNyame: "Gye Nyame — except God",
};

export function Adinkra({
  name,
  className,
  title,
}: {
  name: AdinkraName;
  className?: string;
  title?: string;
}) {
  const label = title ?? TITLE[name];
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("adinkra", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{label}</title> : null}
      {name === "adinkrahene" && (
        <>
          <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="3.2" />
          <circle cx="32" cy="32" r="19.5" fill="none" stroke="currentColor" strokeWidth="3.2" />
          <circle cx="32" cy="32" r="9" fill="currentColor" />
        </>
      )}
      {name === "sankofa" && (
        <path
          fill="currentColor"
          d="M32 58C14 44 4 32.5 4 21.5 4 12.2 11.2 6 19.8 6c5.4 0 9.6 2.6 12.2 7.2C34.6 8.6 38.8 6 44.2 6 52.8 6 60 12.2 60 21.5 60 32.5 50 44 32 58ZM19.8 11.2c-5.2 0-9.2 3.6-9.2 10.3 0 7.8 7.2 16.4 21.4 27.4 14.2-11 21.4-19.6 21.4-27.4 0-6.7-4-10.3-9.2-10.3-4.4 0-8 2.8-9.8 8.2-.4 1.2-2.2 1.2-2.6 0-1.8-5.4-5.4-8.2-9.8-8.2Zm12.2 14.2c-4.6 0-7.6 3.4-7.6 7.4 0 5.6 4.8 8.6 7.6 11.2 2.8-2.6 7.6-5.6 7.6-11.2 0-4-3-7.4-7.6-7.4Z"
        />
      )}
      {name === "nsaa" && (
        <>
          <path fill="currentColor" d="M8 8h16v16H8zm32 0h16v16H40zM8 40h16v16H8zm32 0h16v16H40z" />
          <path fill="currentColor" d="M26 14h12v8H26zM14 26h8v12h-8zm28 0h8v12h-8zM26 42h12v8H26z" />
          <rect x="26" y="26" width="12" height="12" fill="currentColor" />
        </>
      )}
      {name === "dwennimmen" && (
        <path
          fill="currentColor"
          d="M18 8c-7.2 0-12 6.2-12 14.4 0 10.4 7.4 16.6 18 22.2V52c0 2.2 1.8 4 4 4s4-1.8 4-4V8H18Zm0 8h6v22.4C16.6 33.6 12 28.8 12 22.4 12 17.6 14.6 16 18 16Zm28-8H32v44c0 2.2 1.8 4 4 4s4-1.8 4-4v-7.4c10.6-5.6 18-11.8 18-22.2C58 14.2 53.2 8 46 8Zm0 8c3.4 0 6 1.6 6 6.4 0 6.4-4.6 11.2-12 13.6V16h6Z"
        />
      )}
      {name === "gyeNyame" && (
        <path
          fill="currentColor"
          d="M32 4c-2.2 0-4 1.4-4 3.6v6.2c-8.8 1.4-16 8.2-16 18.2 0 6.4 3 11.4 8 14.6v4.6c-6.4 1.6-10 6.2-10 12.2 0 1.2.8 2.2 2 2.6 8.4 2.4 16.2 2.4 20 2.4s11.6 0 20-2.4c1.2-.4 2-1.4 2-2.6 0-6-3.6-10.6-10-12.2v-4.6c5-3.2 8-8.2 8-14.6 0-10-7.2-16.8-16-18.2V7.6c0-2.2-1.8-3.6-4-3.6Zm0 14.4c6.6 0 12 5.2 12 12.6S38.6 43.6 32 43.6 20 38.4 20 31 25.4 18.4 32 18.4Zm-8 32.4c.8.2 4.6.8 8 .8s7.2-.6 8-.8c2.2.8 4.6 2.4 4.6 4.6 0 .4-1.8 1-12.6 1S19.4 55.8 19.4 55.4c0-2.2 2.4-3.8 4.6-4.6Z"
        />
      )}
    </svg>
  );
}

export function AdinkraRow({ className }: { className?: string }) {
  const marks: AdinkraName[] = ["sankofa", "nsaa", "adinkrahene", "dwennimmen"];
  return (
    <ul className={cn("adinkra-row", className)} aria-label="Adinkra seals">
      {marks.map((name) => (
        <li key={name}>
          <Adinkra name={name} />
          <span>{name === "gyeNyame" ? "Gye Nyame" : name[0].toUpperCase() + name.slice(1)}</span>
        </li>
      ))}
    </ul>
  );
}
