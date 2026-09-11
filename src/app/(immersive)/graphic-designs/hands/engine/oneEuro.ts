/**
 * One-Euro filter (Casiez, Roussel, Vogel 2012): an exponential smoother whose
 * cutoff rises with speed, so a resting hand is steady and a moving one has no
 * lag. One instance per scalar; `OneEuro2` pairs two for a point.
 */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t = 0;

  constructor(
    private minCutoff: number,
    private beta: number,
    private dCutoff: number,
  ) {}

  reset(): void {
    this.x = null;
    this.dx = 0;
  }

  get value(): number {
    return this.x ?? 0;
  }

  filter(value: number, t: number): number {
    if (this.x === null) {
      this.x = value;
      this.dx = 0;
      this.t = t;
      return value;
    }
    const dt = Math.max(1e-3, (t - this.t) / 1000);
    this.t = t;
    const dxRaw = (value - this.x) / dt;
    const aD = alpha(dt, this.dCutoff);
    this.dx = this.dx + aD * (dxRaw - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    const a = alpha(dt, cutoff);
    this.x = this.x + a * (value - this.x);
    return this.x;
  }
}

function alpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuro2 {
  readonly fx: OneEuro;
  readonly fy: OneEuro;
  x = 0;
  y = 0;

  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.fx = new OneEuro(minCutoff, beta, dCutoff);
    this.fy = new OneEuro(minCutoff, beta, dCutoff);
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }

  filter(x: number, y: number, t: number): void {
    this.x = this.fx.filter(x, t);
    this.y = this.fy.filter(y, t);
  }
}
