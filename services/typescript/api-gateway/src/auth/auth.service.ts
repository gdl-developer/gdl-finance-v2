import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, lastValueFrom } from 'rxjs';

interface IdentityServiceClient {
  register(data: any): Observable<any>;
  login(data: any): Observable<any>;
  getProfile(data: any): Observable<any>;
  createRole(data: any): Observable<any>;
  assignRole(data: any): Observable<any>;
  getRoles(data: any): Observable<any>;
  createBusinessUnit(data: any): Observable<any>;
  getBusinessUnits(data: any): Observable<any>;
  updateBusinessUnit(data: {
    id: string;
    name: string;
    manager_id?: string;
  }): Observable<any>;
  deleteBusinessUnit(data: { id: string }): Observable<any>;
  setPIN(data: any): Observable<any>;
  verifyPIN(data: any): Observable<any>;
  getKYCStatus(data: any): Observable<any>;
  updateKYCLevel(data: any): Observable<any>;
  getSecurityQuestions(data: any): Observable<any>;
  setUserSecurityQuestions(data: any): Observable<any>;
  verifySecurityAnswer(data: any): Observable<any>;
  exportData(data: { user_id: string }): Observable<any>;
  deleteAccount(data: { user_id: string }): Observable<any>;
  updateConsent(data: {
    user_id: string;
    terms_accepted: boolean;
    privacy_policy_accepted: boolean;
    marketing_consent: boolean;
    policy_version: string;
  }): Observable<any>;
  refreshToken(data: {
    refresh_token: string;
    ip_address: string;
  }): Observable<any>;
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
    return this.identityService.register(registerDto);
  }

  login(loginDto: any) {
    return this.identityService.login(loginDto);
  }

  getProfile(userId: string) {
    return this.identityService.getProfile({ user_id: userId });
  }

  createRole(data: any) {
    return this.identityService.createRole(data);
  }

  assignRole(data: any) {
    return this.identityService.assignRole(data);
  }

  getRoles() {
    return this.identityService.getRoles({});
  }

  createBusinessUnit(data: any) {
    return this.identityService.createBusinessUnit(data);
  }

  getBusinessUnits() {
    return this.identityService.getBusinessUnits({});
  }

  updateBusinessUnit(id: string, data: any) {
    return this.identityService.updateBusinessUnit({ id, ...data });
  }

  deleteBusinessUnit(id: string) {
    return this.identityService.deleteBusinessUnit({ id });
  }

  setPin(data: any) {
    return this.identityService.setPIN(data);
  }

  verifyPin(data: any) {
    return this.identityService.verifyPIN(data);
  }

  getKycStatus(userId: string) {
    return this.identityService.getKYCStatus({ user_id: userId });
  }

  upgradeKyc(userId: string, targetLevel: number) {
    return this.identityService.updateKYCLevel({
      user_id: userId,
      target_level: targetLevel,
    });
  }

  getSecurityQuestions() {
    return this.identityService.getSecurityQuestions({});
  }

  setSecurityQuestions(userId: string, answers: any[]) {
    return this.identityService.setUserSecurityQuestions({
      user_id: userId,
      answers,
    });
  }

  verifySecurityAnswer(userId: string, questionId: number, answer: string) {
    return this.identityService.verifySecurityAnswer({
      user_id: userId,
      question_id: questionId,
      answer,
    });
  }

  async exportData(userId: string) {
    return lastValueFrom(this.identityService.exportData({ user_id: userId }));
  }

  async deleteAccount(userId: string) {
    return lastValueFrom(
      this.identityService.deleteAccount({ user_id: userId }),
    );
  }

  async updateConsent(userId: string, data: any) {
    return lastValueFrom(
      this.identityService.updateConsent({ user_id: userId, ...data }),
    );
  }

  refreshToken(data: { refresh_token: string; ip_address: string }) {
    return this.identityService.refreshToken(data);
  }
}
