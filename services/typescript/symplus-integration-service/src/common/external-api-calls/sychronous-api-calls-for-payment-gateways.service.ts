import axios from "axios";

export class SynchronousApiCalls {
  // -------------------------------------------------------
  // GET PUBLIC IP USING AXIOS (async & clean)
  // -------------------------------------------------------
  private async getPublicIp(): Promise<string> {
    try {
      const response = await axios.get("https://api.ipify.org?format=json", {
        timeout: 8000,
      });
      return response.data?.ip || "Unknown";
    } catch (error) {
      console.error("Error fetching public IP:", error);
      return "Unknown";
    }
  }

  // -------------------------------------------------------
  // POST CALL USING AXIOS ONLY
  // -------------------------------------------------------
  async postCall(data: any): Promise<any> {
    const outgoingIp = await this.getPublicIp();
    console.log("📡 Outgoing public IP address (POST):", outgoingIp);

    try {
      console.log("🚀 Starting POST call →", data.url);

      const response = await axios.post(
        data.url,
        data.body, // already stringified outside
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization-Key": data.authorization_key,
            "Client-Key": data.client_key,
          },
          timeout: 15000,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 300,
        }
      );

      console.log("✅ postCall response:", response.data);
      return response.data;
    } catch (err: any) {
      console.error("❌ POST request error:", {
        message: err.message,
        code: err.code,
        url: data.url,
        status: err.response?.status,
        body: err.response?.data,
      });

      return (
        err.response?.data || {
          error: true,
          message: err.message,
          code: err.code,
        }
      );
    }
  }

  // -------------------------------------------------------
  // GET CALL USING AXIOS ONLY
  // -------------------------------------------------------
  async getCall(data: any): Promise<any> {
    const outgoingIp = await this.getPublicIp();
    console.log("📡 Outgoing public IP address (GET):", outgoingIp);

    try {
      console.log("🚀 Starting GET call →", data.url);

      const response = await axios.get(data.url, {
        headers: {
          "Content-Type": "application/json",
          "Authorization-Key": data.authorization_key,
          "Client-Key": data.client_key,
        },
        timeout: 15000,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return response.data;
    } catch (err: any) {
      console.error("❌ GET request error:", {
        message: err.message,
        code: err.code,
        url: data.url,
        status: err.response?.status,
        body: err.response?.data,
      });

      // If server returned structured error → return it
      if (err.response?.data) return err.response.data;

      return {
        error: true,
        message: err.message,
        code: err.code,
      };
    }
  }
}
