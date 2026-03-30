/**
 * Formats an outing name by appending the current month and year
 * @param {string} outingName - The base outing name entered by the user
 * @returns {string} - The formatted outing name with month and year appended
 * @example formatOutingName("Campout") => "Campout (Jul 2025)"
 */
function formatOutingName(outingName) {
  // Don't double-append if already formatted (e.g. when editing an existing reservation)
  if (/\((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\)$/.test(outingName.trim())) {
    return outingName.trim();
  }

  const now = new Date();
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  return `${outingName} (${month} ${year})`;
}

module.exports = {
  formatOutingName
};

