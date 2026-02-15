import type { TextlintRuleModule } from "@textlint/types";

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Table](node) {
      report(node, new RuleError("テーブルは note 非対応です。"));
    },
  };
};

export default rule;
