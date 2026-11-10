# Website thiệp cưới

## Mời khách theo tên

Thêm `?` rồi tên khách được mã hóa vào link thiệp, ví dụ:

```text
https://duc-huyen-wedding.vercel.app/?Anh%20%C4%90%E1%BA%A1i
```

Thiệp hiện **Anh Đại** ở màn mở thiệp và lời mời bên trong. Không có tên,
hoặc tên chỉ gồm khoảng trắng, sẽ hiện **Quý khách**. Tên giữ nguyên cách xưng hô
bạn nhập, tối đa 100 ký tự; không cần chạy SQL hoặc lưu khách trong Supabase.
Để tạo link với tên bất kỳ bằng JavaScript, dùng
`'https://duc-huyen-wedding.vercel.app/?' + encodeURIComponent('Anh Đại')`.
Không đặt tên trong dấu ngoặc kép. Link cũ dạng `?guest=Anh%20Đại` vẫn hoạt động.
Tên có ký tự `&`, `=`, `+`, `#` cần được mã hóa bằng `encodeURIComponent`.

Vercel rewrite `/` và `/index.html` sang `api/invitation.js`. Function đọc
`dist/index.html` và trả tên, tiêu đề, mô tả, canonical và Open Graph URL riêng
ngay trong HTML để bot chia sẻ đọc được. Ảnh xem trước giữ nguyên.
Phản hồi dùng `private, no-store` để tránh cache dùng chung tên khách.
Cần redeploy Vercel để áp dụng; nền tảng nhắn tin có thể giữ bản xem trước cũ
và cách hiển thị cuối cùng do nền tảng quyết định.

Chạy `npm run dev` rồi mở `http://127.0.0.1:3000/?Anh%20%C4%90%E1%BA%A1i` để thử local.
Với Live Server, dùng `http://127.0.0.1:5501/index.html?Anh%20%C4%90%E1%BA%A1i`.
Live Server hoặc hosting static vẫn hiển thị tên bằng JavaScript, nhưng bản xem
trước có tên cần Function trên Vercel. Triển khai repository với `api/` và
`vercel.json`, không chỉ tải riêng thư mục `dist/`.

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
Lệnh đồng thời chép `index.html` và `styles.css` từ gốc sang `dist/` để bản
triển khai và template của Function luôn khớp mã nguồn. Ảnh trong `dist/` được giữ nguyên.

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

Không thể chặn API/công cụ HTTP lấy
HTML/CSS/JS từ link mà vẫn cho khách truy cập công khai cùng nội dung đó.
Nếu bổ sung dữ liệu hoặc logic riêng tư, cần xử lý ở backend và kiểm tra quyền
truy cập trên từng API; chặn phím tắt hoặc CORS không thay thế xác thực.

## Nhận lời chúc chung (Vercel + Supabase)

Nút **Gửi lời chúc** ở thanh menu dưới mở modal nhập tên và nội dung.
Trang gửi `POST /api/wishes`; Vercel Function lưu vào Supabase bằng khóa
server. `GET /api/wishes` trả tối đa 100 lời chúc mới nhất để hiển thị công khai
trong các dải lời chúc nổi bên trái khi mở thiệp (tải lần lượt từng trang). Chỉ trả `id`, `name`,
`message`, `created_at`; không trả `sender_hash` hoặc khóa server.
Không dùng localStorage hoặc filesystem của Function để lưu lời chúc.

### Kết nối lần đầu

1. Tạo hoặc chọn project Supabase của bạn. Mở **SQL Editor**, chạy toàn bộ
   file `supabase/wishes.sql` để tạo bảng, hàm lưu và quyền truy cập.
   Bật Data API và để schema `public` trong danh sách exposed schemas.
2. Trong **Vercel → Project Settings → Environment Variables**, thêm:
   - `SUPABASE_URL`: URL project, dạng `https://<project>.supabase.co`.
   - `SUPABASE_SECRET_KEY`: secret key của project (`sb_secret_…`).
   Chọn môi trường Production; chỉ thêm Preview khi muốn preview có thể ghi
   vào database đó. Nên dùng project riêng cho thử nghiệm.
3. Triển khai repository lên Vercel, giữ Root Directory ở thư mục gốc có
   `api/` và `vercel.json`. Cấu hình hiện tại build JavaScript và phục vụ
   `dist/`; Vercel tự triển khai `api/wishes.js` thành Function.
   Sau khi đổi biến môi trường, cần redeploy.
4. Gửi thử một lời chúc qua trang đã triển khai. Chỉ khi database xác nhận
   lưu thành công, modal mới báo **Đã gửi lời chúc**.

