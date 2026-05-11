export interface Profile {
  id: string;
  email: string;          // from auth.users — merged in useAuth
  fullName: string;
  phoneNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  countryCode: string;
  profilePictureUrl?: string;
  isLocked: boolean;
  failedLoginCount: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: string;
  accountName: string;
  balance: number;
  availableBalance: number;
  currencyCode: string;
  status: string;
  interestRate?: number;
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummaryDto {
  account: Account;
  recentTransactions: Transaction[];
  unreadAlertsCount: number;
}

export interface Card {
  id: string;
  accountId: string;
  userId: string;
  cardNumber: string;
  cardNumberLast4?: string;
  cvv?: string;
  cardHolderName: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
  status: string;
  allowInternational: boolean;
  allowOnline: boolean;
  allowContactless: boolean;
  dailyLimit: number;
  issuedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  cardId?: string;
  beneficiaryId?: string;
  amount: number;
  direction: string;
  currencyCode: string;
  runningBalance?: number;
  isInternational: boolean;
  status: string;
  referenceNumber?: string;
  description?: string;
  notes?: string;
  initiatedAt: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
  fraudScore?: FraudScore;
  merchantName?: string;
  merchantCategory?: string;
  locationCity?: string;
  locationCountry?: string;
}

export interface FraudScore {
  id: string;
  transactionId: string;
  accountId: string;
  userId: string;
  riskScore: number;
  riskLevel: string;
  triggeredRules?: Rule[];
  autoApproved: boolean;
  stepUpRequired: boolean;
  blocked: boolean;
  analystReviewed: boolean;
  engineVersion: string;
  scoredAt: string;
}

export interface Rule {
  rule: string;
  score: number;
  detail: string;
}

export interface FraudCase {
  id: string;
  transactionId: string;
  accountId: string;
  userId: string;
  caseNumber?: string;
  status: string;
  resolution?: string;
  resolutionNotes?: string;
  analystId?: string;
  assignedAt?: string;
  disputeReason?: string;
  disputeDescription?: string;
  evidenceUrls?: string[];
  openedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
  timeline?: CaseTimeline[];
}

export interface CaseTimeline {
  id: string;
  caseId: string;
  actorId?: string;
  actorType: string;
  eventType: string;
  eventDescription: string;
  metadata?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  transactionId?: string;
  fraudCaseId?: string;
  alertType: string;
  title: string;
  message: string;
  status: string;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: string;
  readAt?: string;
}

export interface DeviceRegistry {
  id: string;
  userId: string;
  fingerprintHash: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  ipAddress?: string;
  isp?: string;
  vpnDetected: boolean;
  city?: string;
  countryCode?: string;
  trustStatus: string;
  trustGrantedAt?: string;
  trustRevokedAt?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionCount: number;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  fullName: string;
  accountNumber: string;
  bankName: string;
  branchCode?: string;
  reference?: string;
  isVerified: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

export interface UserFraudPreferences {
  id: string;
  userId: string;
  velocityEnabled: boolean;
  velocityMaxTxCount: number;
  velocityWindowMinutes: number;
  amountCheckEnabled: boolean;
  amountMultiplier: number;
  timeCheckEnabled: boolean;
  activeHoursStart: number;
  activeHoursEnd: number;
  dailyLimitEnabled: boolean;
  dailySpendLimit: number;
  balanceDrainEnabled: boolean;
  balanceDrainPercent: number;
  balanceDrainWindowMinutes: number;
  duplicateCheckEnabled: boolean;
  duplicateWindowMinutes: number;
  duplicateAmountThreshold: number;
  inactiveDaysEnabled: boolean;
  inactiveDays?: number[];
  createdAt: string;
  updatedAt: string;
}
