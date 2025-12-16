const { getStore, connectLambda } = require("@netlify/blobs");

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  try {
    // Netlify Blobs needs this when running in functions
    connectLambda(event);

    const date = event.queryStringParameters?.date;
    if (!date) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: "Missing ?date=YYYY-MM-DD" }),
      };
    }

    const scheduleStore = getStore("schedules");
    const actualsStore = getStore("actuals");

    const placements =
      (await scheduleStore.get(`schedule:${date}`, { type: "json" })) || [];

    // This will be used once we add the app -> website live updates
    const actuals =
      (await actualsStore.get(`actuals:${date}`, { type: "json" })) || {};

    // Merge “actuals” into placements
    const merged = placements.map((p) => {
      const a = actuals[p.id];
      return a ? { ...p, ...a } : p;
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, date, placements: merged }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
