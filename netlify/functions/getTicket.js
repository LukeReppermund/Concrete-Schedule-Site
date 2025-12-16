const { getStore, connectLambda } = require("@netlify/blobs");

function mimeFromKey(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg"; // default
}

exports.handler = async (event) => {
  // (Not strictly required for GET images, but safe)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    connectLambda(event);

    const ticketKey = event.queryStringParameters?.key;
    if (!ticketKey) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Missing ?key=ticket:..." }),
      };
    }

    const ticketStore = getStore("tickets");

    // Get raw bytes back
    const bytes = await ticketStore.get(ticketKey, { type: "arrayBuffer" });
    if (!bytes) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Ticket not found" }),
      };
    }

    const buf = Buffer.from(bytes);
    const mimeType = mimeFromKey(ticketKey);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
      body: buf.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message, stack: err.stack }),
    };
  }
};
