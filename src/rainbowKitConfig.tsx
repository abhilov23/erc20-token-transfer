"use client"

import {getDefaultConfig} from "@rainbow-me/rainbowkit";

import {anvil, mainnet, sepolia, arbitrum} from "wagmi/chains";


export default getDefaultConfig({
    appName: "TSender",
    projectId: "0def2c77d9fbcd72c75f297fe7039b62",  //WalletId
    chains: [anvil,  mainnet, sepolia, arbitrum],
    ssr: false
})