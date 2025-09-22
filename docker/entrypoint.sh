#!/bin/sh
set -e

# Fill in Nginx template with env vars (API_TARGET)
if [ -f /etc/nginx/templates/default.conf.template ]; then
  envsubst '${API_TARGET}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Show effective config for debugging
nginx -T | sed -n '1,120p' || true

exec nginx -g 'daemon off;'
