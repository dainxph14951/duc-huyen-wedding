# Website thiệp cưới

## Nén JavaScript trước khi triển khai

Yêu cầu Node.js và npm. Cài công cụ lần đầu bằng:

```sh
npm ci
```

Chỉnh sửa `script.js` ở thư mục gốc, sau đó chạy:

```sh
npm run build:js
```

Lệnh này nén JavaScript, rút gọn tên biến/hàm và ghi vào `dist/script.js`,
không tạo source map. Mã nguồn gốc được giữ nguyên để chỉnh sửa.
Lệnh chỉ cập nhật JavaScript; HTML, CSS và ảnh trong `dist` vẫn được quản lý như trước.

Triển khai thư mục `dist/`, không triển khai toàn bộ repository, để tránh công khai
`script.js` gốc. `dist/index.html` đã sử dụng bản `script.js` cùng thư mục.

Minify giúp code khó đọc hơn nhưng không ngăn người dùng tải hoặc sao chép code.
