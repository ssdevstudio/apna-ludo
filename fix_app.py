#!/usr/bin/env python3
"""Apply all App.tsx fixes programmatically."""
import re, pathlib, sys

p = pathlib.Path(r'C:\Users\Sumit Kumar\Desktop\Apps\Claude Code\Test\Game\Apana Ludo\client\src\App.tsx')
s = p.read_text(encoding='utf-8')
orig = s

# 1. Import additions
s = s.replace(
    'import { FormEvent, useEffect, useMemo, useRef, useState, useCallback } from "react";',
    'import { FormEvent, useEffect, useMemo, useReducer, useRef, useState, useCallback } from "react";'
)
s = s.replace(
    'import { Route, Routes, useNavigate, useParams } from "react-router-dom";',
    'import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";'
)

# 2. Keyboard shortcut fix
s = s.replace(
    'document.querySelector(".roll-button:not(:disabled)")?.click()',
    'document.querySelector("button.corner-roll-btn:not(:disabled)")?.click()'
)

# 3. Add forceUpdate to Landing
s = s.replace(
    'const [name, setName] = useState(() => storedName);',
    'const [name, setName] = useState(() => storedName);\n  const [, forceUpdate] = useReducer(x => x + 1, 0);'
)

# 4. Add forceUpdate to Room
s = s.replace(
    'const [showChat, setShowChat] = useState(false);',
    'const [showChat, setShowChat] = useState(false);\n  const [, forceUpdate] = useReducer(x => x + 1, 0);'
)

# 5. Fix SettingsPanel lang reactivity
s = s.replace(
    '  const toggleLang = () => {\n    const newLang = lang.current === "en" ? "hi" : "en";\n    lang.current = newLang;\n    localStorage.setItem("apna-lang", newLang);\n  };',
    '  const toggleLang = () => {\n    const newLang = lang.current === "en" ? "hi" : "en";\n    lang.current = newLang;\n    localStorage.setItem("apna-lang", newLang);\n    forceUpdate();\n  };'
)

# 6. PlayerId ref for stale closure fix
s = s.replace(
    'const [lastRolls, setLastRolls] = useState<Record<string, number>>({});',
    'const [lastRolls, setLastRolls] = useState<Record<string, number>>({});\n  const playerIdRef = useRef(playerId);\n  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);\n  const animTimeoutRef = useRef<ReturnType<typeof setTimeout>>();\n  const autoMoveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();\n  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();'
)

# 7. Use playerIdRef inside snapshot handler
s = s.replace(
    'const iWon = snapshot.game?.currentPlayerId === playerId;',
    'const iWon = snapshot.game?.currentPlayerId === playerIdRef.current;'
)
s = s.replace(
    'if (snapshot.game?.currentPlayerId === playerId) {',
    'if (snapshot.game?.currentPlayerId === playerIdRef.current) {'
)
s = s.replace(
    'const myTurn = snapshot.game?.currentPlayerId === playerId;',
    'const myTurn = snapshot.game?.currentPlayerId === playerIdRef.current;'
)

# 8. copyInvite cleanup
s = s.replace(
    '  const copyInvite = () => {\n    navigator.clipboard.writeText(inviteLink);\n    setCopied(true);\n    setTimeout(() => setCopied(false), 1800);\n  };',
    '  const copyInvite = () => {\n    navigator.clipboard.writeText(inviteLink);\n    setCopied(true);\n    copyTimeoutRef.current = setTimeout(() => setCopied(false), 1800);\n  };'
)

# 9. Socket cleanup: assign timers to refs
s = s.replace(
    'const animTimer = setTimeout(() => {',
    'animTimeoutRef.current = setTimeout(() => {'
)
s = s.replace(
    'const autoMoveTimer = setTimeout(() => {',
    'autoMoveTimeoutRef.current = setTimeout(() => {'
)

# 10. Add cleanup in socket effect cleanup
s = s.replace(
    '    return () => {\n      socket.off("connect", handleConnect);\n      socket.off("connect_error", handleConnectError);\n    };\n  }, []);',
    '    return () => {\n      socket.off("connect", handleConnect);\n      socket.off("connect_error", handleConnectError);\n      clearTimeout(animTimeoutRef.current);\n      clearTimeout(autoMoveTimeoutRef.current);\n      clearTimeout(copyTimeoutRef.current);\n    };\n  }, []);'
)

