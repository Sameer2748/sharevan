FROM node:18-alpine

WORKDIR /app

# Copy package files from frontend directory
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Copy icons directory to parent (to match ../icons path resolution in code)
RUN mkdir -p ../icons
COPY icons/ ../icons/

# Build Next.js app
RUN npm run build

EXPOSE 3000

CMD npm start
