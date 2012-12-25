  /*
   * Expose the module to the 'world' when loaded via CommonJS/NodeJS, 
   * AMD and <script> tags.
   */

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = structure; // NodeJS
  }
  
  if (typeof exports !== 'undefined' && typeof exports !== "function") {
    exports.structure = structure; // CommonJs
  }

  if (typeof define === "function" && define.amd) {
    define('structure', [], function () { return structure; } ); // AMD
  }

  if (typeof window !== 'undefined') {
    window.structure = structure;  // <script>
  }
