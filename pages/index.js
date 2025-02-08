// pages/index.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [participants, setParticipants] = useState([]);
  const [totalBet, setTotalBet] = useState(0);
  const [round, setRound] = useState(1);
  const [prevWinner, setPrevWinner] = useState(null);
  const [prevPrize, setPrevPrize] = useState(0);
  const [countdown, setCountdown] = useState("");

  const TOKEN_AMOUNT = 500; // Setiap tiket berharga 500 token

  // Fungsi untuk menghitung sisa waktu sampai awal jam berikutnya
  const calculateCountdown = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(60, 0, 0); // set ke awal jam berikutnya
    return nextHour - now;
  };

  // Update countdown setiap detik
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = calculateCountdown();
      if (diff <= 0) {
        // Ketika waktu habis, jalankan draw otomatis
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

  // Fungsi untuk memanggil API endpoint runDraw
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
  };

  // Fungsi untuk menangani klik tombol "PLAY"
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

      // Konfigurasi token contract
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

      // Hitung jumlah token (500 token, asumsikan 18 desimal)
      const amount = ethers.parseUnits(TOKEN_AMOUNT.toString(), 18);

      // Transfer token dari wallet pemain ke main wallet
      const tx = await tokenContract.transfer(MAIN_WALLET, amount);
      alert("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      alert("Transaction confirmed! You have joined the draw.");

      // Update data peserta dan total taruhan
      setParticipants((prev) => [...prev, userAddress]);
      setTotalBet((prev) => prev + TOKEN_AMOUNT);
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
