import DOMPurify from "dompurify";

/**
 * Sanitize untrusted HTML strings using DOMPurify to prevent XSS attacks.
 * @param {string} dirtyHtml
 * @returns {string} Sanitized safe HTML string
 */
export const sanitizeHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ["href", "src", "target", "rel", "alt", "title", "class", "style", "width", "height"],
  });
};

export default sanitizeHtml;
