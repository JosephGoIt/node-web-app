/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Endpoints for interacting with Gemini AI
 */

/**
 * @swagger
 * /api/ai/ask:
 *   post:
 *     summary: Ask Gemini AI a question
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "Who is Han Xin?"
 *                 description: The question to ask Gemini AI
 *     responses:
 *       200:
 *         description: The AI's response to the question
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   example: "Han Xin was a Chinese military general..."
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Question is required."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error."
 */

const express = require("express");
const { askAI } = require("../../controllers/aiController");
const validateRequest = require("../../helpers/validationMiddleware");
const Joi = require("joi");

const router = express.Router();

const questionSchema = Joi.object({
  question: Joi.string().min(5).required().messages({
    "string.base": "Question must be a string.",
    "string.empty": "Question cannot be empty.",
    "string.min": "Question must be at least 5 characters long.",
    "any.required": "Question is required.",
  }),
});

router.post("/ask", validateRequest(questionSchema), askAI);

module.exports = router;
