"use client"

import {getDefaultConfig} from "@rainbow-me/rainbowkit";

import {anvil, zksync} from "wagmi/chains";


export default getDefaultConfig({
    appName: "TSender",
    projectId: "0def2c77d9fbcd72c75f297fe7039b62",  //WalletId
    chains: [anvil, zksync],
    ssr: false
})