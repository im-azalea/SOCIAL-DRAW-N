
// pages/index.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "../styles/Home.module.css";

export default function Home() {
  // State untuk menyimpan peserta, total bet, ronde, dan info pemenang sebelumnya
  const [participants, setParticipants] = useState([]);
  const [totalBet, setTotalBet] = useState(0); // total token terkumpul (setiap peserta bayar 500 token)
  const [round, setRound] = useState(1);
  const [prevWinner, setPrevWinner] = useState(null);
  const [prevPrize, setPrevPrize] = useState(0);
  const [countdown, setCountdown] = useState("");

  // Konstanta
  const MAIN_WALLET = "0x09afd8049c4a0eE208105f806195A5b52F1EC950";
  const TOKEN_CONTRACT_ADDRESS = "0x2ED49c7CfD45018a80651C0D5637a5D42a6948cb";
  // Minimal ABI untuk ERC20 transfer
  const tokenABI = [
    "function transfer(address to, uint256 amount) public returns (bool)"
  ];

  // Fungsi untuk menghitung sisa waktu hingga jam berikutnya (draw otomatis tiap 1 jam)
  const calculateCountdown = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(60, 0, 0); // set ke awal jam berikutnya
    const diff = nextHour - now;
    return diff;
  };

  // Update countdown setiap detik
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = calculateCountdown();
      if (diff <= 0) {
        // Waktu habis, jalankan draw
        runDraw();
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

  // Fungsi untuk menjalankan proses draw otomatis
  const runDraw = () => {
    if (participants.length > 0) {
      // Pilih pemenang secara acak
      const winnerIndex = Math.floor(Math.random() * participants.length);
      const winnerAddress = participants[winnerIndex];
      // Hitung hadiah: 95% dari total bet (setiap peserta membayar 500 token)
      const totalTokens = participants.length * 500;
      const prize = totalTokens * 0.95;
      setPrevWinner(winnerAddress);
      setPrevPrize(prize);
      alert(`Draw complete! Winner is ${winnerAddress}\nPrize: ${prize} tokens`);
    } else {
      alert("No participants this round.");
    }
    // Reset state untuk ronde baru
    setParticipants([]);
    setTotalBet(0);
    setRound((prev) => prev + 1);
  };

  // Fungsi untuk menangani klik tombol "Play"
  const handlePlay = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed!");
        return;
      }
      // Minta koneksi wallet
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Instansiasi contract token menggunakan ethers.js
      const tokenContract = new ethers.Contract(
        TOKEN_CONTRACT_ADDRESS,
        tokenABI,
        signer
      );

      // Hitung jumlah token: 500 token dengan asumsi 18 desimal
      const amount = ethers.parseUnits("500", 18);

      // Kirim transaksi transfer token ke wallet utama
      const tx = await tokenContract.transfer(MAIN_WALLET, amount);
      alert("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      alert("Transaction confirmed! You have joined the draw.");

      // Update state: tambahkan peserta dan total bet
      setParticipants((prev) => [...prev, userAddress]);
      setTotalBet((prev) => prev + 500);
    } catch (error) {
      console.error(error);
      alert("Transaction failed. Please try again.");
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
    </div>
  );
}
