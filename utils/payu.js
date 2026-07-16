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
 *
 * Standard sequence:
 * sha512(salt|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 * When PayU applies a convenience fee, it adds an "additionalCharges" field
 * to the response AND changes the hash formula to prepend it:
 * sha512(additionalCharges|salt|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key)
 * Confirmed against a real PayU sandbox response — this case must be
 * checked first whenever additionalCharges is present, or the hash
 * will always mismatch on convenience-fee transactions.
 */
const verifyReverseHash = (payload) => {
  const {
    status,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    additionalCharges,
    hash: receivedHash,
  } = payload;

  const udfBlock = ["", "", "", "", "", "", "", "", "", ""]; // udf10-udf1

  const fields = additionalCharges
    ? [
        additionalCharges,
        PAYU_SALT,
        status,
        ...udfBlock,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        PAYU_KEY,
      ]
    : [
        PAYU_SALT,
        status,
        ...udfBlock,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        PAYU_KEY,
      ];

  const expectedHash = crypto
    .createHash("sha512")
    .update(fields.join("|"))
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
