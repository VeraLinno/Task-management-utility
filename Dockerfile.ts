FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY index.html style.css ./

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/index.html /usr/share/nginx/html/index.html
COPY --from=build /app/style.css /usr/share/nginx/html/style.css
COPY --from=build /app/dist/main.js /usr/share/nginx/html/dist/main.js
COPY nginx.ts.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
