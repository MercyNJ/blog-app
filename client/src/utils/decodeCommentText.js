const ESCAPED_CHARACTERS = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&',
};

// Comments are stored HTML-escaped by the server's sanitizer; turn the escapes back into
// characters for display. Only render the result as React text, never as HTML.
export function decodeCommentText(text = '') {
  return text.replace(/&(lt|gt|quot|#39|amp);/g, match => ESCAPED_CHARACTERS[match]);
}
