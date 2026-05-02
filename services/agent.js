const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const { GoogleGenerativeAI } = require("@google/generative-ai");

chromium.use(stealth);

class BlueBotAgent {
    constructor(task, apiKey) {
        this.task = task;
        this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async run() {
        console.log(`🤖 Agent Instance Running Task...`);
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
        const page = await context.newPage();

        try {
            // A. Planning: Identify URL and ID
            const plan = await this._aiJson(`Extract URL and ID from "${this.task}". JSON: {"url":"string", "id":"string"}`);
            
            console.log(`🔗 Navigating to ${plan.url}`);
            await page.goto(plan.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // B. Clear Overlays & Modals
            await page.evaluate(() => {
                const badOnes = ['#coiPage-1', '.coi-banner__wrapper', '.mc-cookie-banner', '.ivu-modal-mask', '.mask'];
                badOnes.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
                document.body.style.overflow = 'auto';
            });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(3000);

            // C. Observe: Deep Search for Input Fields (Includes Shadow DOM)
            const inputs = await page.evaluate(() => {
                const allInputs = [];
                // Query both standard DOM and Shadow DOM components
                const nodes = document.querySelectorAll('input, textarea, [role="textbox"], .mc-track-input');
                nodes.forEach((el, i) => {
                    if (el.offsetParent !== null) { // Only visible elements
                        allInputs.push(`[${i}] Placeholder: ${el.placeholder} | ID: ${el.id} | Name: ${el.name}`);
                    }
                });
                return allInputs;
            });

            if (inputs.length === 0) throw new Error("No visible input fields found on the page.");

            const { index } = await this._aiJson(`Which index for tracking number "${plan.id}"? Elements: ${JSON.stringify(inputs)}. JSON: {"index":0}`);
            
            if (index === -1) throw new Error("AI could not find a suitable tracking field.");

            // D. Interaction: JS Injection
            console.log(`⌨️ JS-Typing "${plan.id}" into field [${index}]...`);
            await page.evaluate(({ idx, val }) => {
                const el = document.querySelectorAll('input, textarea, [role="textbox"], .mc-track-input')[idx];
                if (el) {
                    el.focus();
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, { idx: index, val: plan.id });

            await page.keyboard.press('Enter');

            // E. Extraction
            console.log("⏳ Waiting for results...");
            await page.waitForTimeout(12000); 
            const content = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
            
            return await this._aiJson(`
                TASK: ${this.task}
                TEXT: ${content.substring(0, 10000)}
                Extract Vessel, Voyage, ETA, and Status. Return ONLY clean JSON.
            `);

        } catch (error) {
            console.error("❌ Agent Class Error:", error.message);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }

    async _aiJson(prompt) {
        const res = await this.model.generateContent(prompt);
        let text = res.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
            console.log("DEBUG: Raw AI Response was:", text);
            throw new Error(`AI failed to return JSON structure.`);
        }
        return JSON.parse(match[0]);
    }
}

module.exports = { BlueBotAgent };