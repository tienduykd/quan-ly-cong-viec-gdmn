const fs = require('fs');
const path = require('path');
const db = require('./db');

function seedRichTasks() {
  console.log('--- ĐANG TẠO DỮ LIỆU CÔNG VIỆC MẪU ĐA DẠNG ĐỂ TEST ---');

  // Ensure uploads directory exists and sample dummy files exist
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const sampleFiles = [
    { filename: 'de_cuong_gdmn_hk1.docx', content: 'Dự thảo đề cương chi tiết học phần GDMN HK1...' },
    { filename: 'ke_hoach_thuc_tap_su_pham.pdf', content: '%PDF-1.4 Kế hoạch thực tập sư phạm mầm non K46...' },
    { filename: 'mau_phieu_danh_gia_kpi.xlsx', content: 'Mẫu biểu đánh giá hiệu suất cán bộ giảng viên...' },
    { filename: 'bao_cao_nghiem_thu_khoa_hoc.pdf', content: '%PDF-1.4 Báo cáo kết quả nghiên cứu khoa học cấp khoa...' },
    { filename: 'bien_ban_hop_to_chuyen_mon.docx', content: 'Biên bản sinh hoạt chuyên môn Tổ Phương pháp...' }
  ];

  sampleFiles.forEach(f => {
    const filePath = path.join(uploadsDir, f.filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, f.content, 'utf8');
    }
  });

  // Query users
  const getUser = (username) => db.prepare('SELECT id, full_name, department_id FROM users WHERE username = ?').get(username);

  const phuong = getUser('dangutphuong');
  const truong = getUser('nguyencongtruong');
  const huyen_thanh = getUser('nguyenthanhhuyen');
  const huyen_thu = getUser('hoangthuhuyen');
  const thao = getUser('duongthithanhthao');

  const huyen_thi = getUser('nguyenthihuyen');
  const phuong_lan = getUser('danglanphuong');
  const hanh = getUser('nguyenthithuyhanh');
  const hoan = getUser('vuthuyhoan');
  const huong_lan = getUser('caothilanhuong');

  const hoa = getUser('lethihoa');
  const anh = getUser('dinhlananh');
  const thuong = getUser('nguyenlethuong');
  const vinh = getUser('nguyenthivinh');
  const yen = getUser('nguyenthiyen');

  const nhung = getUser('hathicamnhung');
  const an = getUser('dothimaian');
  const huong_thanh = getUser('ngothanhhuong');
  const huyen_nhac = getUser('lethanhhuyen');
  const kieu = getUser('hatrongkieu');
  const man = getUser('tranthiman');

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      title, description, category, priority, status, progress,
      start_date, due_date, completed_at, assigner_id, assignee_id, department_id, is_personal,
      kpi_score, kpi_evaluation, kpi_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFollower = db.prepare('INSERT OR IGNORE INTO task_followers (task_id, user_id) VALUES (?, ?)');
  const insertAttachment = db.prepare(`
    INSERT INTO task_attachments (task_id, uploader_id, filename, original_name, file_path, file_size, file_type, is_result_document)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertComment = db.prepare('INSERT INTO task_comments (task_id, user_id, comment, progress_update) VALUES (?, ?, ?, ?)');
  const insertTransfer = db.prepare(`
    INSERT INTO task_transfer_requests (task_id, requester_id, target_user_id, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const insertNoti = db.prepare('INSERT INTO notifications (user_id, task_id, title, message, type) VALUES (?, ?, ?, ?, ?)');

  const today = '2026-09-17';

  // 1. Task A: Admin giao Thầy Kiều -> Thầy Kiều gửi ĐỀ XUẤT CHUYỂN GIAO sang Cô Mẫn (Đang chờ Cô Phượng duyệt!)
  const tA = insertTask.run(
    'Biên soạn tài liệu thực hành tổ chức hoạt động âm nhạc cho trẻ mầm non',
    'Xây dựng tuyển tập các trò chơi âm nhạc, bài hát dân ca cải biên và hướng dẫn vận động theo nhạc dành cho lứa tuổi nhà trẻ và mẫu giáo.',
    'Chuyên môn GDMN',
    'high',
    'in_progress',
    35,
    '2026-09-05',
    '2026-09-28',
    null,
    phuong.id,
    kieu.id,
    4,
    0,
    null, null, null
  );
  const idA = tA.lastInsertRowid;
  insertFollower.run(idA, huyen_nhac.id);
  insertFollower.run(idA, man.id);
  insertAttachment.run(idA, phuong.id, 'de_cuong_gdmn_hk1.docx', 'Khung_Chuong_Trinh_Am_Nhac_GDMN.docx', path.join(uploadsDir, 'de_cuong_gdmn_hk1.docx'), 45200, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 0);
  insertComment.run(idA, kieu.id, 'Thầy đã phác thảo được 3 chương đầu, tuy nhiên đợt này bận lịch dạy cơ sở 2 nên xin phép Cô cho chuyển giao phần còn lại.', 35);
  // Create pending transfer request
  insertTransfer.run(idA, kieu.id, man.id, 'Do trùng lịch công tác liên kết đào tạo tại cơ sở tỉnh, kính đề xuất Cô Phượng phê duyệt chuyển giao sang Cô Trần Thị Mẫn tiếp tục hoàn thiện.');
  insertNoti.run(phuong.id, idA, 'Đề xuất chuyển giao cần phê duyệt', 'Thầy Hà Trọng Kiều xin chuyển giao việc "Biên soạn tài liệu thực hành..." sang Cô Trần Thị Mẫn.', 'transfer_request');

  // 2. Task B: Admin giao Thầy Trường - ĐẾN HẠN HÔM NAY (2026-09-17)
  const tB = insertTask.run(
    'Hoàn thiện báo cáo rà soát ma trận chuẩn đầu ra CTĐT Giáo dục Mầm non trình Hội đồng Khoa',
    'Tổng hợp ma trận đối sánh giữa Chuẩn đầu ra CTĐT (PLO) và Chuẩn đầu ra các học phần (CLO) của toàn bộ 4 Tổ chuyên môn. Báo cáo trực tiếp tại cuộc họp Hội đồng Khoa.',
    'Chuyên môn GDMN',
    'urgent',
    'in_progress',
    85,
    '2026-09-01',
    today, // Due Today!
    null,
    phuong.id,
    truong.id,
    1,
    0,
    null, null, null
  );
  const idB = tB.lastInsertRowid;
  insertFollower.run(idB, hoa.id);
  insertFollower.run(idB, huyen_thi.id);
  insertAttachment.run(idB, phuong.id, 'mau_phieu_danh_gia_kpi.xlsx', 'Ma_Tran_Chuan_Dau_Ra_PLO_CLO.xlsx', path.join(uploadsDir, 'mau_phieu_danh_gia_kpi.xlsx'), 62100, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 0);
  insertComment.run(idB, truong.id, 'Đã hoàn tất tổng hợp dữ liệu từ 3 tổ, đang rà soát tổ NVSP lần cuối trước 16h chiều nay.', 85);
  insertNoti.run(truong.id, idB, 'Hôm nay đến hạn', 'Công việc Báo cáo rà soát chuẩn đầu ra đến hạn hoàn thành hôm nay!', 'daily_reminder');

  // 3. Task C: Admin giao Cô Đinh Lan Anh - ĐÃ QUÁ HẠN (Cảnh báo đỏ)
  const tC = insertTask.run(
    'Tổng hợp danh sách sinh viên K45 chưa đạt điểm rèn nghề Sư phạm thường xuyên',
    'Đối chiếu sổ điểm thực hành NVSP của các giảng viên phụ trách, lập danh sách sinh viên cần học bổ sung để kịp tiến độ xét đi Thực tập sư phạm năm 3.',
    'Rèn NVSP',
    'high',
    'in_progress',
    40,
    '2026-08-25',
    '2026-09-10', // Overdue!
    null,
    phuong.id,
    anh.id,
    3,
    0,
    null, null, null
  );
  const idC = tC.lastInsertRowid;
  insertFollower.run(idC, hoa.id);
  insertComment.run(idC, phuong.id, 'Nhắc nhở Cô Lan Anh đẩy nhanh tiến độ vì Khoa đang chờ danh sách để gửi cho các trường Mầm non.', null);

  // 4. Task D: Admin giao Cô Đặng Lan Phương - CHỜ NGHIỆM THU (100% - Cô Phượng vào bấm Nghiệm thu & Chấm KPI)
  const tD = insertTask.run(
    'Nghiên cứu xây dựng bộ tiêu chí đánh giá môi trường giáo dục lấy trẻ làm trung tâm',
    'Xây dựng thang đo gồm 5 tiêu chí thành phần đánh giá không gian lớp học mầm non, góc chơi mở và tài liệu kích thích trẻ sáng tạo.',
    'NCKH',
    'high',
    'pending_approval',
    100,
    '2026-08-15',
    '2026-09-16',
    null,
    phuong.id,
    phuong_lan.id,
    2,
    0,
    null, null, null
  );
  const idD = tD.lastInsertRowid;
  insertFollower.run(idD, hoan.id);
  insertFollower.run(idD, hanh.id);
  insertAttachment.run(idD, phuong_lan.id, 'bao_cao_nghiem_thu_khoa_hoc.pdf', 'Du_Thao_Bo_Tieu_Chi_Moi_Truong_GDMN.pdf', path.join(uploadsDir, 'bao_cao_nghiem_thu_khoa_hoc.pdf'), 102400, 'application/pdf', 1);
  insertComment.run(idD, phuong_lan.id, 'Em đã hoàn thiện trọn vẹn bộ tiêu chí và đính kèm bản PDF minh chứng. Kính nhờ Cô Phượng xem và nghiệm thu giúp em ạ!', 100);
  insertNoti.run(phuong.id, idD, 'Báo cáo nghiệm thu', 'Cô Đặng Lan Phương đã nộp sản phẩm hoàn thành, chờ Cô nghiệm thu và đánh giá KPI.', 'task_status_changed');

  // 5. Task E: Admin giao Cô Hoàng Thu Huyền - ĐÃ HOÀN THÀNH & ĐÃ CHẤM ĐIỂM KPI XUẤT SẮC
  const tE = insertTask.run(
    'Tổ chức Hội thảo khoa học cấp Khoa: Ứng dụng STEAM trong giáo dục mầm non hiện đại',
    'Công tác chuẩn bị hậu cần, liên hệ diễn giả khách mời, biên tập tài liệu và chủ trì bàn thảo tại phòng hội thảo trực tuyến.',
    'NCKH',
    'high',
    'completed',
    100,
    '2026-08-20',
    '2026-09-12',
    '2026-09-11 15:30:00',
    phuong.id,
    huyen_thu.id,
    1,
    0,
    9.8,
    'Xuất sắc',
    'Hội thảo rất thành công, thu hút hơn 120 đại biểu và nhận được đánh giá rất cao từ Ban Giám hiệu.'
  );
  const idE = tE.lastInsertRowid;
  insertFollower.run(idE, huong_lan.id);
  insertFollower.run(idE, thao.id);
  insertAttachment.run(idE, huyen_thu.id, 'bien_ban_hop_to_chuyen_mon.docx', 'Ky_Yeu_Hoi_Thao_STEAM_GDMN.docx', path.join(uploadsDir, 'bien_ban_hop_to_chuyen_mon.docx'), 51200, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1);
  insertComment.run(idE, phuong.id, 'Biểu dương Cô Hoàng Thu Huyền và ban thư ký đã hoàn thành xuất sắc nhiệm vụ!', null);

  // 6. Task F: THẦY TRƯỜNG GIAO CHO CÔ HUYỀN (Giảng viên giao cho giảng viên)
  const tF = insertTask.run(
    'Biên tập kỷ yếu bài viết Nghiên cứu khoa học sinh viên ngành GDMN năm 2026',
    'Tiếp nhận các bài báo từ sinh viên khóa K44 và K45, phản biện sơ bộ và tổng hợp thành file kỷ yếu hoàn chỉnh.',
    'NCKH',
    'medium',
    'in_progress',
    50,
    '2026-09-08',
    '2026-10-08',
    null,
    truong.id, // Assigner is Truong
    huyen_thanh.id, // Assignee is Nguyen Thanh Huyen
    1,
    0,
    null, null, null
  );
  const idF = tF.lastInsertRowid;
  insertFollower.run(idF, phuong.id);
  insertComment.run(idF, huyen_thanh.id, 'Đã nhận được 18 bài viết, đang tiến hành biên tập định dạng theo chuẩn APA.', 50);

  // 7. Task G: CÔ LÊ THỊ HÒA (PGĐ, Tổ trưởng NVSP) GIAO CHO CÔ NGUYỄN LỆ THƯƠNG
  const tG = insertTask.run(
    'Xây dựng kế hoạch thực tế trường mầm non đợt 1 cho sinh viên năm thứ hai',
    'Khảo sát các trường mầm non công lập và tư thục trên địa bàn, lên lịch trình đi thực tế rèn nghề 2 tuần cho 3 lớp sinh viên.',
    'Rèn NVSP',
    'medium',
    'in_progress',
    60,
    '2026-09-02',
    '2026-09-25',
    null,
    hoa.id, // Assigner is Le Thi Hoa
    thuong.id, // Assignee is Nguyen Le Thuong
    3,
    0,
    null, null, null
  );
  const idG = tG.lastInsertRowid;
  insertFollower.run(idG, vinh.id);
  insertFollower.run(idG, yen.id);
  insertComment.run(idG, thuong.id, 'Đã làm việc xong với 4 trường mầm non: Hoa Sen, Tuổi Thơ, Sao Mai và Măng Non.', 60);

  // 8. Task H: CÔ HÀ THỊ CẨM NHUNG (Phó khoa SP) GIAO CHO CÔ ĐỖ THỊ MAI AN
  const tH = insertTask.run(
    'Dàn dựng tiết mục nghệ thuật chào mừng Lễ khai giảng và Chào tân sinh viên GDMN',
    'Tuyển chọn sinh viên có năng khiếu múa và hợp xướng, dàn dựng 2 tiết mục văn nghệ mang đậm bản sắc ngành sư phạm mầm non.',
    'Công tác đoàn thể',
    'high',
    'todo',
    0,
    '2026-09-15',
    '2026-10-02',
    null,
    nhung.id, // Assigner is Nhung
    an.id, // Assignee is Mai An
    4,
    0,
    null, null, null
  );
  const idH = tH.lastInsertRowid;
  insertFollower.run(idH, huong_thanh.id);
  insertFollower.run(idH, huyen_nhac.id);

  // 9. Task I: CÔNG VIỆC CÁ NHÂN của Thầy Nguyễn Công Trường (Chỉ Thầy Trường & Admin thấy)
  insertTask.run(
    'Hoàn thiện bản thảo bài báo quốc tế về Giáo dục thể chất sớm cho trẻ mầm non',
    'Chỉnh sửa phản biện vòng 2 theo yêu cầu của tạp chí Early Child Development and Care.',
    'Việc cá nhân',
    'high',
    'in_progress',
    75,
    '2026-09-01',
    '2026-10-10',
    null,
    truong.id,
    truong.id,
    1,
    1, // Personal Task!
    null, null, null
  );

  // 10. Task J: CÔNG VIỆC CÁ NHÂN của Cô Đỗ Thị Mai An (Chỉ Cô Mai An & Admin thấy)
  insertTask.run(
    'Biên soạn bài giảng điện tử học phần Phương pháp cho trẻ làm quen tác phẩm văn học',
    'Thiết kế bài giảng tương tác trên Canva kết hợp video hoạt hình rối kể chuyện cho sinh viên thực hành.',
    'Việc cá nhân',
    'medium',
    'in_progress',
    50,
    '2026-09-10',
    '2026-09-30',
    null,
    an.id,
    an.id,
    4,
    1, // Personal Task!
    null, null, null
  );

  // 11. Task K: Admin giao Cô Vũ Thúy Hoàn - ĐẢM BẢO CHẤT LƯỢNG (KĐCL)
  const tK = insertTask.run(
    'Khảo sát ý kiến phản hồi của nhà tuyển dụng về chất lượng đào tạo sinh viên tốt nghiệp GDMN',
    'Phát phiếu khảo sát Google Form đến hơn 50 trường mầm non công lập và ngoài công lập, tổng hợp tỷ lệ hài lòng về kỹ năng nghề nghiệp và đạo đức sư phạm.',
    'Đảm bảo chất lượng',
    'medium',
    'todo',
    10,
    '2026-09-16',
    '2026-10-20',
    null,
    phuong.id,
    hoan.id,
    2,
    0,
    null, null, null
  );
  insertFollower.run(tK.lastInsertRowid, hanh.id);

  // 12. Task L: Admin giao Cô Dương Thị Thanh Thảo - HÀNH CHÍNH & TỔNG KẾT
  insertTask.run(
    'Kiểm kê và đề xuất mua sắm trang thiết bị đồ chơi mầm non phòng thực hành Phương pháp',
    'Rà soát danh mục đồ dùng đồ chơi tự tạo và thiết bị giáo dục mầm non, lập tờ trình dự trù kinh phí bổ sung cho học kỳ mới.',
    'Hành chính',
    'medium',
    'in_progress',
    30,
    '2026-09-12',
    '2026-09-29',
    null,
    phuong.id,
    thao.id,
    1,
    0,
    null, null, null
  );

  console.log('✅ ĐÃ KHỞI TẠO XONG 12 CÔNG VIỆC ĐA DẠNG ĐỂ TEST!');
}

seedRichTasks();
