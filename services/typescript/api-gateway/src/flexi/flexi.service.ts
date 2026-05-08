import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FlexiService {
  private readonly baseUrl =
    process.env.FLEXI_SERVICE_URL || 'http://localhost:3001/api/v2/flexi';

  async proxyRequest(method: string, path: string, data?: any, headers?: any) {
    const response = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      data,
      headers: {
        ...headers,
        host: undefined, // Let axios set the correct host
      },
    });
    return response.data;
  }
}
