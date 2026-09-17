# HƯỚNG DẪN SỬ DỤNG
## PHẦN MỀM HỖ TRỢ QUẢN LÝ CÔNG VIỆC - NGÀNH GIÁO DỤC MẦM NON (GDMN)

---

### 1. Cách Khởi động Phần mềm
- **Cách 1 (Nhanh nhất)**: Nhấp đúp chuột vào tệp tin **`Chay_Phan_Mem.bat`** tại thư mục chương trình. Hệ thống sẽ tự động khởi động máy chủ và mở trình duyệt tại địa chỉ: `http://localhost:5000`
- **Cách 2**: Mở terminal/PowerShell tại thư mục `d:\DA_QuanLyCongViec` và chạy:
  ```bash
  npm start
  ```

---

### 1.1. Các Tình huống Dữ liệu Mẫu đã Khởi tạo để Cô Test Ngay

Hệ thống đã nạp sẵn **16 công việc mẫu** bao quát mọi nghiệp vụ sư phạm để Cô kiểm thử:

1. **Test Phê duyệt Chuyển giao công việc** (Đang chờ Cô Phượng duyệt):
   - Mở công việc: *"Biên soạn tài liệu thực hành tổ chức hoạt động âm nhạc cho trẻ mầm non"*.
   - **Tình huống**: Thầy Hà Trọng Kiều gửi đề xuất xin chuyển cho Cô Trần Thị Mẫn.
   - 👉 Khi Cô đăng nhập Admin (`dangutphuong`), Cô sẽ thấy khung màu vàng nổi bật kèm 2 nút: **"Chấp thuận chuyển giao"** và **"Từ chối"**.
2. **Test Nghiệm thu & Chấm điểm KPI** (Chờ nghiệm thu 100%):
   - Mở công việc: *"Nghiên cứu xây dựng bộ tiêu chí đánh giá môi trường giáo dục lấy trẻ làm trung tâm"*.
   - **Tình huống**: Cô Đặng Lan Phương đã hoàn thành 100% và nộp kèm file PDF kết quả.
   - 👉 Cô Phượng bấm nút **"Nghiệm thu & Đánh giá KPI"** để cho điểm (vd: 9.8), chọn xếp loại (*Xuất sắc*) và ghi nhận xét.
3. **Test Công việc đến hạn hôm nay (2026-09-17)**:
   - Công việc: *"Hoàn thiện báo cáo rà soát ma trận chuẩn đầu ra CTĐT Giáo dục Mầm non"* (Thầy Nguyễn Công Trường phụ trách - mức độ **Khẩn cấp 🔴**).
4. **Test Cảnh báo Quá hạn**:
   - Công việc: *"Tổng hợp danh sách sinh viên K45 chưa đạt điểm rèn nghề Sư phạm thường xuyên"* (Hạn ngày 10/09 - hiển thị nhãn **Quá hạn màu đỏ**).
5. **Test Nguyên tắc bảo mật "Việc của ai người đó xem"**:
   - **Đăng nhập Thầy Nguyễn Công Trường** (`nguyencongtruong` / `truong123`): Thầy Trường thấy 5 công việc (việc Thầy làm chính, việc Thầy giao cho Cô Huyền, và việc cá nhân riêng của Thầy).
   - **Đăng nhập Cô Đỗ Thị Mai An** (`dothimaian` / `an123`): Cô Mai An chỉ thấy đúng 2 việc liên quan đến mình (1 việc được giao và 1 việc cá nhân). Hoàn toàn không thấy việc của Thầy Trường hay người khác!
   - **Đăng nhập Cô Đặng Út Phượng** (`dangutphuong` / `phuong123`): Cô là Admin nên thấy toàn bộ 16 công việc của cả 4 Tổ.
6. **Test Nhắc việc Zalo**:
   - Vào tab **"Nhắc việc Zalo"** -> bấm **"Gửi ngay bản tin điểm việc hôm nay"**. Hệ thống sẽ tự động trích xuất các việc đến hạn hôm nay và quá hạn để lên bản tin Zalo mẫu.

