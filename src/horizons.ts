export async function loadHorizonsVectorsForWwt(url: string): Promise<string> {
  const rawText = await fetch(url).then(r => r.text());
  return parseHorizonsVectorsForWwt(rawText);
}

export function parseHorizonsVectorsForWwt(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  const start = lines.findIndex(l => l.trim() === "$$SOE");
  const end   = lines.findIndex(l => l.trim() === "$$EOE");
  const rows  = lines.slice(start + 1, end).map(l =>
    l.split(",").slice(0, 5).map(v => v.trim()).join(",")
  );
  return ["jdtdb,date,x,y,z", ...rows].join("\r\n");
}
