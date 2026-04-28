/**
 * Returns the HTML string for the header layer used inside ArtPlayer.
 */
export const getHeaderHtml = (title, subtitle) => {
  return `
    <div id="art-header-layer" style="
      pointer-events:none;
      background:linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.3) 45%,transparent 100%);
      padding:12px 16px;
      display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
      width:100%;box-sizing:border-box;
    ">
      <div style="overflow:hidden">
        ${title ? `<p style="margin:0;font-size:13px;font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:480px">${title}</p>` : ""}
        ${subtitle ? `<p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.85);text-shadow:0 2px 6px rgba(0,0,0,1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:480px">${subtitle}</p>` : ""}
      </div>
    </div>`;
};