---

### 2. Danh sách Tài khoản & Mật khẩu Ban đầu (21 Cán bộ / Giảng viên)

Tất cả 21 cán bộ/giảng viên thuộc 4 Tổ chuyên môn đã được khởi tạo sẵn với cấu trúc:
- **Tên đăng nhập (Username)**: Viết liền không dấu, chữ thường (vd: `dangutphuong`).
- **Mật khẩu ban đầu**: Tên gọi không dấu + `123` (vd: `phuong123`).

| STT | Họ và tên | Tổ chuyên môn | Chức danh / Học vị | Username | Mật khẩu mặc định | Quyền hệ thống |
|:---:|:---|:---|:---|:---|:---|:---|
| 1 | **Đặng Út Phượng** | Tổ Phương pháp | Tiến sĩ GDH, GĐ, GVC | `dangutphuong` | `phuong123` | **Admin / Quản trị** |
| 2 | Nguyễn Công Trường | Tổ Phương pháp | Tiến sĩ GDTC, PGĐ | `nguyencongtruong` | `truong123` | Giảng viên (PGĐ) |
| 3 | Nguyễn Thanh Huyền | Tổ Phương pháp | Tiến sĩ Văn học, GVC | `nguyenthanhhuyen` | `huyen123` | Giảng viên |
| 4 | Hoàng Thu Huyền | Tổ Phương pháp | ThS GDMN (NCS), GV | `hoangthuhuyen` | `huyen123` | Giảng viên |
| 5 | Dương Thị Thanh Thảo | Tổ Phương pháp | ThS Sinh học, GVC | `duongthithanhthao` | `thao123` | Giảng viên |
| 6 | Nguyễn Thị Huyền | Tổ Tâm lý - GD | Tiến sĩ GDH, PGĐ, GV | `nguyenthihuyen` | `huyen123` | Giảng viên (PGĐ) |
| 7 | Đặng Lan Phương | Tổ Tâm lý - GD | Tiến sĩ GDH, GVC | `danglanphuong` | `phuong123` | Giảng viên |
| 8 | Nguyễn Thị Thúy Hạnh | Tổ Tâm lý - GD | Tiến sĩ Tâm lí, GVC | `nguyenthithuyhanh` | `hanh123` | Giảng viên |
| 9 | Vũ Thúy Hoàn | Tổ Tâm lý - GD | Tiến sĩ Tâm lí, GVC | `vuthuyhoan` | `hoan123` | Giảng viên |
| 10 | Cao Thị Lan Hương | Tổ Tâm lý - GD | ThS GDMN, GV | `caothilanhuong` | `huong123` | Giảng viên |
| 11 | Lê Thị Hòa | Tổ NVSP | ThS GDMN (NCS), PGĐ, GV | `lethihoa` | `hoa123` | Giảng viên (PGĐ) |
| 12 | Đinh Lan Anh | Tổ NVSP | ThS GDMN (NCS), GV | `dinhlananh` | `anh123` | Giảng viên |
| 13 | Nguyễn Lệ Thương | Tổ NVSP | ThS GDMN, GV | `nguyenlethuong` | `thuong123` | Giảng viên |
| 14 | Nguyễn Thị Vinh | Tổ NVSP | ThS GDMN, GV | `nguyenthivinh` | `vinh123` | Giảng viên |
| 15 | Nguyễn Thị Yến | Tổ NVSP | ThS GDMN, GV | `nguyenthiyen` | `yen123` | Giảng viên |
| 16 | Hà Thị Cẩm Nhung | Tổ GD Nghệ thuật | ThS GDMN, Phó khoa SP, GV | `hathicamnhung` | `nhung123` | Giảng viên (Phó khoa) |
| 17 | Đỗ Thị Mai An | Tổ GD Nghệ thuật | ThS Văn hóa học, GV | `dothimaian` | `an123` | Giảng viên |
| 18 | Ngô Thanh Hương | Tổ GD Nghệ thuật | ThS Văn hóa học, GV | `ngothanhhuong` | `huong123` | Giảng viên |
| 19 | Lê Thanh Huyền | Tổ GD Nghệ thuật | ThS Âm nhạc, GV, Nhóm trưởng | `lethanhhuyen` | `huyen123` | Giảng viên (Tổ trưởng) |
| 20 | Hà Trọng Kiều | Tổ GD Nghệ thuật | ThS Âm nhạc, GV | `hatrongkieu` | `kieu123` | Giảng viên |
| 21 | Trần Thị Mẫn | Tổ GD Nghệ thuật | ThS Âm nhạc, GV | `tranthiman` | `man123` | Giảng viên |

