export enum CompanyStatus {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum ApprovalType {
  ANY = 'Any One Approver',
  ALL = 'All Approval',
  SEQUENTIAL = 'Sequential Approval',
}

export enum BusinessType {
  LIMITED_LIABILITY_COMPANY = 'LIMITED_LIABILITY_COMPANY',
  PUBLIC_LIMITED_COMPANY = 'PUBLIC_LIMITED_COMPANY',
  PARTNERSHIP = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  INCORPORATED_TRUSTEE = 'INCORPORATED_TRUSTEE',
  OTHER = 'OTHER',
}

export interface DirectorInfo {
  name: string;
  position: string;
  nin?: string;
  bvn?: string;
  nationality?: string;
  dob?: string;
  phone?: string;
  email?: string;
  residentialAddress?: string;
}

export interface CompanyAddress {
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

export interface CompanyContactInfo {
  email: string;
  phone: string;
  website?: string;
}

export interface CompanyDocument {
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface CompanyOnboardingData {
  companyName: string;
  tradingName?: string;
  businessType: BusinessType;
  rcNumber: string;
  tinNumber?: string;
  vatNumber?: string;
  cacStatus?: string;
  incorporationDate?: string;
  industry?: string;
  businessDescription?: string;
  authorizedCapital?: string;
  paidUpCapital?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;

  address: CompanyAddress;
  contactInfo: CompanyContactInfo;

  directors: DirectorInfo[];
  otherDocuments?: CompanyDocument[];
}
