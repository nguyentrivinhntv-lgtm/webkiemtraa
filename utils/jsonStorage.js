const fs = require('fs');
const path = require('path');

/**
 * Safely read a JSON file with fallback to default value
 * @param {string} filePath - Absolute path to JSON file
 * @param {any} defaultValue - Fallback value if file doesn't exist or is corrupted
 * @returns {any}
 */
function safeReadJson(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    safeWriteJson(filePath, defaultValue);
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || !raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ Cảnh báo: Lỗi cú pháp JSON tại ${filePath}, dùng giá trị mặc định:`, err.message);
    return defaultValue;
  }
}

/**
 * Safely write data to a JSON file atomically via a temporary file
 * to avoid data corruption or race conditions.
 * @param {string} filePath - Absolute path to target JSON file
 * @param {any} data - Object or Array to serialize
 */
function safeWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`⚠️ Lỗi khi ghi nguyên tử file ${filePath}:`, err.message);
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
    // Fallback to direct synchronous write
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

module.exports = {
  safeReadJson,
  safeWriteJson
};
