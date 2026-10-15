import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { ROOT_DIR } from '../config/constants.js';

const VENV_PYTHON = path.join(ROOT_DIR, '.venv', 'bin', 'python');
export const PYTHON_CMD = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

/**
 * Kiểm tra xem môi trường hiện tại có khả năng thực thi Python Pipeline hay không.
 * Trả về false trên Vercel / Serverless read-only hoặc khi thiếu virtualenv Python.
 */
export function isPythonAvailable() {
  if (process.env.VERCEL || process.env.NOW_REGION) {
    return false;
  }
  return fs.existsSync(VENV_PYTHON);
}

/**
 * Thực thi một Python script trong thư mục dự án với cơ chế Promise-based:
 * - Tự động thiết lập cwd = ROOT_DIR.
 * - Tự động kế thừa process.env (chứa TURSO_DATABASE_URL, DB_MODE, GEMINI_API_KEY).
 * - Hỗ trợ timeout và bắt lỗi tập trung.
 * 
 * @param {string} scriptRelativePath - Đường dẫn tương đối từ ROOT_DIR, ví dụ 'scripts/sync_fundamentals.py'
 * @param {string[]} args - Danh sách tham số CLI, ví dụ ['--symbols', 'HPG']
 * @param {object} options - Cấu hình bổ sung (timeout, env, ...)
 * @returns {Promise<{ success: boolean, stdout: string, stderr: string, code: number }>}
 */
export function runPythonScript(scriptRelativePath, args = [], options = {}) {
  const scriptPath = path.resolve(ROOT_DIR, scriptRelativePath);
  const timeoutMs = options.timeout || 120000; // 2 phút mặc định

  return new Promise((resolve) => {
    if (!fs.existsSync(scriptPath)) {
      return resolve({
        success: false,
        stdout: '',
        stderr: `Không tìm thấy file script: ${scriptPath}`,
        code: 1,
      });
    }

    const execOptions = {
      cwd: ROOT_DIR,
      env: { ...process.env, ...(options.env || {}) },
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      ...options,
    };

    execFile(PYTHON_CMD, [scriptPath, ...args], execOptions, (error, stdout, stderr) => {
      if (error) {
        return resolve({
          success: false,
          stdout: stdout || '',
          stderr: stderr || error.message,
          code: error.code || 1,
        });
      }
      return resolve({
        success: true,
        stdout: stdout || '',
        stderr: stderr || '',
        code: 0,
      });
    });
  });
}
