# Stage 1: Build Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve với Nginx
FROM nginx:alpine
# Với Angular 17+ (Node 22), file build thường nằm trong thư mục con /browser
# Nếu lúc build bạn thấy thư mục là dist/cf-manager (không có browser) thì xóa chữ /browser đi nhé
COPY --from=build /app/dist/cf-manager/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80