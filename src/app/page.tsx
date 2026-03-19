"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinError, setJoinError] = useState("");

  const createGame = async () => {
    setCreating(true);
    try {
      let code = generateCode();
      // Ensure unique code
      let existing = await getDoc(doc(db, "games", code));
      while (existing.exists()) {
        code = generateCode();
        existing = await getDoc(doc(db, "games", code));
      }

      await setDoc(doc(db, "games", code), {
        status: "lobby",
        currentRound: 0,
        totalRounds: 3,
        scenarios: [],
        createdAt: new Date(),
      });

      router.push(`/host/${code}`);
    } catch (err) {
      console.error("Failed to create game:", err);
      setCreating(false);
    }
  };

  const joinGame = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setJoinError("Enter a 4-character code");
      return;
    }
    setJoinError("");

    const gameDoc = await getDoc(doc(db, "games", code));
    if (!gameDoc.exists()) {
      setJoinError("Game not found. Check your code!");
      return;
    }

    router.push(`/play/${code}`);
  };

  return (
    <div className="game-container">
      <div className="screen menu-screen">
        <div className="logo-container">
          <div className="logo-icon">🎯</div>
          <h1 className="logo-title">
            APPROPRIATE
            <span className="logo-or">or</span>
            NOPE<span className="logo-q">?</span>
          </h1>
          <p className="logo-subtitle">
            The workplace scenario game that&apos;s <em>definitely</em> appropriate for work
          </p>
        </div>

        <div className="home-actions">
          <button className="btn-start" onClick={createGame} disabled={creating}>
            <span>{creating ? "CREATING..." : "HOST A GAME"}</span>
            <span className="btn-arrow">→</span>
          </button>

          <div className="join-divider">
            <span className="divider-line" />
            <span className="divider-text">or join one</span>
            <span className="divider-line" />
          </div>

          <form
            className="join-form"
            onSubmit={(e) => {
              e.preventDefault();
              joinGame();
            }}
          >
            <input
              type="text"
              className="code-input"
              placeholder="GAME CODE"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setJoinError("");
              }}
              maxLength={4}
            />
            <button type="submit" className="btn-join" disabled={!joinCode.trim()}>
              JOIN
            </button>
          </form>
          {joinError && <p className="join-error">{joinError}</p>}
        </div>

        <p className="round-info">3 rounds · Multiplayer · Powered by AI</p>
      </div>
    </div>
  );
}
