/**
 * Prepares the task instructions for the BlueBotAgent
 */
const getTask = (instruction) => {
    if (!instruction) {
        throw new Error("No instruction provided to task.js");
    }
    return instruction;
};

module.exports = { getTask };