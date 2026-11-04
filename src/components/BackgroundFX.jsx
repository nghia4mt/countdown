import './BackgroundFX.css';
import { StarField } from './StarField.jsx';

/**
 * Fixed atmosphere layer for the whole page.
 * Purely decorative: aria-hidden, pointer-events: none, never scrolls or clips content.
 * Layers, back to front: base gradients -> aurora blobs -> star canvas -> grid -> grain -> vignette.
 */
export function BackgroundFX() {
  return (
    <div className="bgfx" aria-hidden="true">
      <div className="bgfx__aurora">
        <span className="bgfx__blob bgfx__blob--violet" />
        <span className="bgfx__blob bgfx__blob--cyan" />
        <span className="bgfx__blob bgfx__blob--pink" />
      </div>

      <StarField />

      <div className="bgfx__grid" />
      <div className="bgfx__grain" />
      <div className="bgfx__vignette" />
    </div>
  );
}
