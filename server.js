const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'QL_Nhahang',
  password: 'van2003',
  port: 5432
});

// Đăng ký
app.post('/api/register', async (req, res) => {
  const { username, password, email, role } = req.body;
  if (!username || !password || !email || !role) {
    return res.status(400).json({ error: 'Thiếu thông tin!' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
      [username, hash, email, role]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi đăng ký:', err);
    res.status(400).json({ error: 'Tài khoản đã tồn tại hoặc lỗi!' });
  }
});

// Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Sai tài khoản!' });

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Sai mật khẩu!' });

  const role = user.role || 'user';
  res.json({ success: true, role, username: user.username });
});

// Lấy danh sách người dùng
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, role FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách người dùng' });
  }
});

// Xoá người dùng
app.delete('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE username = $1', [username]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xoá người dùng' });
  }
});

// Sửa người dùng
app.put('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const { email, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET email = $1, role = $2 WHERE username = $3',
      [email, role, username]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi cập nhật người dùng:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật' });
  }
});

// Lấy dữ liệu nhà hàng
app.get('/api/nhahang', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nhahang ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy dữ liệu nhà hàng' });
  }
});

// Thêm nhà hàng
app.post('/api/nhahang', async (req, res) => {
  try {
    const {
      ten, dia_chi, mo_ta, khu_vuc, so_dien_th, mo_hinh,
      suc_chua_min, suc_chua_max, dien_tich_min, dien_tich_max,
      gia_min, gia_max, kinh_do, vi_do,
      thoi_gian, danh_gia, gui_xe
    } = req.body;

    const result = await pool.query(
      `INSERT INTO nhahang (
        ten, dia_chi, mo_ta, khu_vuc, so_dien_th, mo_hinh,
        suc_chua_min, suc_chua_max, dien_tich_min, dien_tich_max,
        gia_min, gia_max, kinh_do, vi_do,
        thoi_gian, danh_gia, gui_xe, geom
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13::DOUBLE PRECISION, $14::DOUBLE PRECISION,
        $15, $16, $17,
        ST_SetSRID(ST_MakePoint($13::DOUBLE PRECISION, $14::DOUBLE PRECISION), 4326)
      ) RETURNING *`,
      [ten, dia_chi, mo_ta, khu_vuc, so_dien_th, mo_hinh,
        suc_chua_min, suc_chua_max, dien_tich_min, dien_tich_max,
        gia_min, gia_max, kinh_do, vi_do,
        thoi_gian, danh_gia, gui_xe]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Lỗi thêm nhà hàng:', err);
    res.status(500).json({ error: 'Lỗi thêm nhà hàng', chi_tiet: err.message });
  }
});

// Sửa nhà hàng
app.put('/api/nhahang/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      ten, dia_chi, mo_ta, khu_vuc, so_dien_th, mo_hinh,
      suc_chua_min, suc_chua_max, dien_tich_min, dien_tich_max,
      gia_min, gia_max, kinh_do, vi_do, thoi_gian, danh_gia, gui_xe
    } = req.body;

    const result = await pool.query(`
      UPDATE nhahang SET 
        ten=$1, dia_chi=$2, mo_ta=$3, khu_vuc=$4, so_dien_th=$5, mo_hinh=$6,
        suc_chua_min=$7, suc_chua_max=$8, dien_tich_min=$9, dien_tich_max=$10,
        gia_min=$11, gia_max=$12,
        kinh_do=$13::DOUBLE PRECISION, vi_do=$14::DOUBLE PRECISION,
        geom=ST_SetSRID(ST_MakePoint($13::DOUBLE PRECISION, $14::DOUBLE PRECISION), 4326),
        thoi_gian=$15, danh_gia=$16, gui_xe=$17
      WHERE id=$18
    `, [
      ten, dia_chi, mo_ta, khu_vuc, so_dien_th, mo_hinh,
      suc_chua_min, suc_chua_max, dien_tich_min, dien_tich_max,
      gia_min, gia_max, kinh_do, vi_do,
      thoi_gian, danh_gia, gui_xe,
      id
    ]);

    res.json({ message: 'Cập nhật thành công!' });
  } catch (err) {
    console.error('❌ Lỗi cập nhật nhà hàng:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật nhà hàng', chi_tiet: err.message });
  }
});

// Xoá nhà hàng
app.delete('/api/nhahang/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID không hợp lệ" });
  }
  try {
    const result = await pool.query('DELETE FROM nhahang WHERE id = $1', [id]);
    if (result.rowCount === 0) 
      return res.status(404).json({ error: 'Không tìm thấy nhà hàng' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Không thể xoá nhà hàng'});
  }
});

// tăng lượt truy cập
app.post('/api/incrementVisit', async (req, res) => {
  try {
    await pool.query('UPDATE visit_counter SET count = count + 1 WHERE id = 1');
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi tăng lượt truy cập:', err);
    res.status(500).json({ error: 'Không thể tăng lượt truy cập' });
  }
});

// lấy lượt truy cập
app.get('/api/visitCount', async (req, res) => {
  try {
    const result = await pool.query('SELECT count FROM visit_counter WHERE id = 1');
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('❌ Lỗi lấy lượt truy cập:', err);
    res.status(500).json({ error: 'Không thể lấy lượt truy cập' });
  }
});

app.listen(3000, () => {
  console.log('✅ Backend đang chạy tại http://localhost:3000');
});
