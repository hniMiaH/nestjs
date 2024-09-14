# Sử dụng Node.js 18 làm hình ảnh cơ sở
FROM node:18

# Tạo thư mục làm việc
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt các phụ thuộc
RUN npm install

# Sao chép toàn bộ mã nguồn vào thư mục làm việc
COPY . .

# Biên dịch mã nguồn TypeScript
RUN npm run build

# Chạy ứng dụng NestJS
CMD ["npm", "run", "start:prod"]

EXPOSE 3000
