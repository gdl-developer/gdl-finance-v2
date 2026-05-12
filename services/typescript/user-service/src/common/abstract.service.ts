import { Injectable } from '@nestjs/common';
import { Between, Repository } from 'typeorm';
import { paginatedResult } from './paginated-result.interface';

@Injectable()
export abstract class AbstractService {
  constructor(protected readonly repository: Repository<any>) {}

  async create(data: any): Promise<any> {
    return await this.repository.save(data);
  }

  async findAll(): Promise<any[]> {
    return await this.repository.find({
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async findAllOld(): Promise<any[]> {
    return await this.repository.find({
      order: {
        updated_at: 'DESC',
      },
    });
  }

  async findAllWithSearch(condition: any): Promise<any[]> {
    return await this.repository.find(condition);
  }

  async paginateOld(page = 1, per_page: number): Promise<paginatedResult> {
    const take = per_page || 15;

    const [data, total] = await this.repository.findAndCount({
      take,
      skip: (page - 1) * take,
      order: {
        created_at: 'DESC',
      },
    });

    return {
      data: data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async paginate(
    page = 1,
    per_page: number,
    query?: any,
    relations?: any,
    // orderBy?: any,
  ): Promise<paginatedResult> {
    const take = per_page || 15;

    console.log('query', query);

    const { startDate, endDate, ...other_query } = query;

    const { start_date, end_date } = await this.getDateRange(
      startDate,
      endDate,
    );

    const [data, total] = await this.repository.findAndCount({
      order: {
        created_at: 'DESC',
      },
      // where: query ? query : null,
      where: {
        ...other_query,
        created_at: Between(start_date, end_date),
      },
      relations: relations ? relations : null,
      take,
      skip: (page - 1) * take,
    });

    return {
      data: data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async paginateWithCreatedAt(
    page = 1,
    per_page: number,
    query?: any,
    relations?: any,
    // orderBy?: any,
  ): Promise<paginatedResult> {
    const take = per_page || 200;

    console.log('query', query);

    const { startDate, endDate, ...other_query } = query;

    const { start_date, end_date } = await this.getDateRange(
      startDate,
      endDate,
    );

    const [data, total] = await this.repository.findAndCount({
      order: {
        createdAt: 'DESC',
      },
      // where: query ? query : null,
      where: {
        ...other_query,
        createdAt: Between(start_date, end_date),
      },
      relations: relations ? relations : null,
      take,
      skip: (page - 1) * take,
    });

    return {
      data: data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async paginateWithCondition(
    page = 1,
    per_page: number,
    condition: any,
    relations?: Array<string>,
  ): Promise<paginatedResult> {
    const take = per_page || 15;

    const [data, total] = await this.repository.findAndCount({
      where: condition,
      take,
      order: {
        created_at: 'DESC',
      },
      skip: (page - 1) * take,
      relations: relations,
    });

    return {
      data: data,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / take),
      },
    };
  }

  async findOne(condition: any, relations?: string[]): Promise<any> {
    let data: any;

    if (relations) {
      data = await this.repository.findOne(condition, {
        relations: [`${relations}`],
      });
    } else {
      data = await this.repository.findOne(condition);
    }
    return data;
  }

  async update(id: number, data: any): Promise<any> {
    await this.repository.update(id, data);
    return await this.findOne(id);
  }

  async remove(id: number) {
    return await this.repository.delete(id);
  }

  async findAllV2(relations?: Array<string>, query?: any): Promise<any[]> {
    let data: any;

    if (relations) {
      data = await this.repository.find({
        where: query,
        order: { createdAt: 'DESC' },
        relations: relations,
      });
    } else {
      data = await this.repository.find({ order: { createdAt: 'DESC' } });
    }
    return data;
  }

  async getDateRange(startDate: any, endDate: any) {
    let start_date: string;
    let end_date: string;

    const default_start = await this.getStartDate();
    startDate
      ? (start_date = new Date(startDate).toISOString())
      : (start_date = default_start);

    const default_end = await this.defaultEndDate();
    endDate
      ? (end_date = new Date(endDate).toISOString())
      : (end_date = default_end);

    return { start_date, end_date };
  }

  async getStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const start_date = date.toISOString();

    return start_date;
  }

  async defaultEndDate() {
    const date = new Date();
    const end_date = date.toISOString();

    return end_date;
  }
}
