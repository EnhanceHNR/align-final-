const { encode, decode } = require("next-auth/jwt");

async function test() {
    const secret = "test-secret";
    const token = await encode({ token: { organizationId: "org_123" }, secret });
    console.log("Encoded:", token);
    const decoded = await decode({ token, secret });
    console.log("Decoded:", decoded);
}
test();
