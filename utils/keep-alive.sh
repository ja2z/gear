#!/bin/bash

# Scout Gear Management API Keep-Alive Script
# This script pings the Render app every 10 minutes to prevent it from sleeping

# Configuration - UPDATE THESE VALUES
APP_URL="https://your-app-name.onrender.com/api/ping"
LOG_FILE="/home/youruser/keep-alive.log"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Ping the app and capture response
response_body=$(curl -s "$APP_URL")
response_code=$(curl -s -w "%{http_code}" -o /dev/null "$APP_URL")
curl_exit_code=$?

# Log the result
if [ "$curl_exit_code" -eq 0 ] && [ "$response_code" = "200" ]; then
    # The endpoint now returns a pre-formatted message, so just log it directly
    echo "$response_body" >> "$LOG_FILE"
else
    # Format timestamp in Pacific time
    formatted_timestamp=$(TZ="America/Los_Angeles" date '+%Y-%m-%d %H:%M:%S %Z')
    echo "$formatted_timestamp - ERROR: App returned HTTP $response_code (curl exit code: $curl_exit_code)" >> "$LOG_FILE"
    
    # Optional: Send email notification (uncomment and configure if desired)
    # echo "Scout Gear Management API is down! HTTP $response_code at $formatted_timestamp" | mail -s "Scout Gear App Alert" your-email@example.com
fi

# Keep log file size manageable (keep last 1000 lines)
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
