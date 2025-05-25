"use client";

import { useMemo, useState } from "react";
import InputField from "./ui/InputField";
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants";
import { useChainId, useConfig, useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { isAddress } from "viem";
import { calculateTotal } from "@/utils/calculateTotal/calculateTotal";
import { anvil } from "wagmi/chains";

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amount, setAmount] = useState("");
  const chainId = useChainId();
  const config = useConfig();
  const { address } = useAccount();
  const { switchChain } = useSwitchChain();
  const total: number = useMemo(() => calculateTotal(amount), [amount]);
  const { data: hash, isPending, writeContractAsync } = useWriteContract();

  // Add chain validation function
  

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
      // CRITICAL FIX: Ensure we're on the correct chain before any transactions
      
      // Re-check chainId after potential switch
      const currentChainId = chainId;
      const tSenderAddress = chainsToTSender[currentChainId]?.tsender;

      if (!tSenderAddress) {
        alert(`TSender contract not found for chain ID: ${currentChainId}. Make sure you're on Anvil (31337).`);
        return;
      }

      console.log(`Using TSender address: ${tSenderAddress} on chain: ${currentChainId}`);

      const approvedAmount = await getApprovedAmount(tSenderAddress);

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
        const airdropHash = await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress,
            recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
            amount.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
            BigInt(total),
          ],
        });

        console.log("Airdrop transaction hash:", airdropHash);
        
      } else {
        console.log("Sufficient allowance, executing airdrop...");
        
        const airdropHash = await writeContractAsync({
          abi: tsenderAbi,
          address: tSenderAddress as `0x${string}`,
          functionName: "airdropERC20",
          args: [
            tokenAddress,
            recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
            amount.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
            BigInt(total),
          ],
        });

        console.log("Airdrop transaction hash:", airdropHash);
      }

    } catch (error) {
      console.error("Transaction failed:", error);
      alert(`Transaction failed: ${error}`);
    }
  }

  return (
    <div className="p-8 bg-gray-100">
      <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Airdrop Form</h2>
        
        {/* Add chain status indicator */}
        {/* <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Chain:</span>
            <span className={`font-mono text-sm ${chainId === anvil.id ? 'text-green-600' : 'text-red-600'}`}>
              {chainId === anvil.id ? '✅ Anvil Local (31337)' : `❌ Chain ${chainId} (Switch to Anvil)`}
            </span>
          </div>
        </div> */}

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
          <label className="text-sm font-medium text-gray-700">Transaction Details</label>
          <div className="space-y-2 border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Token Name:</span>
              <span className="font-mono text-zinc-900"></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Amount (wei):</span>
              <span className="font-mono text-zinc-900">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Amount (tokens):</span>
              <span className="font-mono text-zinc-900">0.00</span>
            </div>
          </div>
        </div>

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