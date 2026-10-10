import mongoose, { Schema, Model } from "mongoose";

export function getMongoUri(): { uri: string; isTestnet: boolean } {
  const isNetTestnet = process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== "mainnet";
  const uri = isNetTestnet
    ? (process.env.MONGODB_URI_TESTNET || process.env.MONGODB_URI || "")
    : (process.env.MONGODB_URI || "");
  return { uri, isTestnet: isNetTestnet };
}

declare global {
  var adminMongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

export async function connectAdminDb(): Promise<typeof mongoose> {
  const { uri } = getMongoUri();

  if (!uri) {
    throw new Error("MONGODB_URI or MONGODB_URI_TESTNET environment variable is not defined");
  }

  const currentCache = globalThis.adminMongooseConnection || { conn: null, promise: null };
  if (!globalThis.adminMongooseConnection) {
    globalThis.adminMongooseConnection = currentCache;
  }

  if (currentCache.conn && currentCache.conn.connection.readyState === 1) {
    return currentCache.conn;
  }

  if (!currentCache.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    currentCache.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    currentCache.conn = await currentCache.promise;
  } catch (e) {
    currentCache.promise = null;
    throw e;
  }

  return currentCache.conn;
}

// Schemas & Models (Read & Telemetry optimized)

export interface IReceiptDoc {
  _id: string;
  receiptNumber?: string;
  merchantAddress: string;
  merchantName?: string;
  businessName?: string;
  total: number;
  currency: string;
  status: "Issued" | "Voided" | "issued" | "voided";
  paymentMethod: string;
  paymentStatus: string;
  onChainStatus?: "pending" | "anchored" | "failed";
  onChainTxHash?: string | null;
  items?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceiptDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, index: true },
    merchantName: { type: String, default: null },
    total: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    status: { type: String, default: "Issued", index: true },
    paymentMethod: { type: String, default: "Cash" },
    paymentStatus: { type: String, default: "paid" },
    onChainStatus: { type: String, default: "anchored", index: true },
    onChainTxHash: { type: String, default: null, index: true },
    items: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true,
    strict: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ReceiptSchema.virtual("receiptNumber").get(function (this: { _id: string }) {
  return this._id;
});

ReceiptSchema.virtual("businessName").get(function (this: { merchantName?: string }) {
  return this.merchantName || "Unnamed Store";
});

export interface IShipmentDoc {
  _id: string;
  shipperAddress: string;
  trackingCode?: string;
  status: "Created" | "InTransit" | "Delivered" | "Verified" | "Disputed";
  isDisputed?: boolean;
  disputeResolved?: boolean;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  createdBy?: {
    address?: string;
    name?: string;
    branchName?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  onChainStatus?: "pending" | "anchored" | "failed";
  onChainTxHash?: string | null;
  events?: Array<{
    event?: string;
    onChainTxHash?: string | null;
    timestamp?: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipmentDoc>(
  {
    _id: { type: String, required: true },
    shipperAddress: { type: String, required: true, index: true },
    trackingCode: { type: String, default: null, index: true },
    status: { type: String, required: true },
    isDisputed: { type: Boolean, default: false },
    disputeResolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    resolutionNotes: { type: String, default: null },
    createdBy: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    onChainStatus: { type: String, default: "anchored", index: true },
    onChainTxHash: { type: String, default: null, index: true },
  },
  { timestamps: true, strict: false }
);

export interface IUserDoc {
  _id: string;
  eoaAddress?: string;
  walletPublicAddress?: string;
  fullName: string;
  companyName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessHandle?: string;
  role: "user" | "merchant";
  country?: string;
  currency?: string;
  plan?: string;
  operatingMode?: "sales" | "dispatch" | "hybrid" | null;
  subscriptionActive?: boolean;
  isSuspended?: boolean;
  businessAddress?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    eoaAddress: { type: String, default: null, lowercase: true, index: true },
    walletPublicAddress: { type: String, default: null, lowercase: true },
    fullName: { type: String, required: true },
    companyName: { type: String, default: null },
    businessEmail: { type: String, default: null },
    businessPhone: { type: String, default: null },
    businessHandle: { type: String, default: null },
    role: { type: String, default: "user", index: true },
    country: { type: String, default: null },
    currency: { type: String, default: null },
    plan: { type: String, default: "free" },
    operatingMode: { type: String, default: null },
    subscriptionActive: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    businessAddress: { type: String, default: null },
  },
  { timestamps: true }
);

export interface IBranchDoc {
  _id: string;
  merchantAddress: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  managedBy?: string | null;
  managerName?: string | null;
  managerAddress?: string | null;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranchDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true },
    location: { type: String, default: null },
    phone: { type: String, default: null },
    managedBy: { type: String, default: null },
    managerName: { type: String, default: null },
    managerAddress: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export interface ITeamMemberDoc {
  _id: string;
  merchantAddress: string;
  branchId: string;
  branchName: string;
  memberEmail: string;
  memberPhone?: string | null;
  memberAddress?: string | null;
  memberName: string;
  role: "manager" | "sales_rep";
  status: "active" | "suspended";
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date | null;
  suspendedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMemberDoc>(
  {
    _id: { type: String, required: true },
    merchantAddress: { type: String, required: true, lowercase: true, index: true },
    branchId: { type: String, required: true, index: true },
    branchName: { type: String, required: true },
    memberEmail: { type: String, required: true, lowercase: true, index: true },
    memberPhone: { type: String, default: null },
    memberAddress: { type: String, default: null },
    memberName: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: "active" },
    invitedBy: { type: String, required: true },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AdminReceipt: Model<IReceiptDoc> =
  mongoose.models.AdminReceipt || mongoose.model<IReceiptDoc>("AdminReceipt", ReceiptSchema, "receipts");

export const AdminShipment: Model<IShipmentDoc> =
  mongoose.models.AdminShipment || mongoose.model<IShipmentDoc>("AdminShipment", ShipmentSchema, "shipments");

export const AdminUser: Model<IUserDoc> =
  mongoose.models.AdminUser || mongoose.model<IUserDoc>("AdminUser", UserSchema, "users");

export const AdminBranch: Model<IBranchDoc> =
  mongoose.models.AdminBranch || mongoose.model<IBranchDoc>("AdminBranch", BranchSchema, "branches");

export const AdminTeamMember: Model<ITeamMemberDoc> =
  mongoose.models.AdminTeamMember || mongoose.model<ITeamMemberDoc>("AdminTeamMember", TeamMemberSchema, "teammembers");

