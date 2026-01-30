export function checkPointContainedByDiv(point: { x: number; y: number }, divRect: DOMRect | null = null): boolean {
  if (divRect) {
    return (
      point.x >= divRect.left &&
      point.x <= divRect.right &&
      point.y >= divRect.top &&
      point.y <= divRect.bottom
    );
  }
  return point.x >= 0 && point.x <= window.innerWidth && point.y >= 0 && point.y <= window.innerHeight;
}


export function unionKeys<R extends Record<string | number | symbol, unknown>>(rows: R[]): string[] {
  const set = [] as string[];
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!set.includes(k)) {
        set.push(k);
      }
    }
  }
  return set;
}


export function jsonToCsv(jsonData: Record<string | number | symbol, unknown>[]): string {
  if (jsonData.length === 0) {
    return '';
  }
  
  if (typeof jsonData[0] !== 'object') {
    throw new Error('jsonToCsv only supports array of objects');
  }
  
  const headers = unionKeys(jsonData);
  const csvRows = [headers.join(',')];

  for (const row of jsonData) {
    const values = headers.map(h =>  (row[h] ?? '').toString());
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function attachToWindow(thing: unknown, name: string) {
  console.log(`Attaching ${name} to window for debugging.`);
  (window as Window)[name] = thing;
}


/**
 * Converts all line endings in the given string to Windows-style (\r\n)
 */
export function useWindowsLineEndings(string: string): string {
  // check current line endings
  if (string.indexOf('\r\n') >= 0) {
    return string; // already Windows line endings
  }
  return string.replace(/\n/g, '\r\n');
}


export function waitFor(condition: () => boolean, intervalMs = 100): Promise<void> {
  return new Promise((resolve) => {
    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else {
        setTimeout(checkCondition, intervalMs);
      }
    };
    checkCondition();
  });
}