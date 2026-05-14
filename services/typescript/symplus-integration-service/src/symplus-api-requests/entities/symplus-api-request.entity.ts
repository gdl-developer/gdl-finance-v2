import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class SymplusApiRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  api_url: string;

  @Column({ type: "varchar", nullable: true })
  request_ref: string;

  @Column({
    type: "text",
    nullable: true,
  })
  request_body: string;

  @Column({
    type: "text",
    nullable: true,
  })
  api_response: string;

  @Column({
    type: "text",
    nullable: true,
  })
  verify_response: string;

  @Column({
    type: "text",
    nullable: true,
  })
  webhook_response: string;

  @Column({ nullable: true })
  call_type: CallTypes;

  @Column({ nullable: true })
  call_category: SymplusAPICallCategories;

  @Column()
  response_type: APIResponseTypes;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt: Date;
}

export enum APIResponseTypes {
  Normal_API_Response = "Normal API Response",
  Webhook_Response = "webhook_response",
  Verify_Response = "verify_response",
}

export enum SymplusAPICallCategories {
  CUSTOMER_MANAGEMENT = "CUSTOMER_MANAGEMENT",
  CUSTOMER_ACCOUNTS = "CUSTOMER_ACCOUNTS",
  STOCK_BROKING = "STOCK_BROKING",
  MUTUAL_FUNDS = "MUTUAL_FUNDS",
  GENERAL = "GENERAL",
}

export enum CallTypes {
  POST = "POST",
  GET = "GET",
  PATCH = "PATCH",
  PUT = "PUT",
  DELETE = "DELETE",
}
