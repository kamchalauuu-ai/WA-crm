import { describe, expect, it } from "vitest";
import { parseSpintax, prepareMessageText, substituteVariables } from "./spintax";

describe("spintax", () => {
  it("substitutes variables correctly", () => {
    const text = "Hello {name}, your balance is {amount}";
    const result = substituteVariables(text, { name: "John", amount: 100 });
    expect(result).toBe("Hello John, your balance is 100");
  });

  it("parses single spintax block", () => {
    const text = "{Hi|Hello|Hey}";
    const options = ["Hi", "Hello", "Hey"];
    const result = parseSpintax(text);
    expect(options).toContain(result);
  });

  it("parses nested or multiple spintax blocks", () => {
    const text = "{Hi|Hello} John, {thanks|thank you}!";
    const result = parseSpintax(text);
    expect(result).toMatch(/^(Hi|Hello) John, (thanks|thank you)!$/);
  });

  it("combines variable substitution and spintax parsing", () => {
    const template = "{Hello|Hi} {name}, {order|item} #{id}";
    const result = prepareMessageText(template, { name: "Alice", id: 456 });
    expect(result).toMatch(/^(Hello|Hi) Alice, (order|item) #456$/);
  });
});