*(Thầy/Cô có thể đổi mật khẩu và cập nhật SĐT Zalo tại mục **Thông tin cá nhân**).*

---

### 3. Các Phân hệ Chức năng Chính

#### 3.1. Phân hệ Giao việc & Quản lý Công việc
- **Tạo việc mới**:
  - Bấm nút **"+ Giao việc / Thêm việc"** ở góc trên thanh điều hướng.
  - Chọn **Người xử lý chính**, hạn hoàn thành, mức độ ưu tiên (Khẩn cấp, Cao, Bình thường, Thấp).
  - Chọn danh sách **Người theo dõi** (xem được tiến độ, tham gia trao đổi nhưng không phải chịu trách nhiệm hoàn thành).
  - Đính kèm tệp văn bản hướng dẫn, biểu mẫu, kế hoạch (Word, Excel, PDF, hình ảnh...).
  - **Tùy chọn "Việc cá nhân"**: Bật công tắc này nếu muốn tạo việc riêng cho bản thân, việc này hoàn toàn riêng tư và chỉ người tạo mới xem được.

#### 3.2. Quy trình Chuyển giao người xử lý (Cần Người giao việc phê duyệt)
1. Giảng viên đang xử lý chính mở chi tiết công việc, nhấn **"Xin chuyển"** (hoặc Đề xuất chuyển giao).
2. Chọn giảng viên thay thế và ghi rõ lý do.
3. Người giao việc (hoặc Cô Phượng - Admin) sẽ nhận thông báo trên hệ thống.
4. Người giao việc xem xét lý do và bấm **"Chấp thuận chuyển giao"** hoặc **"Từ chối"**. Khi chấp thuận, người xử lý mới sẽ tự động được cập nhật.

#### 3.3. Báo cáo Kết quả & Nghiệm thu KPI
- Giảng viên xử lý chính kéo thanh tiến độ đạt 100% và bấm **"Nộp thêm minh chứng / sản phẩm hoàn thành"** (tải file giáo án, đề cương, báo cáo...).
- Bấm **"Báo cáo hoàn thành"** để chuyển sang trạng thái *Chờ nghiệm thu*.
- Người giao việc / Admin mở công việc, bấm **"Nghiệm thu & Đánh giá KPI"**:
  - Cho điểm thang 10 (vd: 9.5).
  - Xếp loại: *Xuất sắc*, *Tốt*, *Đạt*, *Cần cố gắng*.
  - Ghi chú nhận xét.

#### 3.4. Nhắc việc Tự động qua Zalo
- **Giờ hẹn tự động**: **07:30 sáng mỗi ngày**, hệ thống tự động quét các công việc:
  - Việc đến hạn trong ngày.
  - Việc quá hạn chưa hoàn thành.
  - Gửi thông báo tổng hợp vào Nhóm Zalo chung của Ngành GDMN qua Webhook.
- **Kích hoạt tức thì**: Cô Phượng có thể vào tab **"Nhắc việc Zalo"** và bấm **"Gửi ngay bản tin điểm việc hôm nay"** bất cứ lúc nào.

#### 3.5. Xuất Báo cáo Excel
- Tại màn hình **Tổng quan** hoặc **Thống kê & KPI**, bấm **"Xuất Báo cáo Excel đầy đủ (.xlsx)"** để tải ngay file thống kê toàn bộ công việc với đầy đủ cột điểm KPI, xếp loại và tiến độ.
