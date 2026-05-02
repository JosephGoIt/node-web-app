/**
 * @swagger
 * /api/ai/ask:
 *   post:
 *     summary: Send an instruction to BlueBot Agent
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
 *                 example: "Navigate to Maersk, enter tracking 721144157, and extract ETA/ATA."
 *     responses:
 *       200:
 *         description: Extracted shipping data
 */

const express = require("express");
const { askAI } = require("../../controllers/aiController");
const Joi = require("joi");

const router = express.Router();

const questionSchema = Joi.object({
  question: Joi.string().min(10).required()
});

// Middleware for validation
const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    next();
};

router.post("/ask", validateRequest(questionSchema), askAI);

module.exports = router;
