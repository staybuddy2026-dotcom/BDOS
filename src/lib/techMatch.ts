/**
 * Whether two technology names are the same thing: case, spacing and a ".js" / "js" suffix are ignored,
 * so "Node.js" = "nodejs" = "Node", but "React" is not "React Native".
 */
export const normalizeTech = (t: string) => t.toLowerCase().replace(/\.?js$/, '').replace(/[\s._-]+/g, '').trim();

export const sameTech = (a: string, b: string) => !!a && !!b && normalizeTech(a) === normalizeTech(b);
