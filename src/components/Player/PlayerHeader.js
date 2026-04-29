/**
 * Returns the HTML string for the header layer used inside ArtPlayer.
 */
export const getHeaderHtml = (title, subtitle) => {
  return `
    <div id="art-header-layer" style="
      pointer-events:none;
      background:linear-gradient(to bottom,rgba(0,0,0,0.8) 0%,rgba(0,0,0,0) 100%);
      padding:16px 20px;
      display:flex;flex-direction:column;gap:4px;
      width:100%;box-sizing:border-box;
    ">
      ${title ? `<p style="margin:0;font-size:14px;font-weight:700;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px;letter-spacing:-0.01em;">${title}</p>` : ""}
      ${subtitle ? `<p style="margin:0;font-size:11.5px;font-weight:500;color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px">${subtitle}</p>` : ""}
    </div>`;
};
