const { chromium } = require("playwright-extra");
// Stealth plugin disguises Playwright as a real browser to bypass bot-detection
// systems (Cloudflare, DataDome, etc.) that ship tracking sites like Maersk
const stealth = require("puppeteer-extra-plugin-stealth")();
const { GoogleGenerativeAI } = require("@google/generative-ai");

chromium.use(stealth);

class BlueBotAgent {
    constructor(task, apiKey) {
        this.task = task;
        // gemini-2.5-flash is chosen for speed and low cost; adequate for
        // short structured prompts like URL extraction and field selection
        this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async run() {
        console.log(`🤖 Agent Instance Running Task...`);
        // headless: false keeps the real browser UI visible, which helps pass
        // bot-detection checks that fingerprint headless Chrome behaviour
        const browser = await chromium.launch({ headless: false });
        // 1366x768 mimics a common laptop viewport; some sites render
        // differently (or hide elements) on non-standard screen sizes
        const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
        const page = await context.newPage();

        try {
            // A. Planning — ask the AI to parse the natural-language task into
            //    a structured { url, id } so the rest of the run uses typed data
            const plan = await this._aiJson(`Extract URL and ID from "${this.task}". JSON: {"url":"string", "id":"string"}`);

            console.log(`🔗 Navigating to ${plan.url}`);
            // domcontentloaded fires earlier than 'load'; sufficient here because
            // we wait for overlays/results explicitly with timeouts below
            await page.goto(plan.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // B. Clear Overlays & Modals — cookie banners and modal masks block
            //    click/type events; removing them by known selectors is faster
            //    and more reliable than waiting for "accept" buttons to appear
            await page.evaluate(() => {
                const badOnes = ['#coiPage-1', '.coi-banner__wrapper', '.mc-cookie-banner', '.ivu-modal-mask', '.mask'];
                badOnes.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));
                // Restore scroll in case a modal locked the page body
                document.body.style.overflow = 'auto';
            });
            // Escape dismisses any remaining focus traps (e.g. video overlays)
            await page.keyboard.press('Escape');
            await page.waitForTimeout(3000);

            // C. Observe — collect visible input fields so the AI can pick the
            //    correct tracking field by reading placeholder/id/name context.
            //    .mc-track-input is a custom Web Component used by Maersk that
            //    sits inside Shadow DOM and is not reachable via standard selectors
            const inputs = await page.evaluate(() => {
                const allInputs = [];
                const nodes = document.querySelectorAll('input, textarea, [role="textbox"], .mc-track-input');
                nodes.forEach((el, i) => {
                    // offsetParent === null means the element is hidden (display:none
                    // or visibility:hidden); skip it so the AI isn't confused by
                    // invisible fields that can't be typed into
                    if (el.offsetParent !== null) {
                        allInputs.push(`[${i}] Placeholder: ${el.placeholder} | ID: ${el.id} | Name: ${el.name}`);
                    }
                });
                return allInputs;
            });

            if (inputs.length === 0) throw new Error("No visible input fields found on the page.");

            const { index } = await this._aiJson(`Which index for tracking number "${plan.id}"? Elements: ${JSON.stringify(inputs)}. JSON: {"index":0}`);

            if (index === -1) throw new Error("AI could not find a suitable tracking field.");

            // D. Interaction — use JS injection instead of page.type() because
            //    React/Vue inputs ignore native keyboard events unless the synthetic
            //    'input' and 'change' events are dispatched to trigger state updates
            console.log(`⌨️ JS-Typing "${plan.id}" into field [${index}]...`);
            await page.evaluate(({ idx, val }) => {
                const el = document.querySelectorAll('input, textarea, [role="textbox"], .mc-track-input')[idx];
                if (el) {
                    el.focus();
                    el.value = val;
                    // bubbles: true propagates the event up the component tree
                    // so parent components (e.g. a search wrapper) also react
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, { idx: index, val: plan.id });

            await page.keyboard.press('Enter');

            // E. Extraction — 12 s covers typical carrier site response times;
            //    then grab the full page text and let the AI extract structured fields
            console.log("⏳ Waiting for results...");
            await page.waitForTimeout(12000);
            const content = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);

            // Truncate to 10 000 chars to stay within Gemini's context limits
            // while still capturing all meaningful tracking result content
            return await this._aiJson(`
                TASK: ${this.task}
                TEXT: ${content.substring(0, 10000)}
                Extract Vessel, Voyage, ETA, and Status. Return ONLY clean JSON.
            `);

        } catch (error) {
            console.error("❌ Agent Class Error:", error.message);
            throw error;
        } finally {
            // Always close the browser — avoids lingering Chrome processes
            // even when the try block throws
            if (browser) await browser.close();
        }
    }

    async _aiJson(prompt) {
        const res = await this.model.generateContent(prompt);
        let text = res.response.text();
        // Strip markdown fences or prose the model sometimes wraps around JSON;
        // the regex greedily captures the outermost { ... } block
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
            console.log("DEBUG: Raw AI Response was:", text);
            throw new Error(`AI failed to return JSON structure.`);
        }
        return JSON.parse(match[0]);
    }
}

module.exports = { BlueBotAgent };