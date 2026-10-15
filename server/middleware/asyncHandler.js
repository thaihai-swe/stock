/**
 * Wrapper middleware cho Express async route handlers.
 * Tự động bắt mọi Promise Rejection hoặc Exception và chuyển tiếp cho next(err)
 * để middleware errorHandler xử lý tập trung, loại bỏ boilerplate try/catch ở controllers.
 * 
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
