const { getStore, connectLambda } = require("@netlify/blobs");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  try {
    connectLambda(event);

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Use POST" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { date, placementId, actualQuantityCY, notes } = body;

    if (!date || !placementId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Expected: { date:'YYYY-MM-DD', placementId:'...', actualQuantityCY, notes }",
        }),
      };
    }

    // Load existing actuals map for the date
    const actualsStore = getStore("actuals");
    const key = `actuals:${date}`;

    let actuals = await actualsStore.get(key, { type: "json" });
    if (!actuals || typeof actuals !== "object") actuals = {};

    // Save/overwrite the update for this placement
    actuals[placementId] = {
      actualQuantityCY:
        actualQuantityCY === "" || actualQuantityCY == null
          ? null
          : Number(actualQuantityCY),
      notes: notes || "",
      placedAt: new Date().toISOString(),
    };

    // IMPORTANT: store JSON as a string (same pattern as saveSchedule)
    await actualsStore.set(key, JSON.stringify(actuals));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, date, placementId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message, stack: err.stack }),
    };
  }
};
