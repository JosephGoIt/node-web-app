const { getTask } = require("../helpers/task");
const { BlueBotAgent } = require("../services/agent");

const askAI = async (req, res) => {
    try {
        const taskInstructions = getTask(req.body.question);
        const agent = new BlueBotAgent(taskInstructions, process.env.GOOGLE_API_KEY);
        
        console.log("🚀 Starting BlueBot Agent Service...");
        const response = await agent.run();

        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error("❌ BlueBot Controller Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = { askAI };