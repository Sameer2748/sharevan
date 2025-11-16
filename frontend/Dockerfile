FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code first
COPY frontend/ .

# Copy icons directory to parent (to match ../icons path resolution)
# Create parent directory and copy icons there
RUN mkdir -p ../icons
COPY icons ../icons

# Build Next.js app
RUN npm run build

EXPOSE 3000

CMD npm start
