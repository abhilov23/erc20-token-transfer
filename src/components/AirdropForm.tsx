"use client";


import InputField from "./ui/InputField";

export default function AirdropForm() {
    return (
        <div className=" p-8 bg-gray-100">
        <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Airdrop Form</h2>
        <InputField
            label="Token Address"
            placeholder="0x..."
            value=""
            onChange={() => {}}
        />
        <InputField
            label="Recipient Address (comma or new line separated)"
            placeholder="0x..."
            value=""
            large
            onChange={() => {}}
        />
        <InputField
            label="Amount (wei; comma or new line separated)"
            placeholder="0.00"
            value=""
            large
            onChange={() => {}}
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
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Send Tokens
        </button>
        </div>
        </div>
    );
}