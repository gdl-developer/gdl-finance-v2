import { Exclude } from 'class-transformer';
import { UserType } from 'src/admin/admin/entities/admin.entity';
import { KycLevel } from 'src/kyc-levels/entities/kyc-level.entity';
import { OwnerDocsVerificationStatus } from 'src/user/owner-docs/entities/owner-doc.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class UserAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  last_name: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  other_names: string;

  @Exclude()
  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string;

  // Two-Factor Authentication (2FA)
  @Column({ default: false })
  is_2fa_enabled: boolean;

  @Column({ type: 'varchar', length: 20, default: '', nullable: true })
  alternate_phone_no: string;

  @Column({ nullable: true })
  user_txn_ref: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  alternate_email_address: string;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ nullable: true })
  how_you_heard_about_us: HowYouHeardAboutUs;

  @Column({ nullable: true })
  how_you_heard_about_us_specified: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 10, default: '', nullable: true })
  zip_code: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country_code: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 60, default: '', nullable: true })
  occupation: string;

  @Column({ type: 'varchar', length: 20, default: 'INACTIVE' }) // set to active after step two
  account_status: UserAccountStatus;

  @Column({ nullable: true })
  user_avatar_url: string;

  @Column()
  device_hash: string; // sent by front

  @Column({ nullable: true })
  marital_status: MaritalStatuses;

  @ManyToOne(() => KycLevel)
  @JoinColumn({ name: 'kyc_level_id' })
  kyc_level: KycLevel;

  @Column({ nullable: true })
  gender: GenderTypes;

  @Column({ nullable: true })
  referral_code: string;

  @Column({ nullable: true })
  referred_by: string;

  @Column({ nullable: true })
  registration_channel: RegistrationChannels;

  @Column({ nullable: true })
  date_of_birth: Date;

  @Column({ type: 'varchar', default: '', nullable: true })
  place_of_birth: string;

  @Exclude()
  @Column({ type: 'varchar', length: 15, default: '', nullable: true })
  nin: string;

  @Exclude()
  @Column({ nullable: true })
  user_token: string;

  @Exclude()
  @Column({ nullable: true })
  temp_login_pin: string; // hashed just like password and unhashed when used

  @Exclude()
  @Column({ nullable: true })
  txn_pin: string; // hashed just like password and unhashed when used

  @Column({ nullable: true })
  top_interested_product: string;

  @Column({ nullable: true })
  other_interested_products: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  next_of_kin_name: string;

  @Column({ type: 'varchar', length: 30, default: '', nullable: true })
  next_of_kin_email: string;

  @Column({ type: 'varchar', length: 20, default: '', nullable: true })
  next_of_kin_phone_no: string;

  @Column({ type: 'varchar', length: 20, default: '', nullable: true })
  user_referree_name: string;

  @Column({ type: 'varchar', length: 20, default: '', nullable: true })
  user_referree_phone_number: string;

  @Column({ type: 'varchar', length: 20, default: '', nullable: true })
  mother_maiden_name: string;

  @Column({ nullable: true })
  wedding_anniversary_date: Date;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  data_joined: Date;

  @Column({ nullable: true })
  last_login: Date;

  @Column({ default: 'USER' })
  user_type: UserType;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updated_at: Date;

  @Column({ nullable: true })
  has_identity_documents: boolean;

  @Column({ nullable: true })
  has_adress_documents: boolean;

  @Column({ nullable: true })
  has_txn_pin: boolean;

  @Column({ nullable: true })
  has_temp_login_pin: boolean;

  @Column({ default: 'NOT_VERIFIED', length: 15 })
  documents_verified: OwnerDocsVerificationStatus;

  @Exclude()
  @Column({ nullable: true })
  refresh_token: string;

  // --- NDPR/GDPR Compliance ---
  @Column({ default: false })
  terms_accepted: boolean;

  @Column({ default: false })
  privacy_policy_accepted: boolean;

  @Column({ default: false })
  marketing_consent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  consent_timestamp: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  policy_version: string;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}

export enum UserAccountStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
  BANNED = 'BANNED',
  BLOCKED = 'BLOCKED',
}

export enum GenderTypes {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum MaritalStatuses {
  MARRIED = 'MARRIED',
  SINGLE = 'SINGLE',
  OTHER = 'OTHER',
}

export enum RegistrationChannels {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
}

export enum HowYouHeardAboutUs {
  DSA = 'DSA',
  Search_Engine = 'Search Engine',
  Google_Ads = 'Google_Ads',
  Facebook_Ads = 'Facebook Ads',
  Youtube_Ads = 'Youtube Ads',
  Other_paid_social_media_advertising = 'Other paid social media advertising',
  Facebook_post_or_group = 'Facebook post or group',
  Twitter_post = 'Twitter post',
  Instagram_post_or_story = 'Instagram post or story',
  LinkedIn = 'LinkedIn',
  Other_social_media = 'Other social media',
  Email = 'Email',
  Radio = 'Radio',
  TV = 'TV',
  Newspaper = 'Newspaper',
  Word_of_mouth = 'Word_of_mouth',
  Other = 'Other',
}
