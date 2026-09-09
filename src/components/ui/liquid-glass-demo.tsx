import { LiquidGlass } from "@/components/liquid-glass";

export function LiquidGlassDemo() {
  return (
    <div className="lg-demo">
      <p className="lg-demo-copy">
        Press a pane. Light should gather under your finger. The floor should bend a little. Then it should rest.
      </p>
      <div className="lg-demo-grid">
        <LiquidGlass className="lg-demo-card">
          <p className="lg-demo-kicker">Primary</p>
          <p>Dock glass</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card" blur={16} highlightStrength={0.24}>
          <p className="lg-demo-kicker">Secondary</p>
          <p>Search · ticket</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card is-dark">
          <p className="lg-demo-kicker">Dark</p>
          <p>Night office</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card" disabled>
          <p className="lg-demo-kicker">Still</p>
          <p>No press field</p>
        </LiquidGlass>
      </div>
    </div>
  );
}
