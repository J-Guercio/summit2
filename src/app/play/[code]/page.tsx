"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
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

function getPlayerId(): string {
  const key = "aon-player-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [playerState, setPlayerState] = useState<"join" | "playing">("join");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [game, setGame] = useState<GameData | null>(null);
  const [myData, setMyData] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [voting, setVoting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<
    { id: number; x: number; color: string; delay: number; size: number }[]
  >([]);

  // Get/create player ID
  useEffect(() => {
    setPlayerId(getPlayerId());
  }, []);

  // Listen to game doc
  useEffect(() => {
    if (!code) return;
    const unsub = onSnapshot(doc(db, "games", code), (snap) => {
      if (snap.exists()) {
        setGame(snap.data() as GameData);
      }
    });
    return () => unsub();
  }, [code]);

  // Listen to my player doc
  useEffect(() => {
    if (!code || !playerId || playerState !== "playing") return;
    const unsub = onSnapshot(
      doc(db, "games", code, "players", playerId),
      (snap) => {
        if (snap.exists()) {
          setMyData({ id: snap.id, ...snap.data() } as Player);
        }
      }
    );
    return () => unsub();
  }, [code, playerId, playerState]);

  // Listen to all players (for gameover leaderboard)
  useEffect(() => {
    if (!code) return;
    const q = query(
      collection(db, "games", code, "players"),
      orderBy("joinedAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPlayers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Player[]
      );
    });
    return () => unsub();
  }, [code]);

  // Confetti effect
  useEffect(() => {
    if (showConfetti) {
      setConfettiParticles(
        Array.from({ length: 40 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#FB923C"][
            Math.floor(Math.random() * 5)
          ],
          delay: Math.random() * 0.5,
          size: Math.random() * 8 + 4,
        }))
      );
    }
  }, [showConfetti]);

  // Auto-rejoin if player doc exists (page refresh)
  useEffect(() => {
    if (!playerId || !code || playerState !== "join") return;
    const checkExisting = async () => {
      const unsub = onSnapshot(
        doc(db, "games", code, "players", playerId),
        (snap) => {
          if (snap.exists()) {
            setPlayerName(snap.data().name);
            setPlayerState("playing");
          }
          unsub();
        }
      );
    };
    checkExisting();
  }, [playerId, code, playerState]);

  const joinGame = async () => {
    if (!playerName.trim() || !playerId) return;
    await setDoc(doc(db, "games", code, "players", playerId), {
      name: playerName.trim(),
      score: 0,
      votes: {},
      joinedAt: new Date(),
    });
    setPlayerState("playing");
  };

  const castVote = async (vote: "appropriate" | "nope") => {
    if (!game || !myData || voting) return;
    setVoting(true);

    const roundIdx = game.currentRound;
    const scenario = game.scenarios[roundIdx];
    const isGray = scenario.verdict === "gray_area";
    const isCorrect = isGray ? true : vote === scenario.verdict;

    const newVotes = { ...myData.votes, [roundIdx]: vote };
    const newScore = (myData.score || 0) + (isCorrect ? 1 : 0);

    await updateDoc(doc(db, "games", code, "players", playerId), {
      votes: newVotes,
      score: newScore,
    });
    setVoting(false);
  };

  if (!game) {
    return (
      <div className="game-container">
        <div className="screen loading-screen">
          <div className="loader-ring">
            <div className="loader-emoji">🎯</div>
          </div>
          <p className="loading-text">Connecting to game...</p>
        </div>
      </div>
    );
  }

  const currentScenario = game.scenarios[game.currentRound];
  const myVoteThisRound = myData?.votes?.[game.currentRound];
  const hasVoted = myVoteThisRound !== undefined;

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

      {/* JOIN SCREEN */}
      {playerState === "join" && (
        <div className="screen name-screen">
          <div className="name-header">
            <span className="name-emoji">🎯</span>
            <h2 className="name-title">Join Game</h2>
            <p className="name-subtitle">Game code: <strong className="game-code-inline">{code}</strong></p>
          </div>
          <form
            className="name-form"
            onSubmit={(e) => {
              e.preventDefault();
              joinGame();
            }}
          >
            <input
              type="text"
              className="name-input"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={24}
              autoFocus
            />
            <button
              type="submit"
              className="btn-start"
              disabled={!playerName.trim()}
            >
              <span>JOIN</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>
        </div>
      )}

      {/* WAITING IN LOBBY */}
      {playerState === "playing" && game.status === "lobby" && (
        <div className="screen player-wait-screen">
          <div className="wait-icon">⏳</div>
          <h2 className="wait-title">You&apos;re in, {myData?.name || playerName}!</h2>
          <p className="wait-text">Waiting for the host to start the game...</p>
          <div className="player-chips">
            {players.map((p) => (
              <div
                key={p.id}
                className={`player-chip ${p.id === playerId ? "you" : ""}`}
              >
                {p.name} {p.id === playerId && "⭐"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VOTING */}
      {playerState === "playing" && game.status === "active" && currentScenario && (
        <div className="screen voting-screen">
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">Round</span>
              <span className="hud-value">
                {game.currentRound + 1}/{game.totalRounds}
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Score</span>
              <span className="hud-value">{myData?.score || 0}</span>
            </div>
          </div>

          {!hasVoted ? (
            <>
              <div className="scenario-card">
                <div className="scenario-tag">THE SCENARIO</div>
                <p className="scenario-text">{currentScenario.scenario}</p>
              </div>
              <div className="vote-buttons">
                <button
                  className="btn-vote btn-appropriate"
                  onClick={() => castVote("appropriate")}
                  disabled={voting}
                >
                  <span className="vote-emoji">✅</span>
                  <span className="vote-label">Appropriate</span>
                </button>
                <button
                  className="btn-vote btn-nope"
                  onClick={() => castVote("nope")}
                  disabled={voting}
                >
                  <span className="vote-emoji">🚫</span>
                  <span className="vote-label">Nope!</span>
                </button>
              </div>
            </>
          ) : (
            <div className="player-voted-card">
              <span className="voted-emoji">📨</span>
              <h3 className="voted-title">Vote locked in!</h3>
              <p className="voted-subtitle">
                You said:{" "}
                <strong>
                  {myVoteThisRound === "appropriate"
                    ? "✅ Appropriate"
                    : "🚫 Nope"}
                </strong>
              </p>
              <p className="voted-waiting">Waiting for the host to reveal...</p>
            </div>
          )}
        </div>
      )}

      {/* REVEAL */}
      {playerState === "playing" && game.status === "reveal" && currentScenario && (
        <div className="screen reveal-screen">
          <div className="result-message">
            <span className="result-emoji">
              {!myVoteThisRound
                ? "🤐"
                : currentScenario.verdict === "gray_area"
                  ? "🤷"
                  : myVoteThisRound === currentScenario.verdict
                    ? "🎉"
                    : "😬"}
            </span>
            <span className="result-text">
              {!myVoteThisRound
                ? "You didn't vote!"
                : currentScenario.verdict === "gray_area"
                  ? "Gray area — everyone gets a point!"
                  : myVoteThisRound === currentScenario.verdict
                    ? "You nailed it!"
                    : "Not quite!"}
            </span>
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

          <div className="player-score-card">
            <span className="score-label">Your Score</span>
            <span className="score-big">{myData?.score || 0}/{game.currentRound + 1}</span>
          </div>

          <p className="wait-text">Waiting for the next round...</p>
        </div>
      )}

      {/* GAME OVER */}
      {playerState === "playing" && game.status === "gameover" && (
        <div className="screen gameover-screen">
          <div className="gameover-header">
            <span className="gameover-emoji">🏆</span>
            <h2 className="leaderboard-title">FINAL STANDINGS</h2>
          </div>

          {myData && (
            <div className="your-final-score">
              <p className="your-score-label">{myData.name}</p>
              <div className="grade-badge">
                {(() => {
                  const pct = ((myData.score || 0) / game.totalRounds) * 100;
                  if (pct >= 100) return "S";
                  if (pct >= 67) return "A";
                  if (pct >= 34) return "B";
                  return "C";
                })()}
              </div>
              <h2 className="final-score">{myData.score || 0} / {game.totalRounds}</h2>
            </div>
          )}

          <div className="leaderboard-list">
            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`leaderboard-row ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""} ${p.id === playerId ? "highlight-you" : ""}`}
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
                <span className="lb-name">
                  {p.name} {p.id === playerId && <span className="you-tag">YOU</span>}
                </span>
                <span className="lb-score">
                  {p.score || 0}/{game.totalRounds}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
