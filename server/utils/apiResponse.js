/**
 * server/utils/apiResponse.js
 * Bộ tiện ích chuẩn hóa phản hồi API JSON cho toàn bộ hệ thống Express.
 */

export function sendSuccess(res, data, message = null, statusCode = 200) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
}

export function sendError(res, message, statusCode = 400, details = null) {
  const payload = {
    success: false,
    error: message,
  };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}
