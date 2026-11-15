import { useState, useEffect } from "react";
import { AVATARS } from "../../utils/constants";
import { Logo } from "../ui/Logo";
import { MiniBoard } from "../ui/MiniBoard";
import { ThemeToggle } from "../ui/ThemeToggle";
import { SettingsPanel } from "../modals/SettingsPanel";
import { CoinHeader } from "../ui/CoinHeader";
import { LuckySpinWheelModal } from "../modals/LuckySpinWheelModal";
import { PassNPlayModal } from "../modals/PassNPlayModal";
import { BoardThemeModal } from "../modals/BoardThemeModal";
import { PlayerProfileModal } from "../modals/PlayerProfileModal";
import { PlayFriendsModal } from "../modals/PlayFriendsModal";
import { PlayComputerModal } from "../modals/PlayComputerModal";
import { SnakeModeModal } from "../modals/SnakeModeModal";
import { getProgression } from "../../utils/progression";
import { playSound } from "../../utils/audio";

export function Landing() {
  const initialCode = new URLSearchParams(window.location.search).get("join") || "";

  // Player Identity
  const [name, setName] = useState(() => sessionStorage.getItem("apna-player") ?? "Player");
  const [avatar, setAvatar] = useState(() => sessionStorage.getItem("apna-avatar") ?? "😀");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);

  // Modals
  const [activeGameTab, setActiveGameTab] = useState<"ludo" | "snake">("ludo");
  const [playFriendsOpen, setPlayFriendsOpen] = useState(Boolean(initialCode));
  const [friendsGameType, setFriendsGameType] = useState<"ludo" | "snake">("ludo");
  const [playComputerOpen, setPlayComputerOpen] = useState(false);
  const [computerGameType, setComputerGameType] = useState<"ludo" | "snake">("ludo");
  const [passNPlayOpen, setPassNPlayOpen] = useState(false);
  const [passNPlayGameType, setPassNPlayGameType] = useState<"ludo" | "snake">("ludo");
  const [snakeModeModalOpen, setSnakeModeModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const progression = getProgression();

  useEffect(() => {
    if (initialCode) {
      setPlayFriendsOpen(true);
    }
  }, [initialCode]);

  const handleNameSave = (newName: string) => {
    const trimmed = newName.trim() || "Player";
    setName(trimmed);
    sessionStorage.setItem("apna-player", trimmed);
  };

  const handleAvatarSelect = (newAvatar: string) => {
    setAvatar(newAvatar);
    sessionStorage.setItem("apna-avatar", newAvatar);
    setShowAvatars(false);
  };

  return (
    <main className="landing">
      {/* Top Navigation */}
      <nav className="landing-nav">
        <Logo />
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#why">Why Apna?</a>
        </div>
        <CoinHeader onOpenBonus={() => setBonusOpen(true)} />
        <ThemeToggle />
        <button
          className="icon-btn"
          onClick={() => setProfileModalOpen(true)}
          title="My Profile"
          aria-label="Profile"
        >
          👤
        </button>
        <button
          className="icon-btn"
          onClick={() => setThemeModalOpen(true)}
          title="Board Themes"
          aria-label="Board Themes"
        >
          🎨
        </button>
        <button
          className="icon-btn"
          onClick={() => setBonusOpen(true)}
          title="Lucky Spin Wheel"
          aria-label="Lucky Spin Wheel"
          style={{ position: "relative" }}
        >
          🎡
          <span className="badge" style={{ background: "#eab308", color: "#000" }}>FREE</span>
        </button>
        <button
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </nav>

      {/* Main Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> The Ultimate Ludo Experience
          </p>
          <h1>
            Game night,<br />
            <em>ghar jaisi.</em>
          </h1>
          <p className="hero-lede">
            Play with friends, challenge players worldwide, or pass the phone around — authentic rules, live voice &amp; quick chat!
          </p>

          <div className="ludo-king-hub">
            {/* Player Profile Quick Banner */}
            <div className="profile-summary-pill" onClick={() => setEditingProfile(!editingProfile)}>
              <div className="profile-pill-avatar">{avatar}</div>
              <div className="profile-pill-info">
                <span className="profile-pill-name">
                  {name} <small style={{ fontSize: "11px", color: "var(--teal)" }}>✏️</small>
                </span>
                <span className="profile-pill-level">
                  Level {progression.level} • {progression.coins.toLocaleString()} 🪙
                </span>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileModalOpen(true);
                }}
                style={{ fontSize: "11px", color: "var(--teal)" }}
              >
                View Stats <span>↗</span>
              </button>
            </div>

            {/* Quick Name / Avatar Edit Drawer */}
            {editingProfile && (
              <div
                style={{
                  background: "var(--panel-bg)",
                  border: "2px solid var(--panel-border)",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <label style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Customize Profile
                </label>
                <div className="name-row">
                  <button
                    type="button"
                    className="avatar-picker"
                    onClick={() => setShowAvatars(!showAvatars)}
                    title="Pick avatar"
                  >
                    {avatar}
                  </button>
                  <input
                    value={name}
                    onChange={(e) => handleNameSave(e.target.value)}
                    placeholder="Enter player name"
                    maxLength={20}
                    autoComplete="nickname"
                  />
                </div>
                {showAvatars && (
                  <div className="avatar-grid" style={{ marginTop: "10px" }}>
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={avatar === a ? "avatar-selected" : ""}
                        onClick={() => handleAvatarSelect(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Game Selector Tabs: Ludo vs Saanp Seedhi */}
            <div className="game-switcher-bar">
              <button
                type="button"
                className={`game-switcher-tab ${activeGameTab === "ludo" ? "tab-active-ludo" : ""}`}
                onClick={() => {
                  playSound("click");
                  setActiveGameTab("ludo");
                }}
              >
                <span className="tab-icon">🎲</span>
                <span className="tab-title">LUDO</span>
                <span className="tab-badge">3 MODES</span>
              </button>
              <button
                type="button"
                className={`game-switcher-tab ${activeGameTab === "snake" ? "tab-active-snake" : ""}`}
                onClick={() => {
                  playSound("click");
                  setActiveGameTab("snake");
                }}
              >
                <span className="tab-icon">🐍</span>
                <span className="tab-title">SAANP SEEDHI</span>
                <span className="tab-badge tab-badge-green">2 MODES</span>
              </button>
            </div>

            {/* LUDO MODES: Play with Friends, Vs Computer, Pass N Play */}
            {activeGameTab === "ludo" && (
              <>
                <div className="game-modes-grid ludo-grid">
                  {/* Card 1: Play With Friends */}
                  <button
                    type="button"
                    className="mode-card mode-card--friends"
                    onClick={() => {
                      setFriendsGameType("ludo");
                      setPlayFriendsOpen(true);
                    }}
                  >
                    <span className="mode-card-badge">ROOM CODE</span>
                    <div className="mode-card-icon-wrap">👥</div>
                    <h3 className="mode-card-title">PLAY WITH FRIENDS</h3>
                    <p className="mode-card-desc">Private Room &amp; Custom Bets</p>
                  </button>

                  {/* Card 2: Vs Computer */}
                  <button
                    type="button"
                    className="mode-card mode-card--computer"
                    onClick={() => {
                      setComputerGameType("ludo");
                      setPlayComputerOpen(true);
                    }}
                  >
                    <span className="mode-card-badge">OFFLINE</span>
                    <div className="mode-card-icon-wrap">🤖</div>
                    <h3 className="mode-card-title">VS COMPUTER</h3>
                    <p className="mode-card-desc">Practice with Smart AI</p>
                  </button>

                  {/* Card 3: Pass N Play (Full Width) */}
                  <button
                    type="button"
                    className="mode-card mode-card--pass"
                    onClick={() => {
                      setPassNPlayGameType("ludo");
                      setPassNPlayOpen(true);
                    }}
                  >
                    <span className="mode-card-badge">SAME DEVICE</span>
                    <div className="mode-card-icon-wrap">📱</div>
                    <div className="mode-card-text">
                      <h3 className="mode-card-title">PASS N PLAY</h3>
                      <p className="mode-card-desc">2–4 Players on One Screen • Local Multiplayer</p>
                    </div>
                  </button>
                </div>

                {/* Quick Switcher Banner to Saanp Seedhi */}
                <div
                  className="game-cross-banner banner-to-snake"
                  onClick={() => {
                    playSound("click");
                    setActiveGameTab("snake");
                  }}
                >
                  <div className="cross-banner-left">
                    <span className="cross-banner-icon">🐍</span>
                    <div>
                      <b>Play Saanp Seedhi (Snakes &amp; Ladders)</b>
                      <p>Classic 100-Tile board with 8 Ladders &amp; 8 Snakes!</p>
                    </div>
                  </div>
                  <span className="cross-banner-btn">Play Saanp Seedhi ➔</span>
                </div>
              </>
            )}

            {/* SAANP SEEDHI MODES: Play vs Bot & Play with Friends (Only 2 options as requested) */}
            {activeGameTab === "snake" && (
              <>
                <div className="game-modes-grid snake-grid">
                  {/* Option 1: Play vs Bot */}
                  <button
                    type="button"
                    className="mode-card mode-card--computer"
                    onClick={() => {
                      setComputerGameType("snake");
                      setPlayComputerOpen(true);
                    }}
                  >
                    <span className="mode-card-badge">OFFLINE BOT</span>
                    <div className="mode-card-icon-wrap">🤖</div>
                    <h3 className="mode-card-title">PLAY VS BOT</h3>
                    <p className="mode-card-desc">Practice on 100-Tile Board with Smart AI</p>
                  </button>

                  {/* Option 2: Play With Friends */}
                  <button
                    type="button"
                    className="mode-card mode-card--friends"
                    onClick={() => {
                      setFriendsGameType("snake");
                      setPlayFriendsOpen(true);
                    }}
                  >
                    <span className="mode-card-badge">ROOM CODE</span>
                    <div className="mode-card-icon-wrap">👥</div>
                    <h3 className="mode-card-title">PLAY WITH FRIENDS</h3>
                    <p className="mode-card-desc">Private Table with Room Code &amp; Bets</p>
                  </button>
                </div>

                {/* Quick Switcher Banner to Ludo */}
                <div
                  className="game-cross-banner banner-to-ludo"
                  onClick={() => {
                    playSound("click");
                    setActiveGameTab("ludo");
                  }}
                >
                  <div className="cross-banner-left">
                    <span className="cross-banner-icon">🎲</span>
                    <div>
                      <b>Play Classic Ludo</b>
                      <p>4 tokens home rush, extra rolls on 6 &amp; knockout thrill!</p>
                    </div>
                  </div>
                  <span className="cross-banner-btn">Play Ludo ➔</span>
                </div>
              </>
            )}
          </div>

          <p className="trust-line" style={{ marginTop: "16px" }}>
            {activeGameTab === "ludo" ? (
              <>
                <span>◆</span> Extra Roll on 6 &amp; Knockout <span>◆</span> Safe Star Cells <span>◆</span> 5 Life Dots System
              </>
            ) : (
              <>
                <span>◆</span> Exact Roll to 100 <span>◆</span> Extra Roll on 6 <span>◆</span> 8 Ladders &amp; 8 Snakes
              </>
            )}
          </p>
        </div>

        {/* Live Board Preview: dynamically switches between Ludo and Snake */}
        <MiniBoard mode={activeGameTab} />
      </section>

      {/* How it Works Section */}
      <section className="how" id="how">
        <p className="section-kicker">Authentic Ludo King Rules</p>
        <h2>
          Classic gameplay.<br />
          Maximum thrill.
        </h2>
        <div className="steps">
          <article>
            <span>1</span>
            <h3>Extra Turns</h3>
            <p>Roll a 6, knockout an opponent token, or bring a token home to earn an instant bonus roll!</p>
          </article>
          <article>
            <span>2</span>
            <h3>8 Safe Zones</h3>
            <p>4 colored starting squares and 4 star-marked ⭐ cells keep your tokens safe from capture.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Quick Rush Mode</h3>
            <p>First player to bring 2 tokens home wins! Perfect for high-stakes, fast-paced matches.</p>
          </article>
          <article>
            <span>4</span>
            <h3>Life Lines</h3>
            <p>Each player gets 5 life dots. Skip a turn — one dot turns red. All 5 gone? You are out.</p>
          </article>
        </div>
      </section>

      {/* Why Apna Ludo */}
      <section className="why" id="why">
        <div>
          <p className="section-kicker">Made for your people</p>
          <h2>
            Distance off.<br />
            <em>Masti on.</em>
          </h2>
        </div>
        <blockquote>
          “The board we grew up with,<br />
          now wherever we are.”
          <cite>— the idea behind Apna Ludo</cite>
        </blockquote>
      </section>

      {/* Footer */}
      <footer>
        <Logo compact />
        <p>Made for long calls, loud laughs, and one more game.</p>
        <small>© 2026 Apna Ludo</small>
      </footer>

      {/* Game Launcher Modals */}
      {playFriendsOpen && (
        <PlayFriendsModal
          isOpen={playFriendsOpen}
          onClose={() => setPlayFriendsOpen(false)}
          onOpenBonus={() => setBonusOpen(true)}
          playerName={name}
          avatar={avatar}
          initialCode={initialCode}
          defaultGameType={friendsGameType}
        />
      )}

      {playComputerOpen && (
        <PlayComputerModal
          isOpen={playComputerOpen}
          onClose={() => setPlayComputerOpen(false)}
          onOpenBonus={() => setBonusOpen(true)}
          playerName={name}
          avatar={avatar}
          defaultGameType={computerGameType}
        />
      )}

      {passNPlayOpen && (
        <PassNPlayModal
          isOpen={passNPlayOpen}
          onClose={() => setPassNPlayOpen(false)}
          defaultGameType={passNPlayGameType}
        />
      )}

      {snakeModeModalOpen && (
        <SnakeModeModal
          isOpen={snakeModeModalOpen}
          onClose={() => setSnakeModeModalOpen(false)}
          onSelectVsComputer={() => {
            setSnakeModeModalOpen(false);
            setComputerGameType("snake");
            setPlayComputerOpen(true);
          }}
          onSelectPlayWithFriends={() => {
            setSnakeModeModalOpen(false);
            setFriendsGameType("snake");
            setPlayFriendsOpen(true);
          }}
          onSelectPassNPlay={() => {
            setSnakeModeModalOpen(false);
            setPassNPlayGameType("snake");
            setPassNPlayOpen(true);
          }}
        />
      )}

      {/* Utility Modals */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {bonusOpen && <LuckySpinWheelModal isOpen={bonusOpen} onClose={() => setBonusOpen(false)} />}
      {themeModalOpen && <BoardThemeModal isOpen={themeModalOpen} onClose={() => setThemeModalOpen(false)} />}
      {profileModalOpen && (
        <PlayerProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          playerName={name}
          avatar={avatar}
        />
      )}
    </main>
  );
}
