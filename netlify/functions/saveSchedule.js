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
    const date = body.date;
    const placements = body.placements;

    if (!date || !Array.isArray(placements)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Expected JSON: { date: 'YYYY-MM-DD', placements: [...] }",
        }),
      };
    }

    // Ensure each placement has an id (important for tracking actuals later)
    const normalized = placements.map((p, idx) => ({
      id: p.id || `${date}-${idx + 1}`,
      time: p.time || "",
      jobNumber: p.jobNumber || "",
      description: p.description || "",
      orderQuantityCY:
        p.orderQuantityCY === "" || p.orderQuantityCY == null
          ? null
          : Number(p.orderQuantityCY),
      pourDate: date,
      // These fields are updated by the app later:
      actualQuantityCY: null,
      notes: "",
      ticketImages: [],
      isExtra: false,
    }));

    const scheduleStore = getStore("schedules");
    await scheduleStore.set(`schedule:${date}`, normalized, { type: "json" });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, date, count: normalized.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
