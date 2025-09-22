#!/bin/bash

# Scout Gear Management API Keep-Alive Script
# This script pings the Render app every 10 minutes to prevent it from sleeping

# Configuration - UPDATE THESE VALUES
APP_URL="https://your-app-name.onrender.com/api/ping"
LOG_FILE="/home/youruser/keep-alive.log"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Get current timestamp
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# Ping the app and capture response
response_body=$(curl -s "$APP_URL")
response_code=$(curl -s -w "%{http_code}" -o /dev/null "$APP_URL")
curl_exit_code=$?

# Log the result
if [ "$curl_exit_code" -eq 0 ] && [ "$response_code" = "200" ]; then
    # Extract uptime from JSON response (assuming jq is available, fallback to grep if not)
    if command -v jq >/dev/null 2>&1; then
        uptime=$(echo "$response_body" | jq -r '.uptime // "unknown"')
    else
        uptime=$(echo "$response_body" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2 || echo "unknown")
    fi
    
    echo "$timestamp - SUCCESS: App is healthy (HTTP $response_code, uptime: ${uptime}s)" >> "$LOG_FILE"
else
    echo "$timestamp - ERROR: App returned HTTP $response_code (curl exit code: $curl_exit_code)" >> "$LOG_FILE"
    
    # Optional: Send email notification (uncomment and configure if desired)
    # echo "Scout Gear Management API is down! HTTP $response_code at $timestamp" | mail -s "Scout Gear App Alert" your-email@example.com
fi

# Keep log file size manageable (keep last 1000 lines)
tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
