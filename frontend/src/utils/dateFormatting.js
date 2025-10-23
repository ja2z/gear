/**
 * Formats an ISO 8601 timestamp to local time with timezone
 * @param {string} isoString - ISO 8601 timestamp (e.g., "2025-10-03T02:56:12.633Z")
 * @returns {string} - Formatted timestamp (e.g., "10/02/2025, 7:56:12 PM PDT")
 */
export const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return isoString; // Return original if parsing fails
    }
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return isoString;
  }
};

/**
 * Formats a date string (YYYY-MM-DD) to a more readable format
 * @param {string} dateString - Date string (e.g., "2025-10-15")
 * @returns {string} - Formatted date (e.g., "10/15/2025")
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

