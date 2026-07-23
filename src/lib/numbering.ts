import { BookNumberingConfig } from '../types';

export function toRoman(num: number): string {
  const lookup: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let roman = '';
  let n = num;
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i;
      n -= lookup[i];
    }
  }
  return roman || num.toString();
}

export function toAlphabetic(num: number): string {
  let result = '';
  let n = num;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || num.toString();
}

export function toSpelled(num: number): string {
  const spelled = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'
  ];
  if (num >= 0 && num < spelled.length) {
    return spelled[num];
  }
  return num.toString();
}

/**
 * Format chapter number according to numbering configuration
 */
export function formatChapterNumber(num: number, config?: BookNumberingConfig): string {
  if (!config) return `Chapter ${num}`;

  const style = config.numberingStyle || 'arabic';
  let formattedVal = num.toString();

  switch (style) {
    case 'roman':
      formattedVal = toRoman(num);
      break;
    case 'alphabetic':
      formattedVal = toAlphabetic(num);
      break;
    case 'spelled':
      formattedVal = toSpelled(num);
      break;
    case 'arabic':
    default:
      formattedVal = num.toString();
      break;
  }

  const prefix = config.numberingPrefix !== undefined ? config.numberingPrefix : 'Chapter';
  const suffix = config.numberingSuffix !== undefined ? config.numberingSuffix : '';

  if (prefix) {
    return `${prefix} ${formattedVal}${suffix}`.trim();
  }
  return `${formattedVal}${suffix}`.trim();
}

/**
 * Format full title line combining chapter number and chapter title
 */
export function formatFullChapterTitle(num: number, title: string, config?: BookNumberingConfig): string {
  const formattedNum = formatChapterNumber(num, config);
  if (!formattedNum) return title;
  return `${formattedNum}: ${title}`;
}
