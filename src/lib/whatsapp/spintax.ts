/**
 * Spintax Parser for Message Personalization & Anti-Ban Variation.
 * Example syntax: "{Hello|Hi|Hey} {name}, {your order|your deal} is ready!"
 */

export function parseSpintax(text: string): string {
  if (!text) return "";
  
  // Regex matches {option1|option2|option3}
  const spintaxRegex = /\{([^{}]+)\}/g;

  let result = text;
  while (spintaxRegex.test(result)) {
    result = result.replace(spintaxRegex, (_, choicesStr: string) => {
      const choices = choicesStr.split("|");
      const randomIndex = Math.floor(Math.random() * choices.length);
      return choices[randomIndex] ?? "";
    });
  }

  return result;
}

export function substituteVariables(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return "";

  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    const valStr = value !== undefined && value !== null ? String(value) : "";
    const placeholderRegex = new RegExp(`\\{\\s*${key}\\s*\\}`, "gi");
    output = output.replace(placeholderRegex, valStr);
  }

  return output;
}

export function prepareMessageText(
  rawText: string,
  variables: Record<string, string | number | undefined | null> = {}
): string {
  const withVars = substituteVariables(rawText, variables);
  return parseSpintax(withVars);
}
