import { Router } from "express";
import { requireAuth } from "../middleware/auth.mjs";
import { questionLimiter } from "../middleware/rate-limiters.mjs";
import { codeFileUpload } from "../middleware/upload.mjs";
import { answerCodeQuestion } from "../services/code-answer.service.mjs";

const router = Router();

router.post("/", requireAuth, questionLimiter, codeFileUpload.array("codeFiles", 12), async (req, res, next) => {
  try {
    const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
    const repositoryUrl = typeof req.body.repository === "string" ? req.body.repository.trim() : "";
    const result = await answerCodeQuestion({ userId: req.user.id, question, repositoryUrl, uploadedFiles: req.files || [] });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
