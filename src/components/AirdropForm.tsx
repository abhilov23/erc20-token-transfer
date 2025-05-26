"use client";

import { useMemo, useState, useEffect } from "react";
import InputField from "./ui/InputField";
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants";
import { useChainId, useConfig, useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { isAddress, formatUnits } from "viem";
import { calculateTotal } from "@/utils/calculateTotal/calculateTotal";
import { anvil } from "wagmi/chains";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

interface TransactionDetails {
  hash: string;
  status: 'success' | 'failed';
  tokenName: string;
  tokenSymbol: string;
  totalAmount: string;
  totalAmountFormatted: string;
  recipientCount: number;
  gasUsed?: string;
  blockNumber?: string;
}

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);
  
  const chainId = useChainId();
  const config = useConfig();
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const total: number = useMemo(() => calculateTotal(amount), [amount]);
  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  // Fetch token information when token address changes
  useEffect(() => {
    async function fetchTokenInfo() {
      if (!isAddress(tokenAddress)) {
        setTokenInfo(null);
        return;
      }

      setIsLoadingTokenInfo(true);
      try {
        const [name, symbol, decimals] = await Promise.all([
          readContract(config, {
            abi: erc20Abi,
            address: tokenAddress as `0x${string}`,
            functionName: "name",
          }),
          readContract(config, {
            abi: erc20Abi,
            address: tokenAddress as `0x${string}`,
            functionName: "symbol",
          }),
          readContract(config, {
            abi: erc20Abi,
            address: tokenAddress as `0x${string}`,
            functionName: "decimals",
          }),
        ]);

        setTokenInfo({
          name: name as string,
          symbol: symbol as string,
          decimals: decimals as number,
        });
      } catch (error) {
        console.error("Failed to fetch token info:", error);
        setTokenInfo(null);
      } finally {
        setIsLoadingTokenInfo(false);
      }
    }

    fetchTokenInfo();
  }, [tokenAddress, config]);

  async function getApprovedAmount(tSenderAddress: string | null): Promise<bigint> {
    if (!address) {
      alert("Please connect your wallet.");
      return BigInt(0);
    }

    if (!tSenderAddress || !isAddress(tSenderAddress)) {
      alert("Invalid tSender address or unsupported chain.");
      return BigInt(0);
    }

    if (!isAddress(tokenAddress)) {
      alert("Invalid token address.");
      return BigInt(0);
    }

    try {
      const response = await readContract(config, {
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: "allowance",
        args: [address, tSenderAddress as `0x${string}`],
      });

      return response as bigint;
    } catch (error) {
      console.error("Failed to read allowance:", error);
      alert("Error reading token allowance.");
      return BigInt(0);
    }
  }

  async function handleAirdrop() {
    try {
      // Reset previous transaction details
      setTransactionDetails(null);
      
      const currentChainId = chainId;
      const tSenderAddress = chainsToTSender[currentChainId]?.tsender;

      if (!tSenderAddress) {
        alert(`TSender contract not found for chain ID: ${currentChainId}. Make sure you're on Anvil (31337).`);
        return;
      }

      console.log(`Using TSender address: ${tSenderAddress} on chain: ${currentChainId}`);

      const approvedAmount = await getApprovedAmount(tSenderAddress);
      const recipientList = recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== '');
      const amountList = amount.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== '');

      let finalHash: string;

      if (approvedAmount < total) {
        console.log("Insufficient allowance, requesting approval...");
        
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddress as `0x${string}`,
          functionName: "approve",
          args: [tSenderAddress as `0x${string}`, BigInt(total)]
        });

        console.log("Approval transaction hash:", approvalHash);

        const approvalReceipt = await waitForTransactionReceipt(config, {
          hash: approvalHash
        });

        console.log("Approval confirmed:", approvalReceipt);

        // Execute airdrop after approval
        finalHash = await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress,
            recipientList,
            amountList,
            BigInt(total),
          ],
        });
      } else {
        console.log("Sufficient allowance, executing airdrop...");
        
        finalHash = await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress,
            recipientList,
            amountList,
            BigInt(total),
          ],
        });
      }

      console.log("Airdrop transaction hash:", finalHash);

      // Wait for the transaction receipt
      const receipt = await waitForTransactionReceipt(config, {
        hash: finalHash
      });

      console.log("Transaction receipt:", receipt);

      // Create transaction details
      const details: TransactionDetails = {
        hash: finalHash,
        status: receipt.status === 'success' ? 'success' : 'failed',
        tokenName: tokenInfo?.name || 'Unknown Token',
        tokenSymbol: tokenInfo?.symbol || 'UNKNOWN',
        totalAmount: total.toString(),
        totalAmountFormatted: tokenInfo ? formatUnits(BigInt(total), tokenInfo.decimals) : '0',
        recipientCount: recipientList.length,
        gasUsed: receipt.gasUsed?.toString(),
        blockNumber: receipt.blockNumber?.toString(),
      };

      setTransactionDetails(details);

    } catch (error) {
      console.error("Transaction failed:", error);
      alert(`Transaction failed: ${error}`);
      
      // Set failed transaction details if we have enough info
      if (tokenInfo) {
        setTransactionDetails({
          hash: '',
          status: 'failed',
          tokenName: tokenInfo.name,
          tokenSymbol: tokenInfo.symbol,
          totalAmount: total.toString(),
          totalAmountFormatted: formatUnits(BigInt(total || 0), tokenInfo.decimals),
          recipientCount: recipients.split(/[,\n]+/).filter(addr => addr.trim() !== '').length,
        });
      }
    }
  }

  return (
    <div className="p-8 bg-gray-100">
      <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Airdrop Form</h2>

        <InputField
          label="Token Address"
          placeholder="0x..."
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <InputField
          label="Recipient Address (comma or new line separated)"
          placeholder="0x..."
          value={recipients}
          large
          onChange={(e) => setRecipients(e.target.value)}
        />
        <InputField
          label="Amount (wei; comma or new line separated)"
          placeholder="0.00"
          value={amount}
          large
          onChange={(e) => setAmount(e.target.value)}
        />

        <div>
          <label className="text-sm font-medium text-gray-700">Current Transaction Preview</label>
          <div className="space-y-2 border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Token Name:</span>
              <span className="font-mono text-zinc-900">
                {isLoadingTokenInfo ? 'Loading...' : (tokenInfo?.name || 'N/A')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Token Symbol:</span>
              <span className="font-mono text-zinc-900">
                {isLoadingTokenInfo ? 'Loading...' : (tokenInfo?.symbol || 'N/A')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Total Amount (wei):</span>
              <span className="font-mono text-zinc-900">{total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Total Amount (tokens):</span>
              <span className="font-mono text-zinc-900">
                {tokenInfo && total ? formatUnits(BigInt(total), tokenInfo.decimals) : '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Recipients:</span>
              <span className="font-mono text-zinc-900">
                {recipients.split(/[,\n]+/).filter(addr => addr.trim() !== '').length}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details (shown after transaction) */}
        {transactionDetails && (
          <div>
            <label className="text-sm font-medium text-gray-700">Transaction Results</label>
            <div className={`space-y-2 border rounded-lg p-4 ${
              transactionDetails.status === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Status:</span>
                <span className={`font-semibold ${
                  transactionDetails.status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transactionDetails.status === 'success' ? '✅ Success' : '❌ Failed'}
                </span>
              </div>
              
              {transactionDetails.hash && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Transaction Hash:</span>
                  <span className="font-mono text-xs text-blue-600 truncate max-w-[200px]">
                    <a 
                      href={`https://etherscan.io/tx/${transactionDetails.hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {transactionDetails.hash}
                    </a>
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Token:</span>
                <span className="font-mono text-zinc-900">
                  {transactionDetails.tokenName} ({transactionDetails.tokenSymbol})
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Total Sent:</span>
                <span className="font-mono text-zinc-900">
                  {transactionDetails.totalAmountFormatted} {transactionDetails.tokenSymbol}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Recipients:</span>
                <span className="font-mono text-zinc-900">{transactionDetails.recipientCount}</span>
              </div>
              
              {transactionDetails.gasUsed && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Gas Used:</span>
                  <span className="font-mono text-zinc-900">{transactionDetails.gasUsed}</span>
                </div>
              )}
              
              {transactionDetails.blockNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600">Block Number:</span>
                  <span className="font-mono text-zinc-900">{transactionDetails.blockNumber}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          className={`mt-4 px-4 py-2 rounded-lg transition font-semibold ${
            isPending 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white' 
          }`}
          onClick={handleAirdrop}
          disabled={isPending}
        >
          {isPending ? 'Processing...' : 'Send Tokens' }
        </button>
      </div>
    </div>
  );
}