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
    // Hitung hadiah: 95% dari total taruhan
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

    // Konfigurasi token contract (pastikan token mendukung approve)
    const TOKEN_CONTRACT_ADDRESS =
      process.env.TOKEN_CONTRACT_ADDRESS ||
      "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
    const tokenABI = [
      "function approve(address spender, uint256 amount) public returns (bool)"
    ];
    const tokenContract = new ethers.Contract(
      TOKEN_CONTRACT_ADDRESS,
      tokenABI,
      wallet
    );

    // Konversi jumlah hadiah ke satuan token terkecil (asumsi 18 desimal)
    const prizeAmount = ethers.parseUnits(prizeTokens.toString(), 18);

    // Konfigurasi smart contract LotteryClaim
    const LOTTERY_CLAIM_ADDRESS = process.env.LOTTERY_CLAIM_ADDRESS;
    if (!LOTTERY_CLAIM_ADDRESS) {
      throw new Error("LOTTERY_CLAIM_ADDRESS not configured");
    }
    const lotteryClaimABI = [
      "function setWinner(address _winner, uint256 _prize) external"
    ];
    const lotteryClaimContract = new ethers.Contract(
      LOTTERY_CLAIM_ADDRESS,
      lotteryClaimABI,
      wallet
    );

    // Approve LotteryClaim untuk menarik token hadiah dari main wallet
    const approveTx = await tokenContract.approve(LOTTERY_CLAIM_ADDRESS, prizeAmount);
    await approveTx.wait();

    // Set pemenang dan hadiah pada LotteryClaim contract
    const setWinnerTx = await lotteryClaimContract.setWinner(winner, prizeAmount);
    await setWinnerTx.wait();

    res.status(200).json({ winner, prize: prizeTokens });
  } catch (error) {
    console.error("Error in runDraw:", error);
    res.status(500).json({ error: error.message });
  }
}
