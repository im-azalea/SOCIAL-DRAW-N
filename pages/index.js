// pages/index.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import styles from "../styles/Home.module.css";

export default function Home() {
  // State untuk menyimpan data
  const [participants, setParticipants] = useState([]);
  const [totalBet, setTotalBet] = useState(0);
  const [round, setRound] = useState(1);
  const [prevWinner, setPrevWinner] = useState(null);
  const [prevPrize, setPrevPrize] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [hasClaimed, setHasClaimed] = useState(false);

  const TOKEN_AMOUNT = 10; // Untuk testing, tiket seharga 10 token

  // Untuk Coinbase Wallet fallback
  // Anda bisa mengatur nilai default RPC dan chain ID (misalnya, Base Mainnet chain id 8453)
  const APP_NAME = "Social Draw";
  const APP_LOGO_URL = "https://social-draw-1.vercel.app/favicon.ico";
  const DEFAULT_ETH_JSONRPC_URL =
    process.env.NEXT_PUBLIC_RPC_URL || "https://YOUR_BASE_RPC_URL_HERE";
  const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 8453;

  // Fungsi menghitung waktu mundur ke awal jam berikutnya
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

  // Fungsi untuk memanggil API draw
  const handleDraw = async () => {
    if (participants.length === 0) {
      alert("No participants in this round.");
      setRound((prev) => prev + 1);
      return;
    }
    try {
      const response = await fetch("/api/runDraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          participants: participants,
          totalBet: totalBet
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPrevWinner(data.winner);
        setPrevPrize(data.prize);
        alert(
          `Draw complete!\nWinner: ${data.winner}\nPrize: ${data.prize} tokens`
        );
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

  // Fungsi untuk menangani pembelian tiket (PLAY) dengan dukungan mobile wallet (prioritas Coinbase)
  const handlePlay = async () => {
    try {
      let provider;
      // Cek apakah window.ethereum tersedia (desktop atau beberapa mobile wallet)
      if (typeof window.ethereum !== "undefined") {
        // Gunakan provider dari window.ethereum
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // Jika window.ethereum tidak ada, gunakan Coinbase Wallet SDK
        const coinbaseWallet = new CoinbaseWalletSDK({
          appName: APP_NAME,
          appLogoUrl: APP_LOGO_URL,
          darkMode: false
        });
        // Buat provider menggunakan Coinbase Wallet dengan RPC dan chain ID yang telah ditentukan
        const ethereum = coinbaseWallet.makeWeb3Provider(
          DEFAULT_ETH_JSONRPC_URL,
          CHAIN_ID
        );
        provider = new ethers.BrowserProvider(ethereum);
        // Minta koneksi (Coinbase Wallet akan menampilkan tampilan koneksi)
        // Catatan: Coinbase Wallet SDK biasanya memunculkan pop-up untuk koneksi
        // Jangan lupa untuk mengecek apakah koneksi berhasil
      }

      // Dapatkan signer dan alamat wallet pemain
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setCurrentAddress(userAddress);

      // Konfigurasi token contract (pastikan alamat kontrak sesuai dengan jaringan Base)
      const TOKEN_CONTRACT_ADDRESS =
        "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
      const MAIN_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
      const tokenABI = [
        "function transfer(address to, uint256 amount) public returns (bool)"
      ];
      const tokenContract = new ethers.Contract(
        TOKEN_CONTRACT_ADDRESS,
        tokenABI,
        signer
      );

      // Hitung jumlah token (10 token, asumsikan 18 desimal)
      const amount = ethers.parseUnits(TOKEN_AMOUNT.toString(), 18);

      const tx = await tokenContract.transfer(MAIN_WALLET, amount);
      alert("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      alert("Transaction confirmed! You have joined the draw.");

      // Update state peserta dan total taruhan
      setParticipants((prev) => [...prev, userAddress]);
      setTotalBet((prev) => prev + TOKEN_AMOUNT);
    } catch (error) {
      console.error(error);
      alert("Transaction failed. Please try again.");
    }
  };

  // Fungsi untuk menangani klaim hadiah oleh pemenang
  const handleClaim = async () => {
    try {
      let provider;
      if (typeof window.ethereum !== "undefined") {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        const coinbaseWallet = new CoinbaseWalletSDK({
          appName: APP_NAME,
          appLogoUrl: APP_LOGO_URL,
          darkMode: false
        });
        const ethereum = coinbaseWallet.makeWeb3Provider(
          DEFAULT_ETH_JSONRPC_URL,
          CHAIN_ID
        );
        provider = new ethers.BrowserProvider(ethereum);
      }
      const signer = await provider.getSigner();

      // Konfigurasi LotteryClaim contract (alamat diambil dari environment variable publik)
      const LOTTERY_CLAIM_ADDRESS = process.env.NEXT_PUBLIC_LOTTERY_CLAIM_ADDRESS;
      const lotteryClaimABI = [
        "function claimPrize() external"
      ];
      const lotteryClaimContract = new ethers.Contract(
        LOTTERY_CLAIM_ADDRESS,
        lotteryClaimABI,
        signer
      );

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
      <button className={styles.playButton} onClick={handlePlay}>
        PLAY
      </button>
      <div className={styles.infoBox}>
        <p>
          <strong>Total Bet:</strong> {totalBet} tokens
        </p>
        <p>
          <strong>Current Round:</strong> {round}
        </p>
      </div>
      {prevWinner && (
        <div className={styles.infoBox}>
          <p>
            <strong>Previous Winner:</strong> {prevWinner}
          </p>
          <p>
            <strong>Won:</strong> {prevPrize} tokens
          </p>
        </div>
      )}
      <div className={styles.countdown}>
        <p>Next Draw In:</p>
        <p>{countdown}</p>
      </div>
      {/* Tampilkan tombol Claim jika wallet yang terhubung adalah pemenang dan belum klaim */}
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
