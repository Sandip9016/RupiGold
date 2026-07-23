/**
 * KYC VERIFICATION SERVICE
 * ────────────────────────
 * Thin wrappers around 3 external verification APIs:
 *   - Surepass      → PAN verify
 *   - MastersIndia  → GST verify
 *   - Cashfree      → Bank account penny-drop verify
 *
 * IMPORTANT — READ BEFORE GOING LIVE:
 * Every function here is written to the *documented* request/response
 * shape of each provider's standard KYC product, but exact endpoint
 * paths, auth headers, and field names can differ by plan/version.
 * Before production use: log in to each provider's dashboard, open
 * their current API reference, and diff it against the fetch calls
 * below. Nothing here has been tested against a live account —
 * there are no sandbox credentials available in this environment.
 *
 * All functions return a consistent shape so callers never branch on
 * provider-specific errors:
 *   { verified: boolean, raw: object|null, error: string|null }
 *
 * All functions fail closed (verified: false) on any network/API error
 * — never treat a failed API call as a passed verification.
 */

const SUREPASS_BASE_URL =
  process.env.SUREPASS_BASE_URL || "https://kyc-api.surepass.io/api/v1";
const SUREPASS_API_TOKEN = process.env.SUREPASS_API_TOKEN;

const MASTERSINDIA_BASE_URL =
  process.env.MASTERSINDIA_BASE_URL || "https://commonapi.mastersindia.co";
const MASTERSINDIA_CLIENT_ID = process.env.MASTERSINDIA_CLIENT_ID;
const MASTERSINDIA_CLIENT_SECRET = process.env.MASTERSINDIA_CLIENT_SECRET;

const CASHFREE_BASE_URL =
  process.env.CASHFREE_BASE_URL || "https://payout-api.cashfree.com/payout/v1";
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

/**
 * PAN VERIFY — Surepass
 * Docs pattern: POST /pan/pan  { id_number }
 * Header: Authorization: Bearer <token>
 */
const verifyPanWithSurepass = async (panNumber) => {
  if (!SUREPASS_API_TOKEN) {
    return {
      verified: false,
      raw: null,
      error: "SUREPASS_API_TOKEN not configured in .env",
    };
  }

  try {
    const response = await fetch(`${SUREPASS_BASE_URL}/pan/pan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUREPASS_API_TOKEN}`,
      },
      body: JSON.stringify({ id_number: panNumber }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        verified: false,
        raw: data,
        error: data?.message || `Surepass responded ${response.status}`,
      };
    }

    // Surepass typically returns { success: true, data: { ...panDetails } }
    const isVerified = Boolean(data?.success && data?.data);

    return { verified: isVerified, raw: data, error: null };
  } catch (err) {
    return { verified: false, raw: null, error: err.message };
  }
};

/**
 * GST VERIFY — MastersIndia
 * Docs pattern: GET /commonapiv2/gstsearch/{gstin}
 * Header: client_id / client_secret
 */
const verifyGstWithMastersIndia = async (gstNumber) => {
  if (!MASTERSINDIA_CLIENT_ID || !MASTERSINDIA_CLIENT_SECRET) {
    return {
      verified: false,
      raw: null,
      error: "MastersIndia credentials not configured in .env",
    };
  }

  try {
    const response = await fetch(
      `${MASTERSINDIA_BASE_URL}/commonapiv2/gstsearch/${gstNumber}`,
      {
        method: "GET",
        headers: {
          client_id: MASTERSINDIA_CLIENT_ID,
          client_secret: MASTERSINDIA_CLIENT_SECRET,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        verified: false,
        raw: data,
        error: data?.message || `MastersIndia responded ${response.status}`,
      };
    }

    const isVerified = Boolean(
      data?.data?.gstin && data?.data?.sts?.toLowerCase() === "active",
    );

    return { verified: isVerified, raw: data, error: null };
  } catch (err) {
    return { verified: false, raw: null, error: err.message };
  }
};

/**
 * BANK ACCOUNT PENNY-DROP VERIFY — Cashfree Payouts
 * Docs pattern: POST /validation/bankDetails
 * Header: X-Client-Id / X-Client-Secret
 */
const verifyBankAccountWithCashfree = async ({
  bankAccountNumber,
  ifsc,
  accountHolderName,
}) => {
  if (!CASHFREE_CLIENT_ID || !CASHFREE_CLIENT_SECRET) {
    return {
      verified: false,
      raw: null,
      error: "Cashfree credentials not configured in .env",
    };
  }

  try {
    const response = await fetch(
      `${CASHFREE_BASE_URL}/validation/bankDetails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": CASHFREE_CLIENT_ID,
          "X-Client-Secret": CASHFREE_CLIENT_SECRET,
        },
        body: JSON.stringify({
          bankAccount: bankAccountNumber,
          ifsc,
          name: accountHolderName,
          phone: "",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        verified: false,
        raw: data,
        error: data?.message || `Cashfree responded ${response.status}`,
      };
    }

    // Cashfree returns nameAtBank + a match status; treat only an
    // explicit success status as verified.
    const isVerified = Boolean(
      data?.status === "SUCCESS" && data?.accountStatus === "VALID",
    );

    return { verified: isVerified, raw: data, error: null };
  } catch (err) {
    return { verified: false, raw: null, error: err.message };
  }
};

module.exports = {
  verifyPanWithSurepass,
  verifyGstWithMastersIndia,
  verifyBankAccountWithCashfree,
};
