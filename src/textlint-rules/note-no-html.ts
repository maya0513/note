import type { TextlintRuleModule } from "@textlint/types";

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Html](node) {
      report(node, new RuleError("インライン HTML は note 非対応です。"));
    },
  };
};

export default rule;
