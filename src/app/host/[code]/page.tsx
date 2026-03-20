"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";

type Verdict = "appropriate" | "nope" | "gray_area";

interface Scenario {
  scenario: string;
  verdict: Verdict;
  explanation: string;
}

interface GameData {
  status: "lobby" | "active" | "reveal" | "gameover";
  currentRound: number;
  totalRounds: number;
  scenarios: Scenario[];
}

interface Player {
  id: string;
  name: string;
  score: number;
  votes: Record<number, "appropriate" | "nope">;
}

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [generating, setGenerating] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<
    { id: number; x: number; color: string; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    const origin = window.location.origin;
    setJoinUrl(`${origin}/play/${code}`);
  }, [code]);

  // Listen to game doc
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "games", code), (snap) => {
      if (snap.exists()) {
        setGame(snap.data() as GameData);
      }
    });
    return () => unsub();
  }, [code]);

  // Listen to players
  useEffect(() => {
    const q = query(
      collection(db, "games", code, "players"),
      orderBy("joinedAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Player[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Player[];
      setPlayers(list);
    });
    return () => unsub();
  }, [code]);

  // Confetti effect
  useEffect(() => {
    if (showConfetti) {
      const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#FB923C"][
          Math.floor(Math.random() * 5)
        ],
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 4,
      }));
      setConfettiParticles(particles);
    }
  }, [showConfetti]);

  const generateAndStartRound = useCallback(async () => {
    if (!game) return;
    setGenerating(true);
    try {
      const previousScenarios = game.scenarios.map((s) => s.scenario);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previousScenarios }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const scenario: Scenario = await res.json();

      await updateDoc(doc(db, "games", code), {
        status: "active",
        currentRound: game.scenarios.length,
        scenarios: [...game.scenarios, scenario],
      });
    } catch (err) {
      console.error("Error generating scenario:", err);
    }
    setGenerating(false);
  }, [game, code]);

  const revealAnswers = async () => {
    await updateDoc(doc(db, "games", code), { status: "reveal" });
  };

  const nextRound = async () => {
    if (!game) return;
    if (game.scenarios.length >= game.totalRounds) {
      // Game over
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      await updateDoc(doc(db, "games", code), { status: "gameover" });
    } else {
      generateAndStartRound();
    }
  };

  const startGame = () => {
    generateAndStartRound();
  };

  const resetGame = async () => {
    await updateDoc(doc(db, "games", code), {
      status: "lobby",
      currentRound: 0,
      scenarios: [],
    });
    // Reset player scores (we'd need to update each player doc)
    for (const p of players) {
      await updateDoc(doc(db, "games", code, "players", p.id), {
        score: 0,
        votes: {},
      });
    }
  };

  if (!game) {
    return (
      <div className="game-container">
        <div className="screen loading-screen">
          <div className="loader-ring">
            <div className="loader-emoji">📋</div>
          </div>
          <p className="loading-text">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentScenario = game.scenarios[game.currentRound];
  const totalVoted = players.filter(
    (p) => p.votes && p.votes[game.currentRound] !== undefined
  ).length;

  const sortedPlayers = [...players].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  return (
    <div className="game-container">
      {showConfetti && (
        <div className="confetti-container">
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              className="confetti-particle"
              style={{
                left: `${p.x}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size * 1.5}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* LOBBY */}
      {game.status === "lobby" && (
        <div className="screen lobby-screen">
          <div className="logo-container">
            <div className="logo-icon">📋</div>
            <h1 className="logo-title" style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}>
              APPROPRIATE
              <span className="logo-or">or</span>
              NOPE<span className="logo-q">?</span>
            </h1>
          </div>

          <div className="lobby-code-section">
            <p className="lobby-code-label">JOIN CODE</p>
            <div className="lobby-code">{code}</div>
          </div>

          {joinUrl && (
            <div className="qr-section">
              <p className="qr-label">Scan to join!</p>
              <div className="qr-code-wrapper">
                <QRCodeSVG
                  value={joinUrl}
                  size={200}
                  bgColor="transparent"
                  fgColor="#FFFFFE"
                  level="M"
                />
              </div>
            </div>
          )}

          <div className="lobby-players">
            <h3 className="lobby-players-title">
              Players ({players.length})
            </h3>
            {players.length === 0 ? (
              <p className="lobby-waiting">Waiting for players to join...</p>
            ) : (
              <div className="player-chips">
                {players.map((p) => (
                  <div key={p.id} className="player-chip">
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-start"
            onClick={startGame}
            disabled={players.length === 0 || generating}
          >
            <span>{generating ? "STARTING..." : "START GAME"}</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      )}

      {/* ACTIVE ROUND */}
      {game.status === "active" && currentScenario && (
        <div className="screen voting-screen">
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">Round</span>
              <span className="hud-value">
                {game.currentRound + 1}/{game.totalRounds}
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Players</span>
              <span className="hud-value">{players.length}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Voted</span>
              <span className="hud-value">
                {totalVoted}/{players.length}
              </span>
            </div>
          </div>

          <div className="scenario-card">
            <div className="scenario-tag">THE SCENARIO</div>
            <p className="scenario-text">{currentScenario.scenario}</p>
          </div>

          <div className="host-vote-status">
            <p className="vote-status-text">
              {totalVoted === players.length
                ? "Everyone has voted!"
                : `Waiting for votes... (${totalVoted}/${players.length})`}
            </p>
            <div className="vote-dots">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`vote-dot ${p.votes?.[game.currentRound] !== undefined ? "voted" : "waiting"}`}
                  title={p.name}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn-start"
            onClick={revealAnswers}
            disabled={totalVoted === 0}
          >
            <span>REVEAL ANSWERS</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      )}

      {/* REVEAL */}
      {game.status === "reveal" && currentScenario && (
        <div className="screen reveal-screen">
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">Round</span>
              <span className="hud-value">
                {game.currentRound + 1}/{game.totalRounds}
              </span>
            </div>
          </div>

          <div className="reveal-card">
            <p className="reveal-scenario">
              &ldquo;{currentScenario.scenario}&rdquo;
            </p>
            <div
              className={`verdict-badge verdict-${currentScenario.verdict}`}
            >
              {currentScenario.verdict === "appropriate"
                ? "✅ APPROPRIATE"
                : currentScenario.verdict === "nope"
                  ? "🚫 NOPE!"
                  : "🤷 GRAY AREA"}
            </div>
            <p className="explanation">{currentScenario.explanation}</p>
          </div>

          <div className="answers-breakdown">
            <h3 className="breakdown-title">How Everyone Voted</h3>
            <div className="breakdown-list">
              {players.map((p) => {
                const vote = p.votes?.[game.currentRound];
                const isGray = currentScenario.verdict === "gray_area";
                const isCorrect = isGray
                  ? true
                  : vote === currentScenario.verdict;
                return (
                  <div
                    key={p.id}
                    className={`breakdown-row ${!vote ? "no-vote" : isCorrect ? "correct" : "wrong"}`}
                  >
                    <span className="breakdown-name">{p.name}</span>
                    <span className="breakdown-vote">
                      {!vote
                        ? "🤐 No vote"
                        : vote === "appropriate"
                          ? "✅ Appropriate"
                          : "🚫 Nope"}
                    </span>
                    <span className="breakdown-result">
                      {!vote ? "—" : isCorrect ? "✅" : "❌"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="btn-start" onClick={nextRound}>
            <span>
              {game.scenarios.length >= game.totalRounds
                ? "FINAL RESULTS"
                : "NEXT ROUND"}
            </span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      )}

      {/* GAME OVER */}
      {game.status === "gameover" && (
        <div className="screen gameover-screen">
          <div className="gameover-header">
            <span className="gameover-emoji">🏆</span>
            <h2 className="leaderboard-title">FINAL STANDINGS</h2>
          </div>

          <div className="leaderboard-list">
            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`leaderboard-row ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}`}
              >
                <span className="lb-rank">
                  {i === 0
                    ? "🥇"
                    : i === 1
                      ? "🥈"
                      : i === 2
                        ? "🥉"
                        : `#${i + 1}`}
                </span>
                <span className="lb-name">{p.name}</span>
                <span className="lb-score">
                  {p.score || 0}/{game.totalRounds}
                </span>
                <span className="lb-grade">
                  {(() => {
                    const pct = ((p.score || 0) / game.totalRounds) * 100;
                    if (pct >= 100) return "S";
                    if (pct >= 67) return "A";
                    if (pct >= 34) return "B";
                    return "C";
                  })()}
                </span>
              </div>
            ))}
          </div>

          <div className="gameover-buttons">
            <button className="btn-start" onClick={resetGame}>
              <span>PLAY AGAIN</span>
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* GENERATING OVERLAY */}
      {generating && game.status !== "lobby" && (
        <div className="generating-overlay">
          <div className="loader-ring">
            <div className="loader-emoji">🎲</div>
          </div>
          <p className="loading-text">Filing a Form 471 for chaos...</p>
        </div>
      )}
    </div>
  );
}
