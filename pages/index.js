// pages/index.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import WalletConnectProvider from "@walletconnect/web3-provider";
import styles from "../styles/Home.module.css";

export default function Home() {
  // State untuk data aplikasi
  const [currentAddress, setCurrentAddress] = useState("");
  const [participants, setParticipants] = useState([]);
  const [totalBet, setTotalBet] = useState(0);
  const [round, setRound] = useState(1);
  const [prevWinner, setPrevWinner] = useState("");
  const [prevPrize, setPrevPrize] = useState(0);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Untuk testing, tiket seharga 10 token
  const TOKEN_AMOUNT = 10;

  // Ambil nilai environment dari .env.local
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://YOUR_BASE_RPC_URL_HERE";
  const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453;
  const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YourWalletConnectProjectID";
  const LOTTERY_CLAIM_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CLAIM_ADDRESS || "0xYourLotteryClaimContractAddress";

  // Konstanta lainnya
  const MAIN_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
  const TOKEN_CONTRACT_ADDRESS = "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";

  // Fungsi getProvider: Menggunakan WalletConnect secara eksklusif
  const getProvider = async () => {
    const wcProvider = new WalletConnectProvider({
      projectId: WC_PROJECT_ID,
      rpc: { [CHAIN_ID]: RPC_URL },
      chainId: CHAIN_ID,
      qrcode: true, // Tampilkan QR Code atau deep link sesuai perangkat
    });
    await wcProvider.enable();
    return new ethers.BrowserProvider(wcProvider);
  };

  // Fungsi menghitung waktu mundur hingga awal jam berikutnya
  const calculateCountdown = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(60, 0, 0);
    return nextHour - now;
  };

  // Update countdown setiap detik
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = calculateCountdown();
      if (diff <= 0) {
        handleDraw();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [participants]);

  // Fungsi untuk menjalankan proses draw
  const handleDraw = async () => {
    if (participants.length === 0) {
      alert("No participants in this round.");
      setRound((prev) => prev + 1);
      return;
    }
    try {
      const response = await fetch("/api/runDraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, totalBet }),
      });
      const data = await response.json();
      if (response.ok) {
        setPrevWinner(data.winner);
        setPrevPrize(data.prize);
        alert(`Draw complete!\nWinner: ${data.winner}\nPrize: ${data.prize} tokens`);
      } else {
        alert("Draw failed: " + data.error);
      }
    } catch (error) {
      console.error("Error in draw:", error);
      alert("An error occurred during the draw.");
    }
    // Reset data untuk ronde berikutnya
    setParticipants([]);
    setTotalBet(0);
    setRound((prev) => prev + 1);
    setHasClaimed(false);
  };

  // Fungsi untuk pembelian tiket (PLAY)
  const handlePlay = async () => {
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setCurrentAddress(userAddress);

      // Konfigurasi kontrak token
      const tokenABI = ["function transfer(address to, uint256 amount) public returns (bool)"];
      const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenABI, signer);
      const amount = ethers.parseUnits(TOKEN_AMOUNT.toString(), 18);

      const tx = await tokenContract.transfer(MAIN_WALLET, amount);
      alert("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      alert("Transaction confirmed! You have joined the draw.");

      // Update state: tambah peserta dan total bet
      setParticipants((prev) => [...prev, userAddress]);
      setTotalBet((prev) => prev + TOKEN_AMOUNT);
    } catch (error) {
      console.error("handlePlay error:", error);
      alert("Transaction failed. Please try again.");
    }
  };

  // Fungsi untuk klaim hadiah (CLAIM PRIZE)
  const handleClaim = async () => {
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const lotteryClaimABI = ["function claimPrize() external"];
      const lotteryClaimContract = new ethers.Contract(LOTTERY_CLAIM_ADDRESS, lotteryClaimABI, signer);
      const tx = await lotteryClaimContract.claimPrize();
      alert("Claim transaction submitted. Waiting for confirmation...");
      await tx.wait();
      alert("Prize claimed successfully!");
      setHasClaimed(true);
    } catch (error) {
      console.error("Claim failed:", error);
      alert("Claim failed. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>SOCIAL DRAW</h1>
      <button className={styles.playButton} onClick={handlePlay}>PLAY</button>
      <div className={styles.infoBox}>
        <p><strong>Total Bet:</strong> {totalBet} tokens</p>
        <p><strong>Current Round:</strong> {round}</p>
      </div>
      {prevWinner && (
        <div className={styles.infoBox}>
          <p><strong>Previous Winner:</strong> {prevWinner}</p>
          <p><strong>Won:</strong> {prevPrize} tokens</p>
        </div>
      )}
      <div className={styles.countdown}>
        <p>Next Draw In:</p>
        <p>{countdown}</p>
      </div>
      {prevWinner &&
        currentAddress.toLowerCase() === prevWinner.toLowerCase() &&
        !hasClaimed && (
          <button className={styles.claimButton} onClick={handleClaim}>
            CLAIM PRIZE
          </button>
        )}
    </div>
  );
}
