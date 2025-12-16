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
    const { date, placementId, actualQuantityCY, notes, ticketKeys } = body;

    if (!date || !placementId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            "Expected: { date:'YYYY-MM-DD', placementId:'...', actualQuantityCY, notes, ticketKeys:[] }",
        }),
      };
    }

    const actualsStore = getStore("actuals");
    const key = `actuals:${date}`;

    let actuals = await actualsStore.get(key, { type: "json" });
    if (!actuals || typeof actuals !== "object") actuals = {};

    const prev = actuals[placementId] || {};
    const prevTicketKeys = Array.isArray(prev.ticketKeys) ? prev.ticketKeys : [];

    // Merge tickets (keep any previously saved keys)
    const incomingTicketKeys = Array.isArray(ticketKeys) ? ticketKeys : [];
    const mergedTicketKeys = Array.from(
      new Set([...prevTicketKeys, ...incomingTicketKeys])
    );

    actuals[placementId] = {
      actualQuantityCY:
        actualQuantityCY === "" || actualQuantityCY == null
          ? null
          : Number(actualQuantityCY),
      notes: notes || "",
      ticketKeys: mergedTicketKeys,
      placedAt: new Date().toISOString(),
    };

    await actualsStore.set(key, JSON.stringify(actuals));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, date, placementId, ticketCount: mergedTicketKeys.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message, stack: err.stack }),
    };
  }
};
