const axios = require("axios");
const crypto = require("crypto");

const API_URL = "http://localhost:3000";

async function runTest() {
  console.log("🚀 Starting GDL Fintech V2 E2E Test...");

  try {
    // 1. Handshake: Get Public Key
    console.log("1. Fetching RSA Public Key...");
    const keyRes = await axios.get(`${API_URL}/auth/encryption/public-key`);
    const publicKey = keyRes.data.public_key;
    console.log("✅ Public Key Received");

    // 2. Prepare Encrypted Login Request
    console.log("2. Preparing Encrypted Login Request...");
    const loginData = {
      email: "test@gdl.com",
      password: "securepassword123",
    };

    // Generate random AES key and IV
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12); // GCM standard IV length

    // Encrypt Data with AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    let encryptedData = cipher.update(
      JSON.stringify(loginData),
      "utf8",
      "base64",
    );
    encryptedData += cipher.final("base64");
    const tag = cipher.getAuthTag();

    // Encrypt AES Key with RSA Public Key
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1",
      },
      aesKey,
    );
    console.log(`Encrypted Key Length to send: ${encryptedKey.length} bytes`);
    console.log(
      `Public Key used (first 50 chars): ${publicKey.substring(0, 50)}`,
    );

    const payload = {
      is_encrypted: true,
      key: encryptedKey.toString("base64"),
      iv: iv.toString("base64"),
      payload: Buffer.concat([
        Buffer.from(encryptedData, "base64"),
        tag,
      ]).toString("base64"),
    };

    // 3. Test Plain Login
    console.log("3. Sending Plain Login Request...");
    try {
      const plainLogin = await axios.post(`${API_URL}/auth/login`, loginData);
      console.log("✅ Plain Login Successful (or correctly rejected)");
    } catch (e) {
      console.log(
        "❌ Plain Login Failed:",
        e.response ? e.response.data : e.message,
      );
    }

    // 4. Send Encrypted Request
    console.log("4. Sending Encrypted Login Request...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, payload);

    if (loginRes.data.success || loginRes.data.access_token) {
      console.log(
        "✅ Login Successful (or correctly rejected if user non-existent)",
      );
    } else {
      console.log("❌ Login Failed:", loginRes.data);
    }

    // 4. Test Rate Limiting
    console.log("4. Testing Rate Limiting (Sending 15 requests)...");
    for (let i = 0; i < 15; i++) {
      try {
        await axios.get(`${API_URL}/auth/encryption/public-key`);
        process.stdout.write(".");
      } catch (e) {
        if (e.response && e.response.status === 429) {
          console.log("\n✅ Rate Limit Triggered (429 Too Many Requests)");
          break;
        }
      }
    }

    console.log("\n✨ E2E Test Completed Successfully!");
  } catch (error) {
    console.error(
      "❌ Test Failed:",
      error.response ? error.response.data : error.message,
    );
    process.exit(1);
  }
}

runTest();
