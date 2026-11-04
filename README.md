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

## Hạn chế xem mã nguồn

Trang chặn menu chuột phải (trừ vùng nhập liệu), F12, các tổ hợp phím mở
DevTools phổ biến trên Windows/macOS, xem nguồn và lưu trang. Đây chỉ là
biện pháp hạn chế thao tác; người dùng vẫn có thể mở DevTools từ menu trình
duyệt, tắt JavaScript hoặc tải tài nguyên bằng công cụ HTTP.

`vercel.json` cấu hình Vercel nén JavaScript và chỉ xuất bản thư mục `dist/`,
tránh đưa file nguồn, công cụ build và repository ra đường dẫn công khai.
Không đưa khóa bí mật vào HTML/JS hoặc `dist/`.

Website hiện không có backend/API riêng. Không thể chặn API/công cụ HTTP lấy
HTML/CSS/JS từ link mà vẫn cho khách truy cập công khai cùng nội dung đó.
Nếu bổ sung dữ liệu hoặc logic riêng tư, cần xử lý ở backend và kiểm tra quyền
truy cập trên từng API; chặn phím tắt hoặc CORS không thay thế xác thực.

## Hiệu ứng bổ sung

Cánh hoa hồng–vàng và hoa bung khi mở thiệp tham khảo mẫu Maison;
thanh tiến trình đọc và ảnh chuyển động nhẹ theo cuộn được giữ trong khung 440px.
Cánh hoa tự chạy khi mở thiệp, theo thiết lập giảm chuyển động của thiết bị.
Cánh hoa dừng khi đóng thiệp, mở album/QR hoặc chuyển tab.
Chế độ giảm chuyển động tắt cánh hoa và parallax, đồng thời hiển thị nội dung
ngay cả khi khách đổi thiết lập trong lúc xem. Điều hướng bàn phím cũng hiển thị
ngay các khối đang nhận focus.

Sau khi sửa CSS, đồng bộ `styles.css` sang `dist/styles.css`; chạy
`npm run build:js` để cập nhật JavaScript triển khai.
