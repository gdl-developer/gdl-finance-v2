import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const SYMPLUS_CLIENT_KEY = process.env.SYMPLUS_CLIENT_KEY;

async function getKey() {
  try {
    const url = `https://clientportal.gdl.com.ng/ords/api/core/v3/GetKey/${SYMPLUS_CLIENT_KEY}`;
    console.log(`Fetching key from: ${url}`);
    const response = await axios.get(url);
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("Error fetching key:", error.message);
    if (error.response) {
      console.error("Error data:", error.response.data);
    }
  }
}

getKey();
