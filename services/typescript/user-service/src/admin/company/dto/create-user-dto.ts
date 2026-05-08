export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  position?: string;
  department?: string;
  employmentType?: 'contract' | 'permanent' | 'temporary' | 'intern';
  salary?: number;
  hireDate?: Date;
  ninNumber?: string;
  bvnNumber?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  companyId: string;
  roles?: string[];
}
