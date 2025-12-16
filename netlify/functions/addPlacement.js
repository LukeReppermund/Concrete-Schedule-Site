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

    const body = JSON.parse(event.body || "{}");
    const { date, placement } = body;

    if (!date || !placement || typeof placement !== "object") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "Expected { date, placement }",
        }),
      };
    }

    const store = getStore("schedules");
    const key = `schedule:${date}`;

    const existing = (await store.get(key, { type: "json" })) || [];
    const list = Array.isArray(existing) ? existing : [];

    // Ensure placement has an id that won't collide
    const id =
      placement.id && String(placement.id).trim()
        ? String(placement.id).trim()
        : `extra-${Date.now()}`;

    const clean = {
      id,
      pourDate: date,
      time: placement.time || "Extra / unscheduled",
      jobNumber: placement.jobNumber || "",
      description: placement.description || "",
      orderQuantityCY:
        placement.orderQuantityCY === null || placement.orderQuantityCY === undefined
          ? null
          : Number(placement.orderQuantityCY),
      actualQuantityCY:
        placement.actualQuantityCY === null || placement.actualQuantityCY === undefined
          ? null
          : Number(placement.actualQuantityCY),
      notes: placement.notes || "",
      isExtra: true,
      ticketKeys: Array.isArray(placement.ticketKeys) ? placement.ticketKeys : [],
    };

    if (!clean.description.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: "Description is required" }),
      };
    }

    // Put extras at the TOP of the list so they’re easy to find
    const updated = [clean, ...list];

    await store.set(key, JSON.stringify(updated));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        date,
        addedId: clean.id,
        count: updated.length,
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
