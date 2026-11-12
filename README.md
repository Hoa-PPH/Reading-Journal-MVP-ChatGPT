# Reading Journal MVP v1.1

Ứng dụng ghi chép và quản lý tri thức cá nhân. Phiên bản này chạy local trên máy bằng IndexedDB; có sẵn phần kết nối Supabase (đăng nhập email OTP, lưu và đồng bộ dữ liệu) để bật khi bạn tạo project Supabase.

## Công nghệ

- React 18 + TypeScript + Vite
- IndexedDB qua thư viện `idb` để lưu dữ liệu trong trình duyệt
- Supabase Auth + Postgres + Row Level Security cho tài khoản và đồng bộ cloud
- GitHub Actions để kiểm tra build khi push code

## 1. Chạy trên máy tính bằng VS Code

### Cài công cụ

1. Cài Node.js bản LTS: https://nodejs.org/
2. Cài Visual Studio Code: https://code.visualstudio.com/
3. Giải nén thư mục dự án và mở thư mục `reading-journal` bằng VS Code.

### Cài thư viện và chạy

Mở Terminal trong VS Code (**Terminal > New Terminal**) và chạy:

```bash
npm install
npm run dev
```

Vite sẽ in ra địa chỉ, thường là `http://localhost:5173`. Mở địa chỉ đó bằng Chrome hoặc Edge. Giữ cửa sổ Terminal mở trong lúc dùng ứng dụng.

Để kiểm tra bản production:

```bash
npm run build
npm run preview
```

## 2. Kết nối Supabase

### Tạo project

1. Truy cập https://supabase.com/ và đăng nhập.
2. Tạo một project mới, lưu lại database password ở nơi an toàn.
3. Vào **SQL Editor** trong Supabase.
4. Mở file `supabase/schema.sql` trong dự án, sao chép toàn bộ nội dung và chạy trong SQL Editor.
5. Vào **Project Settings > API** (hoặc mục API Keys tùy giao diện Supabase) để lấy Project URL và anon/public key.

### Cấu hình ứng dụng

1. Trong thư mục dự án, sao chép `.env.example` thành `.env`.
2. Điền hai giá trị của project:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. Lưu file `.env`, dừng Vite bằng `Ctrl + C`, sau đó chạy lại `npm run dev`.
4. Mở ứng dụng > **Cài đặt** > **Đăng nhập bằng email**. Supabase gửi liên kết đăng nhập qua email.
5. Sau khi đăng nhập, chọn **Đồng bộ ngay**.

**Bảo mật:** Chỉ dùng anon/publishable key ở frontend. Không bao giờ đưa `service_role` key vào file `.env` của frontend hoặc commit lên GitHub. Các bảng bật RLS để mỗi tài khoản chỉ truy cập dữ liệu có `user_id` của chính mình.

### Thiết lập URL đăng nhập

Trong Supabase, mở **Authentication > URL Configuration**:

- Site URL khi chạy local: `http://localhost:5173`
- Thêm `http://localhost:5173/**` vào Redirect URLs nếu dashboard yêu cầu.
- Khi deploy website, thêm domain production vào Site URL/Redirect URLs.

## 3. Đưa mã nguồn lên GitHub

1. Tạo repository mới tại https://github.com/new. Ví dụ tên: `reading-journal`.
2. Không chọn tạo README tự động nếu bạn đã dùng README trong thư mục này.
3. Mở Terminal tại thư mục dự án và chạy:

```bash
git init
git add .
git commit -m "Initial Reading Journal MVP 1.1"
git branch -M main
git remote add origin https://github.com/USERNAME/reading-journal.git
git push -u origin main
```

Thay `USERNAME` bằng tên tài khoản GitHub của bạn. Nếu Git hỏi xác thực, làm theo hướng dẫn đăng nhập của GitHub.

`.gitignore` đã loại trừ `.env`, `node_modules` và `dist`, do đó file chứa khóa Supabase không được đẩy lên GitHub.

## 4. Deploy website

Có thể deploy frontend bằng Vercel hoặc Netlify sau khi đẩy code lên GitHub:

- Build command: `npm run build`
- Output directory: `dist`
- Thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` vào Environment Variables của dịch vụ deploy.
- Thêm domain deploy vào Supabase Authentication > URL Configuration.

Supabase là backend (database + auth), GitHub là nơi lưu mã nguồn. GitHub Pages không tự cung cấp database/auth cho ứng dụng.

## 5. Các chức năng trong MVP

- Tạo, sửa, xóa tài liệu: sách, bài viết, video, khóa học, loại khác.
- Theo dõi trạng thái: đang đọc, đã đọc, tạm dừng, muốn đọc.
- Tạo, sửa, xóa ghi chú: ý tưởng, câu hỏi, phản biện, bài học.
- Gắn ghi chú vào tài liệu và thêm tags.
- Tìm kiếm nội dung, lọc loại ghi chú.
- Lưu local tự động qua IndexedDB.
- Xuất/nhập dữ liệu JSON.
- Giao diện sáng/tối, responsive.
- Supabase email OTP và đồng bộ dữ liệu cơ bản khi cấu hình.

## 6. Giới hạn cần biết ở MVP 1.1

- Đồng bộ là thao tác thủ công từ trang Cài đặt, chưa có đồng bộ nền/offline queue.
- Khi đồng bộ cùng một ID, phiên bản đang có trên thiết bị sẽ được upsert lên cloud. Đây chưa phải cơ chế xử lý xung đột nhiều thiết bị hoàn chỉnh.
- Xóa dữ liệu trên một thiết bị chưa tự động phát lệnh xóa tương ứng trên cloud. Cần bổ sung tombstone/soft-delete trước khi dùng như hệ thống đồng bộ đa thiết bị lâu dài.
- File JSON là cách sao lưu độc lập nên vẫn nên xuất định kỳ.

## 7. Cấu trúc thư mục

```text
reading-journal/
├── .github/workflows/ci.yml
├── src/
│   ├── lib/             # IndexedDB, Supabase, cloud sync
│   ├── App.tsx          # Giao diện và luồng chức năng chính
│   ├── main.tsx         # Điểm khởi chạy React
│   ├── styles.css       # Giao diện responsive
│   └── types.ts         # Kiểu dữ liệu TypeScript
├── supabase/schema.sql  # Bảng dữ liệu và RLS policies
├── .env.example
├── .gitignore
├── index.html
└── package.json
```
