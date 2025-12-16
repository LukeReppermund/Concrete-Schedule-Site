exports.handler = async (event) => {
  try {
    const date = event.queryStringParameters?.date || null;

    // For now we return an empty list. Next step we will store schedules and return real rows.
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        ok: true,
        date,
        placements: [],
        message: "getSchedule is working (no saved schedules yet).",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
