import crypto from 'crypto';
import { db } from './db';

export interface AuditEventPayload {
  eventType: 
    | 'ACCESS_REQUESTED'
    | 'ACCESS_GRANTED'
    | 'ACCESS_DENIED'
    | 'ACCESS_REVOKED'
    | 'SESSION_STARTED'
    | 'DOCUMENT_OPENED'
    | 'PAGE_VIEWED'
    | 'SESSION_ENDED'
    | 'DOCUMENT_UPLOADED'
    | 'DOCUMENT_REGISTERED';
  actorId: string;
  actorName: string;
  actorRole: string;
  targetId?: string;
  targetName?: string;
  documentHash?: string;
  documentId?: string;
  documentTitle?: string;
  details?: Record<string, any>;
}

export function calculateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateTxHash(payloadStr: string, timestamp: string): string {
  const raw = `${payloadStr}-${timestamp}-${Math.random()}`;
  return '0x' + calculateHash(raw);
}

/**
 * Initializes genesis block if empty
 */
export function initBlockchain() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM blockchain_transactions').get() as { count: number };
  if (countRow.count === 0) {
    const timestamp = new Date('2026-09-01T00:00:00.000Z').toISOString();
    const genesisPayload = JSON.stringify({
      message: 'Personal Health Locker Genesis Block - Immutable Patient Audit Ledger Initialized',
      version: '1.0.0-HIPAA-Compliant'
    });
    const txHash = '0x' + calculateHash('GENESIS_TX_HEALTH_LOCKER_2026');
    const prevHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const blockHash = '0x' + calculateHash(`0-${prevHash}-${txHash}-${timestamp}`);

    db.prepare(`
      INSERT INTO blockchain_transactions (
        id, block_number, event_type, tx_hash, block_hash, previous_block_hash,
        document_hash, actor_id, actor_name, actor_role, target_id, target_name,
        payload_json, timestamp, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'tx-genesis-000',
      0,
      'GENESIS_BLOCK',
      txHash,
      blockHash,
      prevHash,
      null,
      'system',
      'Health Locker Protocol',
      'system',
      'network',
      'Global Ledger',
      genesisPayload,
      timestamp,
      1
    );

    console.log('⛓️ Genesis block created on Blockchain Audit Ledger');
  }
}

/**
 * Records a new immutable audit transaction onto the blockchain
 */
export function recordBlockchainEvent(payload: AuditEventPayload): {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
} {
  const timestamp = new Date().toISOString();
  const lastBlock = db.prepare(`
    SELECT block_number, block_hash FROM blockchain_transactions ORDER BY block_number DESC LIMIT 1
  `).get() as { block_number: number; block_hash: string } | undefined;

  const blockNumber = (lastBlock?.block_number ?? 0) + 1;
  const previousBlockHash = lastBlock?.block_hash ?? '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  const payloadStr = JSON.stringify(payload);
  const txHash = generateTxHash(payloadStr, timestamp);
  const blockData = `${blockNumber}-${previousBlockHash}-${txHash}-${timestamp}-${payloadStr}`;
  const blockHash = '0x' + calculateHash(blockData);
  const id = `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  db.prepare(`
    INSERT INTO blockchain_transactions (
      id, block_number, event_type, tx_hash, block_hash, previous_block_hash,
      document_hash, actor_id, actor_name, actor_role, target_id, target_name,
      payload_json, timestamp, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    blockNumber,
    payload.eventType,
    txHash,
    blockHash,
    previousBlockHash,
    payload.documentHash || null,
    payload.actorId,
    payload.actorName,
    payload.actorRole,
    payload.targetId || null,
    payload.targetName || null,
    payloadStr,
    timestamp,
    1
  );

  return { txHash, blockNumber, blockHash, timestamp };
}

/**
 * Verifies mathematical cryptographic chain validity of the entire ledger
 */
export function verifyLedgerIntegrity(): {
  isValid: boolean;
  totalBlocks: number;
  tamperedBlocks: number[];
  verifiedAt: string;
} {
  const blocks = db.prepare(`
    SELECT * FROM blockchain_transactions ORDER BY block_number ASC
  `).all() as any[];

  const tampered: number[] = [];
  let prevHash = '0x0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (i === 0) {
      prevHash = b.block_hash;
      continue;
    }

    if (b.previous_block_hash !== prevHash) {
      tampered.push(b.block_number);
    }

    const payloadStr = b.payload_json;
    const expectedBlockHash = '0x' + calculateHash(`${b.block_number}-${b.previous_block_hash}-${b.tx_hash}-${b.timestamp}-${payloadStr}`);
    
    if (b.block_hash !== expectedBlockHash) {
      tampered.push(b.block_number);
    }

    prevHash = b.block_hash;
  }

  return {
    isValid: tampered.length === 0,
    totalBlocks: blocks.length,
    tamperedBlocks: [...new Set(tampered)],
    verifiedAt: new Date().toISOString()
  };
}
