# Use pre-built artifacts with Nginx
FROM docker.artifactory.rewe.local/nginxinc/nginx-unprivileged:1.29.3

# https://github.com/hadolint/hadolint/wiki/DL4006
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy pre-built Angular application
COPY dist/fridge-app-frontend/browser /usr/share/nginx/html

# Expose port 4200
EXPOSE 4200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:4200/ >/dev/null || exit 1
