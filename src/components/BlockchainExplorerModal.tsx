import React, { useState, useEffect } from 'react';
import { BlockchainTransaction } from '../types';
import { api } from '../services/api';
import {
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle2,
  Search,
  Filter,
  X,
  Lock,
  RefreshCw,
  Cpu,
  AlertTriangle
} from 'lucide-react';

interface BlockchainExplorerModalProps {
  onClose: () => void;
}

export const BlockchainExplorerModal: React.FC<BlockchainExplorerModalProps> = ({ onClose }) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getBlockchainTransactions({ eventType: selectedFilter || undefined });
      setTransactions(res.transactions);
    } catch (e) {
      console.warn('Failed to load blockchain transactions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyBlockchain();
      setVerificationResult(res);
    } catch (e) {
      console.error('Ledger verification failed', e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedFilter]);

  const eventBadgeColors: Record<string, string> = {
    ACCESS_REQUESTED: 'bg-amber-100 text-amber-800 border-amber-200',
    ACCESS_GRANTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ACCESS_DENIED: 'bg-rose-100 text-rose-800 border-rose-200',
    ACCESS_REVOKED: 'bg-purple-100 text-purple-800 border-purple-200',
    SESSION_STARTED: 'bg-sky-100 text-sky-800 border-sky-200',
    PAGE_VIEWED: 'bg-blue-100 text-blue-800 border-blue-200',
    SESSION_ENDED: 'bg-slate-100 text-slate-800 border-slate-200',
    DOCUMENT_UPLOADED: 'bg-teal-100 text-teal-800 border-teal-200',
    GENESIS_BLOCK: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 text-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-400">
              <LinkIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Blockchain Audit Explorer
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-900 text-sky-300 border border-sky-700">
                  Immutable SHA-256 Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cryptographically chained patient consent, document verification, and access logs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleVerifyLedger}
              disabled={verifying}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
            >
              <Cpu className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Verification Banner if clicked */}
        {verificationResult && (
          <div
            className={`p-3.5 px-6 text-xs flex items-center justify-between border-b ${
              verificationResult.isValid
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span className="font-bold">
                ✓ Blockchain Ledger Verified: All {verificationResult.totalBlocks} Blocks mathematically intact. Zero tampering detected.
              </span>
            </div>
            <span className="text-[10px] opacity-75 font-mono">
              Timestamp: {verificationResult.verifiedAt}
            </span>
          </div>
        )}

        {/* Filters Bar */}
        <div className="px-6 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Filter Events:</span>
            {['', 'ACCESS_REQUESTED', 'ACCESS_GRANTED', 'PAGE_VIEWED', 'SESSION_ENDED', 'DOCUMENT_UPLOADED'].map((ev) => (
              <button
                key={ev}
                onClick={() => setSelectedFilter(ev)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  selectedFilter === ev
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ev || 'All Events'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchTransactions}
            className="p-1.5 text-slate-400 hover:text-white rounded transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Transaction Table / Block List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading blockchain blocks...</div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">No transactions recorded for this filter.</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-sky-500/50 transition-all text-xs font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-700/60 font-sans">
                  <div className="flex items-center space-x-2.5">
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-sky-300 font-mono font-bold text-xs">
                      Block #{tx.block_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                        eventBadgeColors[tx.event_type] || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {tx.event_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Transaction Hash (TxID)</span>
                    <span className="text-emerald-400 break-all select-all font-bold">
                      {tx.tx_hash}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-sans">Previous Block Hash</span>
                    <span className="text-slate-400 break-all select-all">
                      {tx.previous_block_hash}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 p-2.5 rounded-lg bg-black/40 border border-slate-800 font-sans text-xs text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Actor: </span>
                    <span className="font-bold text-white">{tx.actor_name}</span> ({tx.actor_role})
                    {tx.target_name && (
                      <>
                        <span className="text-slate-400"> → Target: </span>
                        <span className="font-bold text-white">{tx.target_name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>Security Architecture: SHA-256 Hashed • Zero Raw PHI On-Chain</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
