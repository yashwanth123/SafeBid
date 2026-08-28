export const colors = {
  forest: "#1B4332",
  sage: "#40916C",
  paper: "#F6F1E7",
  ink: "#14201A",
  clay: "#C45C26",
  muted: "rgba(27,67,50,0.6)",
  card: "#FFFFFF",
};

export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
