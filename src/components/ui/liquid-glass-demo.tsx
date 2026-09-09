import { LiquidGlass } from "@/components/ui/liquid-glass";

export function LiquidGlassDemo() {
  return (
    <div className="lg-demo">
      <p className="lg-demo-copy">
        Press a pane. Light should gather under your finger, the floor should bend a little, then the glass should rest.
      </p>
      <div className="lg-demo-grid">
        <LiquidGlass className="lg-demo-card" strength="primary">
          <p className="lg-demo-kicker">Primary</p>
          <p>Dock glass</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card" strength="secondary">
          <p className="lg-demo-kicker">Secondary</p>
          <p>Search · ticket</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card is-dark" strength="primary">
          <p className="lg-demo-kicker">Dark</p>
          <p>Night office</p>
        </LiquidGlass>
        <LiquidGlass className="lg-demo-card" strength="tertiary" interactive={false}>
          <p className="lg-demo-kicker">Still</p>
          <p>No press field</p>
        </LiquidGlass>
      </div>
    </div>
  );
}
