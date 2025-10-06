export function printProgressBar(completed : number, total : number, barLength = 40) {
  if(completed === total){
    return
  }
  const progress = Math.min(completed / total, 1); // Ensure progress does not exceed 100%
  const filledLength = Math.round(progress * barLength);
  const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
  const percentage = (progress * 100).toFixed(2);

  // Only use TTY features if stdout supports it (i.e., we're in a terminal environment)
  if (process.stdout.isTTY) {
    process.stdout.clearLine(0); // Clear the current line
    process.stdout.cursorTo(0); // Move the cursor to the start of the line
    process.stdout.write(`Progress: [${bar}] ${percentage}%`);
    if (completed >= total) {
      process.stdout.write('\n'); // Move to the next line when complete
    }
  } else {
    // Fallback behavior for non-TTY environments (like Jest)
    console.log(`Progress: [${bar}] ${percentage}%`);
  }
}
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function reverseString(str: string): string {
  return str.split("").reverse().join("");
}
export function getObjectSize(obj: { [key: string]: any }): number {
  return Object.keys(obj).length;
}

export function createTimeoutPromise(timeout: number, timeoutVal: any) {
  let timeoutId: NodeJS.Timeout;

  const promise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(timeoutVal), timeout*1000);
  });

  return {
    promise,
    clear: () => clearTimeout(timeoutId)
  };
}
