export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="group-row cursor-pointer">
      <span className="flex-1 text-[17px] leading-snug">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-on={checked}
        className="switch"
        onClick={() => onChange(!checked)}
      />
    </label>
  );
}
