const axios = require("axios");

const BASE = "https://anabot.my.id/api";
const APIKEY = process.env.ANABOT_KEY || "freeApikey";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls anabot.my.id with retries.
 * Retries up to `attempts` times if:
 *   - request errors out (timeout / network)
 *   - upstream returns 5xx
 *   - upstream returns 200 but body says success:false (often a flaky transient)
 * Returns the final response body (success or last failure).
 */
async function anabotGet(endpoint, params = {}, { attempts = 3, timeout = 45000 } = {}) {
  const url = `${BASE}${endpoint}`;
  let lastErr = null;
  let lastBody = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await axios.get(url, {
        params: { ...params, apikey: APIKEY },
        timeout,
        validateStatus: () => true,
      });

      lastBody = res.data;

      const isSuccessful =
        res.status >= 200 &&
        res.status < 300 &&
        res.data &&
        res.data.success === true;

      if (isSuccessful) return res.data;

      // Retry only when transient: 5xx OR JSON success:false
      const transient =
        (res.status >= 500 && res.status < 600) ||
        (res.data && res.data.success === false);

      if (!transient) return res.data;

      // small backoff between retries
      if (i < attempts - 1) await sleep(900 * (i + 1));
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(900 * (i + 1));
    }
  }

  if (lastBody) return lastBody;

  throw new Error(
    lastErr?.code === "ECONNABORTED"
      ? "Upstream API timeout — phir try karein."
      : lastErr?.message || "Upstream API request failed"
  );
}

/** Pulls the most informative error string out of an anabot failure body. */
function extractError(body, fallback = "Upstream API error") {
  if (!body) return fallback;
  return (
    body.error ||
    body.message ||
    body.data?.error ||
    body.data?.message ||
    fallback
  );
}

module.exports = { anabotGet, extractError, BASE, APIKEY };
