/**
 * Middleware xử lý lỗi toàn cục và bắt các endpoint API không tồn tại
 * Đảm bảo mọi phản hồi lỗi đều tuân thủ định dạng JSON chuẩn.
 */

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  console.error(`❌ [API Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu.',
    statusCode,
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' không tồn tại trên hệ thống.`,
    statusCode: 404,
  });
}
