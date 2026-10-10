import { AdminReceipt, AdminShipment } from "./db";

/**
 * Filter for receipts that have NOT yet been anchored on the Electroneum blockchain.
 * By definition, any receipt with a valid, non-empty onChainTxHash is already recorded
 * on-chain and CANNOT match this filter.
 */
export function getUnanchoredReceiptFilter(olderThan?: Date): Record<string, unknown> {
  const missingTxHash = {
    $or: [
      { onChainTxHash: null },
      { onChainTxHash: { $exists: false } },
      { onChainTxHash: "" },
    ],
  };

  const statusCriteria: Record<string, unknown>[] = [
    { onChainStatus: "failed" },
    { onChainStatus: "pending" },
    { status: { $in: ["Issued", "issued"] } },
  ];

  if (olderThan) {
    return {
      $and: [
        missingTxHash,
        {
          $or: statusCriteria.map((c) => ({ ...c, createdAt: { $lt: olderThan } })),
        },
      ],
    };
  }

  return {
    $and: [missingTxHash, { $or: statusCriteria }],
  };
}

/**
 * Filter for receipts that are cryptographically anchored on the Electroneum blockchain.
 * Matches either explicit onChainStatus "anchored" OR any verified 0x... on-chain transaction hash.
 */
export function getAnchoredReceiptFilter(): Record<string, unknown> {
  return {
    $or: [
      { onChainStatus: "anchored" },
      { onChainTxHash: { $exists: true, $ne: null, $nin: ["", null], $regex: /^0x/i } },
    ],
  };
}

/**
 * Filter for shipments that have NOT yet been anchored on the Electroneum blockchain.
 * Checks both root onChainTxHash and first dispatch event (events.0.onChainTxHash).
 */
export function getUnanchoredShipmentFilter(olderThan?: Date): Record<string, unknown> {
  const missingTxHash = {
    $and: [
      {
        $or: [
          { onChainTxHash: null },
          { onChainTxHash: { $exists: false } },
          { onChainTxHash: "" },
        ],
      },
      {
        $or: [
          { "events.0.onChainTxHash": null },
          { "events.0.onChainTxHash": { $exists: false } },
          { "events.0.onChainTxHash": "" },
        ],
      },
    ],
  };

  if (olderThan) {
    return {
      $and: [
        missingTxHash,
        { createdAt: { $lt: olderThan } },
        { status: { $ne: "Disputed" } },
      ],
    };
  }

  return {
    $and: [missingTxHash, { status: { $ne: "Disputed" } }],
  };
}

/**
 * Filter for shipments that are cryptographically anchored on the Electroneum blockchain.
 */
export function getAnchoredShipmentFilter(): Record<string, unknown> {
  return {
    $or: [
      { onChainStatus: "anchored" },
      { onChainTxHash: { $exists: true, $ne: null, $nin: ["", null], $regex: /^0x/i } },
      { "events.0.onChainTxHash": { $exists: true, $ne: null, $nin: ["", null], $regex: /^0x/i } },
    ],
  };
}

/**
 * Self-healing sync: Silently heals legacy records where a transaction hash is already
 * confirmed on-chain but onChainStatus was stuck on "pending" or missing.
 * Runs non-blocking.
 */
export async function healDriftedAnchors(): Promise<void> {
  try {
    await Promise.all([
      AdminReceipt.updateMany(
        {
          onChainTxHash: { $exists: true, $ne: null, $regex: /^0x/i },
          onChainStatus: { $ne: "anchored" },
        },
        { $set: { onChainStatus: "anchored" } }
      ),
      AdminShipment.updateMany(
        {
          $or: [
            { onChainTxHash: { $exists: true, $ne: null, $regex: /^0x/i } },
            { "events.0.onChainTxHash": { $exists: true, $ne: null, $regex: /^0x/i } },
          ],
          onChainStatus: { $ne: "anchored" },
        },
        { $set: { onChainStatus: "anchored" } }
      ),
    ]);
  } catch {
    // Non-blocking sync error swallowed
  }
}
