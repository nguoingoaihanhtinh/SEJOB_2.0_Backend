# Use Node.js LTS version as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for development and testing
COPY package*.json ./
RUN npm install --ignore-scripts && npm rebuild

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/


# Build TypeScript code
RUN npm run build

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Start the application (ts-node để resolve @/ path aliases)
CMD ["node", "-r", "ts-node/register", "-r", "tsconfig-paths/register", "./src/index.ts"]