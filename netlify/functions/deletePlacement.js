const { getStore, connectLambda } = require("@netlify/blobs");

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    connectLambda(event);

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ ok: false, error: "Use POST" }),
      };
    }

    const { date, placementId } = JSON.parse(event.body || "{}");

    if (!date || !placementId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Expected { date, placementId }",
        }),
      };
    }

    const store = getStore("schedules");
    const key = `schedule:${date}`;

    const placements = await store.get(key, { type: "json" });
    if (!Array.isArray(placements)) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: "Schedule not found" }),
      };
    }

    const updated = placements.filter((p) => p.id !== placementId);

    await store.set(key, JSON.stringify(updated));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        date,
        deletedId: placementId,
        remaining: updated.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
