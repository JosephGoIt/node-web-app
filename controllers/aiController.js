const {
    GoogleGenerativeAI,
  } = require("@google/generative-ai");
  
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };
  
  exports.askAI = async (req, res) => {
    try {
      const { question } = req.body;
  
      const chatSession = model.startChat({
        generationConfig,
        history: [],
      });
  
      const result = await chatSession.sendMessage(question);
  
      return res.status(200).json({
        answer: result.response.text(),
      });
    } catch (error) {
      console.error("Error communicating with Gemini AI:", error);
      return res.status(500).json({ message: "Internal Server Error." });
    }
  };
  
  