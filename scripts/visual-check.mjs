import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const debuggingPort = 9300 + (process.pid % 200);
const profilePath = `/private/tmp/bashiiin-chrome-profile-${process.pid}`;
const baseUrl = (process.env.PREVIEW_URL ?? "http://localhost:3000").replace(/\/$/, "");
const initialPath = new URL(baseUrl).pathname;

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profilePath}`,
    "--window-size=1440,1000",
    `${baseUrl}/`,
  ],
  { stdio: "ignore" },
);

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getDebugTarget() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
      const targets = await response.json();
      const page =
        targets.find((target) => target.type === "page" && target.url.startsWith(baseUrl)) ??
        targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Chrome is still starting.
    }
    await pause(100);
  }
  throw new Error("Chrome DevTools target was not available.");
}

async function run() {
  const target = await getDebugTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let commandId = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    commandId += 1;
    const id = commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }

  async function evaluate(expression) {
    return send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  }

  async function waitForPath(pathname) {
    const normalize = (path) => (path.length > 1 ? path.replace(/\/$/, "") : path);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await evaluate("location.pathname");
      if (normalize(result.result?.value ?? "") === normalize(pathname)) return;
      await pause(100);
    }
    throw new Error(`Navigation to ${pathname} timed out.`);
  }

  async function capture(path, width, height, mobile = false) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    });
    await pause(250);
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    await writeFile(path, Buffer.from(screenshot.data, "base64"));
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await waitForPath(initialPath);
  await pause(400);
  await capture("/private/tmp/bashiiin-desktop.png", 1440, 1000);

  await evaluate("document.getElementById('culture').scrollIntoView() ");
  await pause(250);
  await capture("/private/tmp/bashiiin-culture.png", 1440, 1000);

  await evaluate("scrollTo(0, 0)");
  await capture("/private/tmp/bashiiin-mobile.png", 390, 844, true);

  socket.close();
  console.log("Captured public-page visual checks in /private/tmp/bashiiin-*.png");
}

try {
  await run();
} finally {
  chrome.kill("SIGTERM");
}