# 11. LudoBoard effect stable dependency
s = s.replace(
    '  useEffect(() => {\n    if (!tokensToAnimate.length) return;\n    if (instantChange) {',
    '  const tokenPositionsKey = game ? game.players.map(p => p.tokens.map(t => t.progress).join(",")).join("|") : "";\n  useEffect(() => {\n    if (!tokensToAnimate.length) return;\n    if (instantChange) {'
)
s = s.replace(
    '    },[game]);',
    '    },[tokenPositionsKey]);'
)
# Also fix: '  },[game]);' with possible space variant
s = s.replace('  },[game]);', '  },[tokenPositionsKey]);')

# 12. previewData type fix
s = s.replace(
    'const previewData = await r.json() as any;',
    'const previewData: { playerCount: number; maxPlayers: number; usedColors: string[]; phase: string } = await r.json();'
)

# 13. Claim fetch catch
s = s.replace(
    '.catch(() => {})',
    '.catch((err) => { console.error("Claim failed:", err); navigate("/"); })'
)

# 14. Close button aria-label
s = s.replace(
    'className="close-button">x</button>',
    'className="close-button" aria-label="Close">x</button>'
)

# 15. Color picker aria-labels
s = s.replace(
    'onClick={() => setColor("red")}',
    'onClick={() => setColor("red")} aria-label="Select red color"'
)
s = s.replace(
    'onClick={() => setColor("blue")}',
    'onClick={() => setColor("blue")} aria-label="Select blue color"'
)
s = s.replace(
    'onClick={() => setColor("green")}',
    'onClick={() => setColor("green")} aria-label="Select green color"'
)
s = s.replace(
    'onClick={() => setColor("yellow")}',
    'onClick={() => setColor("yellow")} aria-label="Select yellow color"'
)

# 16. Logo href -> Link (handle JSX close properly)
s = s.replace(
    '<a href="/" className="logo">',
    '<Link to="/" className="logo">'
)
s = s.replace(
    '</a>\n      </div>\n    </div>\n  );\n}\n\nfunction Room',
    '</Link>\n      </div>\n    </div>\n  );\n}\n\nfunction Room'
)

# 17. useSearchParams
s = s.replace(
    '  const urlParams = new URLSearchParams(window.location.search);\n  const initialCode = urlParams.get("code") || "";',
    '  const [searchParams] = useSearchParams();\n  const initialCode = searchParams.get("code") || "";'
)

# 18. lastRolls reset on game start
s = s.replace(
    '    if (snapshot.phase === "playing" && snapshot.game && !prevPhase) {',
    '    if (snapshot.phase === "playing" && snapshot.game && !prevPhase) {\n      setLastRolls({});'
)

# 19. Remove unused STORED_AVATAR
s = s.replace(
    'const STORED_AVATAR = localStorage.getItem("apna-avatar") || "😀";\n', ''
)

# 20. Remove empty fragments
s = s.replace('<>\n      </>\n', '')
s = s.replace('<>\n    </>\n', '')

# 21. Add useCallback wrappers for game action functions
# Pattern: find "const fnName = (async) (args) => {" and wrap in useCallback
# We use a multi-pass approach with regex
replacements = {}
for fn in ['rollDice', 'moveToken', 'toggleReady', 'startGame', 'sendChat', 'leaveRoom', 'rematchRoom']:
    # Match: const fnName = (params) => {
    # Or: const fnName = async (params) => {
    pat = re.compile(
        rf'(const {re.escape(fn)}\s*=\s*(async\s+)?)(\([^)]*\)\s*=>\s*\{{)'
    )
    # useCallback wrap needs to find the matching closing }) for each function.
    # Since useCallback takes the function as first arg and deps as second,
    # we replace "const fn = (...)" with "const fn = useCallback((...)" and then
    # we'll add ", [relevant deps])".
    # Actually simplest: do line-by-line and for each fn, find the line start,
    # replace the "= " with "= useCallback(" and at end close ")".
    # But that's brittle across newlines.
    # Best: do it simply by replacing the "const rollDice = " prefix only
    pass

# We skip explicit useCallback for now — they require matching closing braces
# and the dependency arrays. Instead we note them as remaining.

# Write result
changed = s != orig
p.write_text(s, encoding='utf-8', newline='\n')
print(f"Changed: {changed}, bytes: {len(s)}, lines: {s.count(chr(10))}")
