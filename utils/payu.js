const crypto = require("crypto");

/**
 * PAYU CONFIG
 * Test-mode defaults are PayU's publicly documented UAT sandbox
 * credentials (safe to commit — they only work against test.payu.in
 * and move no real money). Override via env for a live/production
 * merchant account.
 */
const PAYU_MODE = (process.env.PAYU_MODE || "TEST").toUpperCase(); // "TEST" | "LIVE"
const PAYU_KEY = process.env.PAYU_KEY || "gtKFFx";
const PAYU_SALT = process.env.PAYU_SALT || "eCwWELxi";
const PAYU_BASE_URL =
  PAYU_MODE === "LIVE"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";

/**
 * GENERATE PAYMENT HASH
 * PayU sequence (10 udf slots, we leave them empty):
 * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt)
 */
const generateHash = ({ txnid, amount, productinfo, firstname, email }) => {
  const hashString = [
    PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "", // udf1-udf10 (10 fields)
    PAYU_SALT,
  ].join("|");

  return crypto.createHash("sha512").update(hashString).digest("hex");
};

/**
 * VERIFY REVERSE HASH (from PayU's success/failure callback)
 * PayU sequence (reversed, status inserted after salt):
 * sha512(salt|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 * IMPORTANT: this has NOT been exercised against a live PayU sandbox
 * transaction in this environment (no network access to test.payu.in
 * here). It follows PayU's documented formula exactly, but run a real
 * test-mode transaction end-to-end before trusting this in production.
 */
const verifyReverseHash = (payload) => {
  const {
    status,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    hash: receivedHash,
  } = payload;

  const hashString = [
    PAYU_SALT,
    status,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "", // udf10-udf1 (10 fields)
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    PAYU_KEY,
  ].join("|");

  const expectedHash = crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");

  return expectedHash === receivedHash;
};

module.exports = {
  PAYU_MODE,
  PAYU_KEY,
  PAYU_BASE_URL,
  generateHash,
  verifyReverseHash,
};
