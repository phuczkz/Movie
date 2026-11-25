/**
 * profile-format.js
 *
 * Chuẩn hóa dữ liệu hồ sơ người dùng (ngày sinh, số điện thoại) đọc từ
 * Firestore / Firebase Auth để luôn tương thích với UI input (ISO YYYY-MM-DD).
 */

const pad2 = (n) => String(n).padStart(2, "0");

const isValidYMD = (year, month, day) => {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const check = new Date(year, month - 1, day);
  return (
    check.getFullYear() === year &&
    check.getMonth() === month - 1 &&
    check.getDate() === day
  );
};

const formatLocalYMD = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (!isValidYMD(year, month, day)) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

/**
 * Lấy giá trị đầu tiên hợp lệ (khác null, undefined và chuỗi rỗng).
 */
export const pickFirstValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === "string" && candidate.trim() === "") continue;
    return candidate;
  }
  return "";
};

/**
 * Chuẩn hóa ngày sinh về dạng "YYYY-MM-DD" cho <input type="date">.
 * Hỗ trợ Firestore Timestamp, Date, Unix timestamp và các chuỗi ngày phổ biến.
 */
export const normalizeBirthday = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      return formatLocalYMD(value.toDate());
    }
    if (typeof value.seconds === "number") {
      return formatLocalYMD(new Date(value.seconds * 1000));
    }
    if (value instanceof Date) {
      return formatLocalYMD(value);
    }
    return "";
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return "";
    const ms = value > 1e12 ? value : value * 1000;
    return formatLocalYMD(new Date(ms));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // YYYY-MM-DD, YYYY/MM/DD, YYYY-M-D, hoặc ISO datetime (2000-05-15T...)
    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const month = Number(ymdMatch[2]);
      const day = Number(ymdMatch[3]);
      if (isValidYMD(year, month, day)) {
        return `${year}-${pad2(month)}-${pad2(day)}`;
      }
    }

    // DD/MM/YYYY hoặc DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      if (isValidYMD(year, month, day)) {
        return `${year}-${pad2(month)}-${pad2(day)}`;
      }
    }

    // Fallback: parse chuỗi ngày tự do (ví dụ "May 15, 2000")
    const parsed = new Date(trimmed);
    return formatLocalYMD(parsed);
  }

  return "";
};

/**
 * Chuẩn hóa số điện thoại đọc từ Firestore (hỗ trợ cả string và number).
 */
export const normalizePhoneNumber = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) && value !== 0 ? String(Math.trunc(value)) : "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
    return trimmed;
  }
  return "";
};
