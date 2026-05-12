import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';
import { getGrpcMetadata } from '../common/grpc-metadata.util';

interface IdentityServiceClient {
  register(data: any, metadata: any): Observable<any>;
  login(data: any, metadata: any): Observable<any>;
  getProfile(data: any, metadata: any): Observable<any>;
  createRole(data: any, metadata: any): Observable<any>;
  assignRole(data: any, metadata: any): Observable<any>;
  getRoles(data: any, metadata: any): Observable<any>;
  createBusinessUnit(data: any, metadata: any): Observable<any>;
  getBusinessUnits(data: any, metadata: any): Observable<any>;
  updateBusinessUnit(data: any, metadata: any): Observable<any>;
  deleteBusinessUnit(data: any, metadata: any): Observable<any>;
  setPIN(data: any, metadata: any): Observable<any>;
  verifyPIN(data: any, metadata: any): Observable<any>;
  getKYCStatus(data: any, metadata: any): Observable<any>;
  updateKYCLevel(data: any, metadata: any): Observable<any>;
  getSecurityQuestions(data: any, metadata: any): Observable<any>;
  setUserSecurityQuestions(data: any, metadata: any): Observable<any>;
  verifySecurityAnswer(data: any, metadata: any): Observable<any>;
  exportData(data: any, metadata: any): Observable<any>;
  deleteAccount(data: any, metadata: any): Observable<any>;
  updateConsent(data: any, metadata: any): Observable<any>;
  refreshToken(data: any, metadata: any): Observable<any>;
  completeProfile(data: any, metadata: any): Observable<any>;
  verifyOTP(data: any, metadata: any): Observable<any>;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private identityService: IdentityServiceClient;

  constructor(@Inject('IDENTITY_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.identityService =
      this.client.getService<IdentityServiceClient>('IdentityService');
  }

  register(registerDto: any) {
    return this.identityService.register(registerDto, getGrpcMetadata());
  }

  login(loginDto: any) {
    return this.identityService.login(loginDto, getGrpcMetadata());
  }

  getProfile(userId: string) {
    return this.identityService.getProfile(
      { user_id: userId },
      getGrpcMetadata(),
    );
  }

  createRole(data: any) {
    return this.identityService.createRole(data, getGrpcMetadata());
  }

  assignRole(data: any) {
    return this.identityService.assignRole(data, getGrpcMetadata());
  }

  getRoles() {
    return this.identityService.getRoles({}, getGrpcMetadata());
  }

  createBusinessUnit(data: any) {
    return this.identityService.createBusinessUnit(data, getGrpcMetadata());
  }

  getBusinessUnits() {
    return this.identityService.getBusinessUnits({}, getGrpcMetadata());
  }

  updateBusinessUnit(id: string, data: any) {
    return this.identityService.updateBusinessUnit(
      { id, ...data },
      getGrpcMetadata(),
    );
  }

  deleteBusinessUnit(id: string) {
    return this.identityService.deleteBusinessUnit({ id }, getGrpcMetadata());
  }

  setPin(data: any) {
    return this.identityService.setPIN(data, getGrpcMetadata());
  }

  verifyPin(data: any) {
    return this.identityService.verifyPIN(data, getGrpcMetadata());
  }

  getKycStatus(userId: string) {
    return this.identityService.getKYCStatus(
      { user_id: userId },
      getGrpcMetadata(),
    );
  }

  upgradeKyc(userId: string, targetLevel: number) {
    return this.identityService.updateKYCLevel(
      {
        user_id: userId,
        target_level: targetLevel,
      },
      getGrpcMetadata(),
    );
  }

  getSecurityQuestions() {
    return this.identityService.getSecurityQuestions({}, getGrpcMetadata());
  }

  setSecurityQuestions(userId: string, answers: any[]) {
    return this.identityService.setUserSecurityQuestions(
      {
        user_id: userId,
        answers,
      },
      getGrpcMetadata(),
    );
  }

  verifySecurityAnswer(userId: string, questionId: number, answer: string) {
    return this.identityService.verifySecurityAnswer(
      {
        user_id: userId,
        question_id: questionId,
        answer,
      },
      getGrpcMetadata(),
    );
  }

  async exportData(userId: string) {
    return lastValueFrom(
      this.identityService.exportData({ user_id: userId }, getGrpcMetadata()),
    );
  }

  async deleteAccount(userId: string) {
    return lastValueFrom(
      this.identityService.deleteAccount(
        { user_id: userId },
        getGrpcMetadata(),
      ),
    );
  }

  async updateConsent(userId: string, data: any) {
    return lastValueFrom(
      this.identityService.updateConsent(
        { user_id: userId, ...data },
        getGrpcMetadata(),
      ),
    );
  }

  refreshToken(data: { refresh_token: string; ip_address: string }) {
    return this.identityService.refreshToken(data, getGrpcMetadata());
  }

  completeProfile(data: any) {
    return this.identityService.completeProfile(data, getGrpcMetadata());
  }

  verifyOtp(data: { email: string; code: string; type: string }) {
    return this.identityService.verifyOTP(data, getGrpcMetadata());
  }
}
