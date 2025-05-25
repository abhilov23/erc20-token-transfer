"use client";

import { useMemo, useState } from "react";
import InputField from "./ui/InputField";
import { chainsToTSender, tsenderAbi, erc20Abi } from "@/constants";
import { useChainId, useConfig, useAccount, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { isAddress } from "viem";
import { calculateTotal } from "@/utils/calculateTotal/calculateTotal";


export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipients, setRecipients] = useState("");
  const [amount, setAmount] = useState("");
  const chainId = useChainId();
  const config = useConfig();
  const { address } = useAccount();
  const total:number = useMemo(()=> calculateTotal(amount), [amount])
  const {data: hash, isPending, writeContractAsync} = useWriteContract();


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
    const tSenderAddress = chainsToTSender[chainId]?.tsender;

    const approvedAmount = await getApprovedAmount(tSenderAddress);

    // Add next steps here:
    // - Check if `approvedAmount >= amount`
    // - If not, call approve()
    // - Then, call your airdrop smart contract function
     
    if(approvedAmount < total){
       const approvalHash = await writeContractAsync({
        abi: erc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName:"approve",
        args:[tSenderAddress as `0x${string}`, BigInt(total)]
       })
       
       const approvalReceipt = await waitForTransactionReceipt(config, {
        hash:approvalHash
      });

      console.log("approval confirmed:", approvalReceipt);

       await writeContractAsync({
                abi: tsenderAbi,
                address: tSenderAddress as `0x${string}`,
                functionName: "airdropERC20",
                args: [
                    tokenAddress,
                    // Comma or new line separated
                    recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                    amount.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                    BigInt(total),
                ],
            },)

    } else {
      await writeContractAsync({
                abi: tsenderAbi,
                address: tSenderAddress as `0x${string}`,
                functionName: "airdropERC20",
                args: [
                    tokenAddress,
                    // Comma or new line separated
                    recipients.split(/[,\n]+/).map(addr => addr.trim()).filter(addr => addr !== ''),
                    amount.split(/[,\n]+/).map(amt => amt.trim()).filter(amt => amt !== ''),
                    BigInt(total),
                ],
            },)
    }


   // if(result < total-amount needed)
   


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
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={handleAirdrop}
        >
          <span className="font-semibold">Send Tokens</span>
        </button>
      </div>
    </div>
  );
}
