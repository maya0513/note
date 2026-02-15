import type { TextlintRuleModule } from "@textlint/types";

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Header](node) {
      const depth = (node as { depth: number }).depth;
      if (depth !== 2 && depth !== 3) {
        report(
          node,
          new RuleError(`h${depth} は note 非対応です。h2 または h3 を使用してください。`),
        );
      }
    },
  };
};

export default rule;
