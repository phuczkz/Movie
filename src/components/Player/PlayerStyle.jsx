import React from 'react';

const PlayerStyle = () => {
  return (
    <style>
      {`
          /* Darken poster */
          .art-poster {
            filter: brightness(0.4) contrast(1.1) !important;
          }

          /* Mouse cursor fixes: ensure cursor is visible when moving or controls are shown */
          .art-video-player {
            cursor: default !important;
          }
          .art-video-player .art-mask,
          .art-video-player .art-video {
            cursor: default !important;
          }
          /* Hide cursor only when ArtPlayer adds the hide class after inactivity */
          .art-video-player.art-hide-cursor,
          .art-video-player.art-hide-cursor * {
            cursor: none !important;
          }
          /* Ensure controls still show the pointer */
          .art-control, .art-control *, .art-setting, .art-setting * {
            cursor: pointer !important;
          }

          /* Force font family on all player elements */
          .art-video-player, 
          .art-video-player *, 
          .art-control, 
          .art-layer, 
          .art-setting, 
          .art-info, 
          .art-contextmenu {
            font-family: 'Manrope', 'Satoshi', system-ui, -apple-system, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }

          /* Remove Subtitle element completely */
          .art-subtitle {
            display: none !important;
          }

          /* Remove Lock layer completely */
          .art-layer-lock {
            display: none !important;
          }

          /* Header Auto Hide */
          .art-layer-header {
            opacity: 1;
            transition: opacity 0.3s ease, visibility 0.3s ease !important;
          }
          .art-video-player.art-hide-cursor .art-layer-header {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }

          /* Align Icons Evenly in Control Bar */
          .art-controls {
            display: flex !important;
            align-items: center !important;
            margin: 0 8px 8px 8px !important;
          }
          .art-controls-left, .art-controls-right {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
          }
          .art-control {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 8px !important;
            margin: 0 !important;
            min-width: unset !important;
          }



          /* Tablet and Mobile Adjustments (Desktop remains default) */
          @media (max-width: 768px) {
            /* Overall adjustments to prevent pushing out of frame */
            .art-bottom {
              white-space: nowrap !important;
              width: 100% !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              padding-right: 4px !important;
              padding-left: 4px !important;
            }
            .art-controls-left, .art-controls-right {
              display: flex !important;
              align-items: center !important;
              flex-shrink: 1 !important;
              min-width: 0 !important;
              gap: 2px !important;
            }
            /* Force all controls to not have fixed large widths/margins naturally */
            .art-bottom .art-control {
              min-width: 0 !important;
              margin: 0 !important;
              padding: 0 4px !important;
            }
            .art-bottom .art-control svg {
              width: 18px !important;
              height: 18px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 18px !important;
              height: 18px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 8px !important;
            }
            .art-bottom .art-control-time {
              font-size: 10px !important;
              padding: 0 4px !important;
            }
          }

          /* Mobile L */
          @media (max-width: 480px) {
            .art-controls-left, .art-controls-right {
              gap: 0px !important;
            }
            .art-bottom .art-control {
              padding: 0 2px !important;
            }
            .art-bottom .art-control svg {
              width: 16px !important;
              height: 16px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 16px !important;
              height: 16px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 7.5px !important;
            }
            .art-bottom .art-control-time {
              font-size: 9px !important;
              padding: 0 2px !important;
              letter-spacing: -0.5px !important;
            }
            .art-bottom {
              padding-right: 2px !important;
              padding-left: 2px !important;
            }
          }

          /* Mobile S */
          @media (max-width: 360px) {
            .art-controls-left, .art-controls-right {
              gap: 0px !important;
            }
            .art-bottom .art-control {
              padding: 0 1px !important;
            }
            .art-bottom .art-control svg {
              width: 14px !important;
              height: 14px !important;
            }
            .art-bottom .custom-10s-btn svg {
              width: 14px !important;
              height: 14px !important;
            }
            .art-bottom .custom-10s-btn span {
              font-size: 6px !important;
            }
            .art-bottom .art-control-time {
              font-size: 8px !important;
              letter-spacing: -1px !important;
              padding: 0 1px !important;
            }
          }



          /* Hover effect for floating button */
          #art-next-ep-layer:hover {
            /* Handled in JS for background, shadow handled here */
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6) !important;
          }

          /* Adjust position for mobile */
          @media (max-width: 768px) {
            #art-next-ep-layer {
              bottom: 65px !important;
              right: 16px !important;
              padding: 10px 16px !important;
              font-size: 11px !important;
              border-radius: 8px !important;
              font-weight: 900 !important;
            }
          }
        `}
    </style>
  );
};

export default PlayerStyle;
