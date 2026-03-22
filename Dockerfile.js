FROM nginx:1.27-alpine

COPY index-js.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY js /usr/share/nginx/html/js
COPY nginx.js.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
