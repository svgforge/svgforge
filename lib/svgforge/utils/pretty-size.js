/**
 Pretty-print a size in bytes (`"3 Bytes"`, `"1.5 kB"`, …)

 Mirrors the formatting of the removed `prettysize` package (base 1024, one
 decimal place, trailing `.0` trimmed) so existing log/SVG output stays the same.

 @param {number} size Size in bytes
 @returns {string} Human-readable size string
 */
export default function prettySize(size) {
  const units = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let formatted = '0 Bytes';

  for (const [index, unit] of units.entries()) {
    const base = 1024 ** index;

    if (size >= base) {
      let fixed = String((size / base).toFixed(1));
      if (fixed.endsWith('.0')) {
        fixed = fixed.slice(0, -2);
      }

      formatted = `${fixed} ${unit}`;
    }
  }

  return formatted;
}
