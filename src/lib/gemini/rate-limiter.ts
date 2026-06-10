let lastRun = 0;

export async function throttleGemini(minIntervalMs = 4500) {
  const now = Date.now();
  const waitMs = Math.max(0, lastRun + minIntervalMs - now);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRun = Date.now();
}