Không dán secret key vào chat, HTML, JS frontend hoặc file được commit.
`.env.example` chỉ chứa mẫu; `.env*` chứa giá trị thật đã được gitignore.

### Hiển thị lời chúc nổi bên trái

Lời chúc xuất hiện thành dải kính xuyên thấu nổi bên trái màn hình, phía trên menu dưới,
ngay khi khách mở thiệp. Không còn mục lời chúc riêng dưới ảnh lớn.
Mỗi lời chúc chạy từ trên xuống dưới và mờ dần; toàn bộ danh sách chỉ chạy một lượt,
sau đó khung tự ẩn. Tải lại trang tạo lượt phát mới, không dùng localStorage.
Không tự tải lại dữ liệu hay phát lại sau khi gửi lời chúc trong cùng trang.

Dữ liệu được tải theo từng trang 100 dòng bằng `GET /api/wishes?offset=…`
để đưa toàn bộ lời chúc vào hàng đợi. Nội dung trùng ID chỉ được đưa vào một lần.
Lời chúc hiển thị đầy đủ, giữ cả xuống dòng, không giới hạn hai dòng hay thêm dấu ba chấm.
Mỗi lượt xuất hiện kéo dài ít nhất 16 giây, tăng theo độ dài nội dung để dễ đọc; nhịp xuất hiện tính theo chiều cao thật của dải phía trước để giữ khoảng hở 6px.
Dải rộng 76% khung điện thoại (tối đa 334px), cách cạnh trái 16px.
Nền hồng nhạt xuyên thấu, chữ trắng, blur nhẹ theo hai thanh menu.
Dải lời chúc dùng padding dọc 4px, không ép chiều cao tối thiểu hai dòng.
Chuyển tab hoặc mở modal sẽ tạm dừng; chế độ giảm chuyển động dùng hiệu ứng
mờ thay cho trượt, giãn nhịp xuất hiện. Nội dung được gán bằng `textContent`.
API lỗi hoặc chưa có lời chúc thì không hiện lớp nổi. Không cần chạy thêm SQL.

### Cô dâu chú rể xem lời chúc

Đăng nhập Supabase, mở **Table Editor → wedding_wishes**, xem các cột
`name`, `message`, `created_at`, sắp xếp theo `created_at` mới nhất.
Có thể xuất CSV từ giao diện quản trị. Chỉ chia sẻ quyền project với người
được phép quản lý dữ liệu; khách không cần tài khoản Supabase.

API kiểm tra nội dung và giới hạn 1 lời chúc/30 giây cho mỗi IP bằng database,
kể cả khi có nhiều Function chạy đồng thời. Khách dùng chung Wi-Fi có thể
phải chờ 30 giây. Chỉ lưu mã HMAC của IP, không lưu IP gốc. Retry cùng mã gửi
và cùng nội dung không tạo bản ghi trùng; lỗi mạng giữ nguyên nội dung trong
modal để khách gửi lại. Đây là hạn chế spam cơ bản, không thay thế CAPTCHA
hay rate limit của hosting nếu website bị bot gửi hàng loạt.

Chạy `npm test` để kiểm tra API và luồng gửi frontend với database mô phỏng.
Kiểm tra SQL tích hợp cần PostgreSQL/Supabase thật.

### Test local có API

Live Server (`127.0.0.1:5500`), mở file HTML trực tiếp và Sites ở chế độ static
chỉ hiển thị giao diện, không chạy API. Để thử gửi lời chúc trên máy:

1. Dùng Node.js 22 trở lên. Tạo file `.env` ở gốc repository theo `.env.example`.
   Điền `SUPABASE_URL` và `SUPABASE_SECRET_KEY` thật vào `.env` tại máy của bạn.
2. Chạy SQL tạo bảng trên Supabase nếu chưa chạy.
3. Chạy `npm run dev`, mở **http://127.0.0.1:3000** (thay cho cổng 5500).
4. Gửi lời chúc test, kiểm tra tại Supabase → Table Editor → `wedding_wishes`.
   Local dùng database ghi trong `.env`, nên lời chúc test cũng được lưu thật.

Server local chỉ công khai HTML/CSS/JS và ảnh; không phục vụ `.env` hoặc mã API.
Đổi `.env`/mã server cần dừng và chạy lại. Có thể đổi cổng bằng biến
`WEDDING_DEV_PORT`. Khi triển khai Vercel vẫn dùng Function gốc và biến môi trường
trong Vercel Settings; `.env` local không tự được đưa lên Vercel.
Nếu muốn giả lập môi trường Vercel bằng CLI, có thể dùng `vercel dev`.

Tham khảo: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js),
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

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
