const { getStore, connectLambda } = require("@netlify/blobs");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // REQUIRED for Netlify Blobs
    connectLambda(event);

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Use POST",
        }),
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
          error:
            "Expected JSON body: { date: 'YYYY-MM-DD', placements: [...] }",
        }),
      };
    }

    // Normalize placements and ensure IDs exist
    const normalized = placements.map((p, index) => ({
      id: p.id || `${date}-${index + 1}`,
      pourDate: date,
      time: p.time || "",
      jobNumber: p.jobNumber || "",
      description: p.description || "",
      orderQuantityCY:
        p.orderQuantityCY === "" || p.orderQuantityCY == null
          ? null
          : Number(p.orderQuantityCY),
      actualQuantityCY: null,
      notes: "",
      ticketImages: [],
      isExtra: false,
    }));

    const scheduleStore = getStore("schedules");

    // IMPORTANT: store JSON as a STRING
    await scheduleStore.set(
      `schedule:${date}`,
      JSON.stringify(normalized)
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        date,
        count: normalized.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
