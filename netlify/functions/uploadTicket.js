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
    const { date, placementId, base64, mimeType } = body;

    if (!date || !placementId || !base64 || !mimeType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            "Expected JSON: { date:'YYYY-MM-DD', placementId:'...', base64:'...', mimeType:'image/jpeg' }",
        }),
      };
    }

    // Convert base64 -> bytes
    const bytes = Buffer.from(base64, "base64");

    // Basic extension from MIME
    const ext =
      mimeType === "image/png"
        ? "png"
        : mimeType === "image/heic"
        ? "heic"
        : "jpg";

    // Unique key for this photo
    const ticketKey = `ticket:${date}:${placementId}:${Date.now()}.${ext}`;

    // Store the binary in a blob store
    const ticketStore = getStore("tickets");
    await ticketStore.set(ticketKey, bytes);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        ticketKey,
        mimeType,
        sizeBytes: bytes.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: err.message, stack: err.stack }),
    };
  }
};
