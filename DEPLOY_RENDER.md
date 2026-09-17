# HƯỚNG DẪN TRIỂN KHAI LÊN RENDER & BẬT CHỐNG NGỦ ĐÔNG 24/7

---

## 1. Kho Mã Nguồn GitHub
Mã nguồn dự án đã được đồng bộ lên GitHub:
👉 **[https://github.com/tienduykd/quan-ly-cong-viec-gdmn](https://github.com/tienduykd/quan-ly-cong-viec-gdmn)**

---

## 2. Các Bước Đưa Lên Render.com (Miễn Phí 100%)

### Bước 1: Đăng nhập Render
1. Truy cập: **[https://dashboard.render.com](https://dashboard.render.com)**
2. Nhấn **"Sign in with GitHub"** (dùng tài khoản GitHub `tienduykd`).

### Bước 2: Tạo Web Service mới
1. Tại trang chủ Render Dashboard, nhấn nút **"New +"** (góc trên bên phải) -> Chọn **"Web Service"**.
2. Chọn tùy chọn **"Build and deploy from a Git repository"** -> Nhấn **Next**.
3. Tại danh sách repository, chọn kho **`quan-ly-cong-viec-gdmn`** (nếu chưa thấy, nhấn "Configure account" để cấp quyền đọc repo).
4. Nhấn **Connect**.

### Bước 3: Điền Thông Số Cấu Hình
Render sẽ mở trang cấu hình, bạn điền hoặc kiểm tra các mục sau:
- **Name**: `quan-ly-cong-viec-gdmn` (hoặc tên tùy thích)
- **Region**: Chọn **Singapore** (vị trí gần Việt Nam nhất, tốc độ nhanh nhất)
- **Branch**: `main`
- **Root Directory**: Để trống
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  npm start
  ```
- **Instance Type**: Chọn **Free** ($0/tháng).

### Bước 4: Thêm Biến Môi Trường (Environment Variables)
Cuộn xuống phần **Environment Variables**, bấm **Add Environment Variable**:
- Key: `NODE_ENV` | Value: `production`
- Key: `APP_NAME` | Value: `Phần mềm hỗ trợ quản lý công việc - Ngành GDMN`

### Bước 5: Nhấn "Deploy Web Service"
1. Nhấn nút **Deploy Web Service** ở cuối trang.
2. Render sẽ tự động cài đặt và đóng gói ứng dụng trong khoảng 1-2 phút.
3. Khi hoàn tất, Render sẽ hiển thị trạng thái **Live** màu xanh lá và cấp đường link công khai, dạng:
   👉 **`https://quan-ly-cong-viec-gdmn.onrender.com`**

Bạn chỉ cần gửi đường link này cho vợ (Cô Đặng Út Phượng) là Cô có thể truy cập trên điện thoại, máy tính bảng hoặc laptop từ bất cứ đâu!

---

## 3. Cơ Chế Chống Ngủ Đông (Keep-Alive 24/7)

Gói miễn phí của Render sẽ tạm dừng dịch vụ sau 15 phút nếu không có ai truy cập. Chúng tôi đã thiết lập sẵn **2 lớp chống ngủ đông**:

### Lớp 1: Tự động Ping ngầm (Self-Ping tích hợp sẵn)
- Trong mã nguồn Node.js (`server/keepAlive.js`), hệ thống đã được cài đặt tiến trình chạy ngầm: **Cứ mỗi 12 phút, hệ thống tự động gửi yêu cầu kiểm tra đến chính nó** (`/api/health` hoặc `/ping`).
- Render nhận diện được lưu lượng hoạt động nên sẽ **không bao giờ rơi vào trạng thái ngủ đông**.
- *Cách kích hoạt*: Khi tạo Web Service trên Render xong và có link web (vd: `https://quan-ly-cong-viec-gdmn.onrender.com`), bạn vào mục **Environment** trên Render, thêm biến:
  - Key: `APP_URL`
  - Value: `https://quan-ly-cong-viec-gdmn.onrender.com`

### Lớp 2: Ping từ bên ngoài bằng Cron-job.org (Khuyên dùng để đảm bảo 100% không bao giờ tắt)
Nếu muốn chắc chắn 100% ngay cả khi khởi động lại:
1. Đăng ký tài khoản miễn phí tại **[https://cron-job.org](https://cron-job.org)**.
2. Nhấn **"Create Cronjob"**:
   - Title: `Ping GDMN Render`
   - Address (URL): `https://quan-ly-cong-viec-gdmn.onrender.com/ping`
   - Schedule: Chọn **"Every 10 minutes"** (Cứ 10 phút một lần).
3. Nhấn **Save**.
Hệ thống cron-job.org sẽ tự động gửi tín hiệu "đánh thức" định kỳ, giúp website của vợ bạn luôn tải ngay lập tức không bị chờ đợi!
