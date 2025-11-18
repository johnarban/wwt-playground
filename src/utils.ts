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


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonToCsv(jsonData: any[]): string {
  if (jsonData.length === 0) {
    return '';
  }

  const headers = Object.keys(jsonData[0]);
  const csvRows = [headers.join(',')];

  for (const row of jsonData) {
    const values = headers.map(header => {
      // const escaped = ('' + row[header]).replace(/"/g, '\\"');
      // return `"${escaped}"`;
      return row[header];
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}