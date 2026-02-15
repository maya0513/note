import type { TextlintRuleModule } from "@textlint/types";

const rule: TextlintRuleModule = (context) => {
  const { Syntax, RuleError, report } = context;
  return {
    [Syntax.Delete](node) {
      report(node, new RuleError("取り消し線は note 非対応です。"));
    },
  };
};

export default rule;
