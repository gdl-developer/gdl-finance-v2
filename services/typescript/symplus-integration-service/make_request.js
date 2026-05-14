const CryptoJS = require("crypto-js");
const http = require("http");

// Configuration
const CONFIG = {
  PORT: 3011, // Default from main.ts
  // In a real app, load these from process.env
  EKY: "434rfdvffv&@&",
  SYS_AUTH: "GTT^$ED843yuygde6473T^$^W&(())43UUU67*!!43",
};

// Encryption Helper (matches src/common/utils/crypto-hash-helper.ts)
const encrypt = (to_hash, EKY) => {
  return CryptoJS.AES.encrypt(to_hash, EKY).toString();
};

const makeRequest = () => {
  console.log("🔐 Generating Authentication Token...");
  // 1. Generate the encrypted token
  const token = encrypt(CONFIG.SYS_AUTH, CONFIG.EKY);
  console.log("✅ Token generated successfully");

  // 2. Prepare the payload (based on CreateCustomerDto)
  const payload = JSON.stringify({
    title_cd: "MR",
    last_name: "Doe",
    first_name: "John",
    gender_cd: "M",
    nationality_cd: "NG",
    mobile_phone_no: "08012345678",
    primary_email_address: "john.doe@example.com",
    address_street: "123 Lagos Street",
    address_city: "Lagos",
    address_country_cd: "NG",
    birth_date: "1990-01-01",
  });

  const options = {
    hostname: "localhost",
    port: CONFIG.PORT,
    path: "/customer/new/individual/account",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": payload.length,
      // 3. Add the required bearerauth header
      bearerauth: token,
    },
  };

  console.log(
    `\n🚀 Sending POST request to http://localhost:${CONFIG.PORT}${options.path}...`
  );

  const req = http.request(options, (res) => {
    console.log(`\n📥 Response Status: ${res.statusCode} ${res.statusMessage}`);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        if (data) {
          const jsonResponse = JSON.parse(data);
          console.log(
            "📄 Response Body:",
            JSON.stringify(jsonResponse, null, 2)
          );
        } else {
          console.log("📄 Response Body is empty");
        }
      } catch (e) {
        console.log("📄 Response Body (Raw):", data);
      }
    });
  });

  req.on("error", (error) => {
    console.error("❌ Request failed:", error.message);
    console.log("💡 Ensure the server is running on port", CONFIG.PORT);
  });

  req.write(payload);
  req.end();
};

makeRequest();
