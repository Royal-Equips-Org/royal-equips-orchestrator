# Use node:18-alpine for smaller image size
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Serve the built application
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]