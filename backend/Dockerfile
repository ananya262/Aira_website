FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps || npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Default command: start dev server
CMD [ "npm", "run", "dev" ]
