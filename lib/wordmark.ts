// agentty's welcome-screen wordmark: ">AGENTTY" in a 6×7 pixel font, drawn as
// half-block cells (▀ ▄ █). Shared by the site's animated logo and the
// terminal (curl) rendering, so both draw the exact same glyphs.

const FONT_W = 6;
const FONT_H = 7;
const SPACER = 1;
export const TEXT = ">AGENTTY";

// 6×7 pixel-art font, '#' = lit. Transcribed exactly from the source.
export const GLYPHS: Record<string, string[]> = {
  ">": [
    "      ",
    "#  #  ",
    "## ## ",
    " ## ##",
    "## ## ",
    "#  #  ",
    "      ",
  ],
  A: [
    "  ##  ",
    " #  # ",
    "#    #",
    "######",
    "#    #",
    "#    #",
    "#    #",
  ],
  G: [
    " #### ",
    "#    #",
    "#     ",
    "#  ###",
    "#    #",
    "#    #",
    " #### ",
  ],
  E: [
    "######",
    "#     ",
    "#     ",
    "##### ",
    "#     ",
    "#     ",
    "######",
  ],
  N: [
    "#    #",
    "##   #",
    "# #  #",
    "#  # #",
    "#   ##",
    "#    #",
    "#    #",
  ],
  T: [
    "######",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
  ],
  Y: [
    "#    #",
    "#    #",
    " #  # ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
    "  ##  ",
  ],
};

const PAD_TOP = 1;
const PAD_BOTTOM = 2;
const PH = FONT_H + PAD_TOP + PAD_BOTTOM;
const CH = Math.ceil(PH / 2); // cell rows (2 px per cell vertically)

export type CellKind = " " | "▀" | "▄" | "█";

// Build each letter's settled half-block cell grid ONCE at module load.
// Result: per letter → CH rows × FONT_W cells.
export function buildLetter(ch: string): CellKind[][] {
  const g = GLYPHS[ch];
  const rows2 = FONT_H + PAD_TOP + PAD_BOTTOM; // pixel rows
  const lit: number[] = new Array(rows2 * FONT_W).fill(0);
  if (g) {
    for (let row = 0; row < FONT_H; row++) {
      for (let col = 0; col < FONT_W; col++) {
        if (g[row][col] === "#") lit[(PAD_TOP + row) * FONT_W + col] = 1;
      }
    }
  }
  const cells: CellKind[][] = [];
  for (let cy = 0; cy < CH; cy++) {
    const line: CellKind[] = [];
    for (let x = 0; x < FONT_W; x++) {
      const top = lit[cy * 2 * FONT_W + x] === 1;
      const bot = lit[(cy * 2 + 1) * FONT_W + x] === 1;
      line.push(top && bot ? "█" : top ? "▀" : bot ? "▄" : " ");
    }
    cells.push(line);
  }
  return cells;
}


/** The wordmark as text rows (one string per cell row), letters 1 cell apart. */
export function wordmarkRows(): string[] {
  const letters = TEXT.split("").map((ch) => buildLetter(ch));
  return letters[0].map((_, cy) => letters.map((l) => l[cy].join("")).join(" ".repeat(SPACER)));
}
