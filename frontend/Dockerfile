# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL (baked into frontend at build time)
ARG VITE_API_URL=https://api.latbot.news/api
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Default backend URL (can be overridden at runtime)
ENV BACKEND_URL=http://backend:8000

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
