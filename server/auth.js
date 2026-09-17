const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'gdmn_quanlycongviec_secret_key_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không tìm thấy mã xác thực. Vui lòng đăng nhập.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }
}

function adminOnly(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.username === 'dangutphuong')) {
    return next();
  }
  return res.status(403).json({ error: 'Bạn không có quyền quản trị viên (Admin) để thực hiện thao tác này.' });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  authMiddleware,
  adminOnly
};
