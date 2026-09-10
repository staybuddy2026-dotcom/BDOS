/**
 * Validates a boolean search query string.
 * Supports: AND, OR, NOT, parentheses (), and double quotes "".
 * Returns an object with { isValid: boolean, error?: string }.
 */
export function validateBooleanQuery(query: string): { isValid: boolean; error?: string } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Query cannot be empty.' };
  }

  // 1. Check for balanced parentheses
  let openParentheses = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '(') {
      openParentheses++;
    } else if (trimmed[i] === ')') {
      openParentheses--;
      if (openParentheses < 0) {
        return { isValid: false, error: 'Unbalanced parentheses: closing parenthesis found without a matching opening parenthesis.' };
      }
    }
  }
  if (openParentheses !== 0) {
    return { isValid: false, error: `Unbalanced parentheses: ${openParentheses} opening parenthesis left unclosed.` };
  }

  // 2. Check for balanced quotes
  let inQuotes = false;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '"') {
      inQuotes = !inQuotes;
    }
  }
  if (inQuotes) {
    return { isValid: false, error: 'Unbalanced double quotes: a phrase quote was left unclosed.' };
  }

  // 3. Tokenize and check syntax
  // Split tokens by spaces, respecting quotes and parentheses
  const tokens: string[] = [];
  let currentToken = '';
  let insideQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentToken += char;
    } else if (insideQuotes) {
      currentToken += char;
    } else if (char === '(' || char === ')') {
      if (currentToken.trim()) {
        tokens.push(currentToken.trim());
        currentToken = '';
      }
      tokens.push(char);
    } else if (/\s/.test(char)) {
      if (currentToken.trim()) {
        tokens.push(currentToken.trim());
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken.trim()) {
    tokens.push(currentToken.trim());
  }

  // Basic logical check on tokens
  const binaryOperators = ['AND', 'OR'];
  const unaryOperators = ['NOT'];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toUpperCase();
    const prev = i > 0 ? tokens[i - 1].toUpperCase() : null;
    const next = i < tokens.length - 1 ? tokens[i + 1].toUpperCase() : null;

    // A binary operator cannot be first or last, and cannot follow another operator
    if (binaryOperators.includes(token)) {
      if (i === 0 || i === tokens.length - 1) {
        return { isValid: false, error: `Operator "${tokens[i]}" cannot be at the start or end of the query.` };
      }
      if (prev && (binaryOperators.includes(prev) || unaryOperators.includes(prev) || prev === '(')) {
        return { isValid: false, error: `Invalid syntax: "${tokens[i]}" cannot immediately follow "${tokens[i - 1]}".` };
      }
      if (next && (binaryOperators.includes(next) || next === ')')) {
        return { isValid: false, error: `Invalid syntax: "${tokens[i]}" cannot be followed by "${tokens[i + 1]}".` };
      }
    }

    // A unary operator cannot be last, and cannot follow a closing parenthesis or operand
    if (unaryOperators.includes(token)) {
      if (i === tokens.length - 1) {
        return { isValid: false, error: `Operator "${tokens[i]}" cannot be at the end of the query.` };
      }
      if (next && (binaryOperators.includes(next) || next === ')')) {
        return { isValid: false, error: `Operator "${tokens[i]}" cannot be followed by "${tokens[i + 1]}".` };
      }
    }
  }

  return { isValid: true };
}
export type KeywordInput = {
  keyword: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isFavorite?: boolean;
};

export const keywordInputSchema = {
  keyword: (val: string) => {
    if (!val || !val.trim()) return 'Keyword text is required.';
    const booleanCheck = validateBooleanQuery(val);
    if (!booleanCheck.isValid) return booleanCheck.error;
    return null;
  },
  category: (val: string) => {
    if (!val || !val.trim()) return 'Category is required.';
    return null;
  }
};
