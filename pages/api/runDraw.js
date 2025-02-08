// pages/api/runDraw.js
import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { participants, totalBet } = req.body;
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    res.status(400).json({ error: "No participants provided" });
    return;
  }

  try {
    // Hitung hadiah: 95% dari total taruhan (token)
    const prizeTokens = totalBet * 0.95;

    // Pilih pemenang secara acak
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex];

    // Inisialisasi provider menggunakan RPC_URL dari environment variable
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error("RPC_URL not configured");
    }
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Buat wallet instance dari MAIN_WALLET_PRIVATE_KEY
    const mainPrivateKey = process.env.MAIN_WALLET_PRIVATE_KEY;
    if (!mainPrivateKey) {
      throw new Error("MAIN_WALLET_PRIVATE_KEY not configured");
    }
    const wallet = new ethers.Wallet(mainPrivateKey, provider);

    // Konfigurasi token contract
    const TOKEN_CONTRACT_ADDRESS =
      process.env.TOKEN_CONTRACT_ADDRESS ||
      "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
    const tokenABI = [
      "function transfer(address to, uint256 amount) public returns (bool)"
    ];
    const tokenContract = new ethers.Contract(
      TOKEN_CONTRACT_ADDRESS,
      tokenABI,
      wallet
    );

    // Konversi jumlah hadiah ke satuan token terkecil (asumsi 18 desimal)
    const prizeAmount = ethers.parseUnits(prizeTokens.toString(), 18);

    // Kirim transaksi transfer dari main wallet ke pemenang
    const tx = await tokenContract.transfer(winner, prizeAmount);
    await tx.wait();

    res.status(200).json({ winner, prize: prizeTokens });
  } catch (error) {
    console.error("Error in runDraw:", error);
    res.status(500).json({ error: error.message });
  }
}
