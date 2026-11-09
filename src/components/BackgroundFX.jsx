import './BackgroundFX.css';
import { NebulaScene } from './NebulaScene.jsx';

/**
 * Fixed atmosphere layer for the whole page.
 * Purely decorative: aria-hidden, pointer-events: none, never scrolls or clips content.
 * Layers, back to front: base gradients -> aurora blobs -> WebGL nebula (2D star
 * canvas fallback) -> grid -> grain -> vignette.
 *
 * @param {{ celebrating?: boolean, expired?: boolean, tick?: number }} props
 */
export function BackgroundFX({ celebrating = false, expired = false, tick }) {
  return (
    <div className="bgfx" aria-hidden="true">
      <div className="bgfx__aurora">
        <span className="bgfx__blob bgfx__blob--violet" />
        <span className="bgfx__blob bgfx__blob--cyan" />
        <span className="bgfx__blob bgfx__blob--pink" />
      </div>

      <NebulaScene celebrating={celebrating} expired={expired} tick={tick} />

      <div className="bgfx__grid" />
      <div className="bgfx__grain" />
      <div className="bgfx__vignette" />
    </div>
  );
}
