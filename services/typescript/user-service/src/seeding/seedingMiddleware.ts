import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { init_kyc_levels } from 'src/kyc-levels/entities/init-kyc-levels-data';
import { KycLevel } from 'src/kyc-levels/entities/kyc-level.entity';
import { EntityManager } from 'typeorm';
import { Seeding } from './entities/seeding.entity';

@Injectable()
export class SeedingMiddleware implements NestMiddleware {
  // to avoid roundtrips to db we store the info about whether
  // the seeding has been completed as boolean flag in the middleware
  // we use a promise to avoid concurrency cases. Concurrency cases may
  // occur if other requests also trigger a seeding while it has already
  // been started by the first request. The promise can be used by other
  // requests to wait for the seeding to finish.
  private isSeedingComplete: Promise<boolean>;

  constructor(private readonly entityManager: EntityManager) {}

  async use(req: Request, res: Response, next: any) {
    if (await this.isSeedingComplete) {
      // seeding has already taken place,
      // we can short-circuit to the next middleware
      return next();
    }

    this.isSeedingComplete = (async () => {
      // for example you start with an initial seeding entry called 'initial-seeding'
      // on 2019-06-27. if 'initial-seeding' already exists in db, then this
      // part is skipped
      if (
        !(await this.entityManager.findOne(Seeding, {
          id: 'init-kyc-levels',
        }))
      ) {
        await this.entityManager.transaction(
          async (transactionalEntityManager) => {
            for (let i = 0; i < init_kyc_levels.length; i++) {
              await transactionalEntityManager.save(
                KycLevel,
                init_kyc_levels[i],
              );
            }
            await transactionalEntityManager.save(
              new Seeding('init-kyc-levels'),
            );
          },
        );
      }

      // now a month later on 2019-07-25 you add another seeding
      // entry called 'another-seeding-round' since you want to initialize
      // entities that you just created a month later
      // since 'initial-seeding' already exists it is skipped but 'another-seeding-round'
      // will be executed now.
      // if (
      //   !(await this.entityManager.findOne(Seeding, {
      //     id: 'another-seeding-round',
      //   }))
      // ) {
      //   await this.entityManager.transaction(
      //     async (transactionalEntityManager) => {
      //       await transactionalEntityManager.save(
      //         MyNewEntity,
      //         initalSeedingForNewEntity,
      //       );
      //       // persist in db that 'another-seeding-round' is complete
      //       await transactionalEntityManager.save(
      //         new Seeding('another-seeding-round'),
      //       );
      //     },
      //   );
      // }

      return true;
    })();

    await this.isSeedingComplete;
    next();
  }
}
