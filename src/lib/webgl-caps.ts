/**
 * WebGL capability probes shared by the site canvas and the immersive demos.
 * No three.js in here on purpose: it is imported by chrome-side code that must
 * not drag the 3D chunk along (see field-glsl.ts for the same rule).
 */

/**
 * True when WebGL is software-rendered (no GPU): SwiftShader (headless Chrome /
 * Lighthouse), llvmpipe, Microsoft Basic Render (RDP, GPU-less VMs), softpipe,
 * WARP. Software-rasterising a fullscreen shader every frame is a long
 * main-thread task, so callers render a single static frame (the site field)
 * or take their cheap path (the demos) instead of a continuous loop. One regex
 * for the whole site — the demos used to carry diverging copies.
 */
export function isSoftwareRenderer(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): boolean {
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : "";
    return /swiftshader|llvmpipe|software|microsoft basic|basic render|microsoft gdi|softpipe|warp|mesa offscreen/i.test(
      renderer,
    );
  } catch {
    return false; // assume hardware if the query is blocked
  }
}

/**
 * Can this browser give us a WebGL2 context? three >= r163 is WebGL2-only (it
 * throws on a WebGL1-only browser), so a demo probes this before mounting its
 * canvas and shows its no-WebGL message instead of a black stage. The probe
 * context is released right away — a page can hold only a handful.
 */
export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("webgl2");
    if (!ctx) return false;
    ctx.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
