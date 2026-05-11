export interface IdentityResponse {
  success: boolean;
  message: string;
  token?: string;
  user_id?: string;
  user_type?: string;
  role?: {
    name: string;
    permissions: Array<{ name: string }>;
  };
}

export interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  status: string;
  role?: {
    name: string;
    permissions: Array<{ name: string }>;
  };
}
