import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class Responses {
  constructor(private res: Response) {}

  async responseSuccess(
    res_code: string,
    data: any,
    res_des: string,
    code?: number,
  ) {
    this.res.status(code || 200).json({
      status: 'success',
      response_code: `${res_code}`,
      message: `${res_des}`,
      data,
    });
  }
}
