import multer from "multer";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Each source file must be under 1 MB." : error.code === "LIMIT_FILE_COUNT" ? "Upload up to 12 code files at once." : "The uploaded files could not be processed.";
    return res.status(400).json({ error: message });
  }
  const status = Number(error.status) || (error.code === 11000 ? 409 : 500);
  if (status >= 500) console.error("API request failed:", error.message);
  return res.status(status).json({ error: status >= 500 ? "Something went wrong. Check the server configuration and try again." : error.message });
}
