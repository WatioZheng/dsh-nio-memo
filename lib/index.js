// src/index.ts
import { defineTool } from "@deepseek-ai/dsh-tools";

// src/db.ts
import * as nodeFs from "node:fs";
import * as nodePath2 from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/types.ts
import * as nodeOs from "node:os";
import * as nodePath from "node:path";
function memoDir() {
  const override = process.env.NIO_MEMO_DIR?.trim();
  if (override) return override;
  const dshHome = process.env.DSH_HOME?.trim();
  return nodePath.join(dshHome || nodePath.join(nodeOs.homedir(), ".dsh"), "nio-memo");
}
function memoDbFile() {
  return nodePath.join(memoDir(), "memo.db");
}

// src/seed.ts
var INDEX_NOTE = "# \u624B\u8BB0 \xB7 \u5907\u5FD8\u7D22\u5F15\n\n> \u547D\u4E2D\u5173\u952E\u8BCD \u2192 \u7528 `nio_memo(\u8DEF\u5F84)` \u53D6\u5361\u5168\u6587\uFF08\u8DEF\u5F84\u7EC8\u751F\u4E0D\u53D8\uFF09\u3002\n> \u5907\u5FD8\u5361\uFF1A\u9ED8\u8BA4\u53EA\u6CE8\u5165\u6E05\u5355\uFF08\u5361\u7247\u540D / \u5173\u952E\u8BCD / \u8DEF\u5F84\uFF09\uFF0C\u547D\u4E2D\u624D\u53D6\u5168\u6587\u3002\n> \u52A8\u6001\u89C4\u77E9\uFF1A\u89C1\u300C\u89C4\u77E9\u300D\u533A\uFF0C\u542F\u7528\u4E2D\u7684\u5361\u7247**\u5168\u6587**\u6BCF\u8F6E\u6CE8\u5165\u3002\n> \u94C1\u5F8B\u6761\u4F8B\uFF1A\u9501\u6B7B\uFF0C\u6BCF\u8F6E\u65E0\u6761\u4EF6\u5168\u6587\u6CE8\u5165\u3002";
var IRON_CLAUSES = [
  {
    "group": "DSH",
    "title": "\u624B\u8BB0\u5361\u7247\u7EF4\u62A4",
    "path": "\u89C4\u77E9/\u94C1\u5F8B/\u624B\u8BB0\u5361\u7247\u7EF4\u62A4.md",
    "content": '## \u624B\u8BB0\u5361\u7247\u7EF4\u62A4\uFF08\u624B\u8BB0 \xB7 nio-Memo\uFF09\n\n**\u89E6\u53D1\u70B9\uFF08\u4EFB\u4E00\u547D\u4E2D\u5373\u5199\u5361\uFF09**\uFF1A\n- \u7528\u6237\u5F3A\u8C03\u300C**\u8BB0\u4F4F\u8FD9\u4E2A / \u8BB0\u4E0B\u6765 / \u4EE5\u540E\u90FD\u7528**\u300D\u2192 \u5199\u5165\u300C\u624B\u8BB0\u300D\u5E93\u4E3A**\u5907\u5FD8\u5361**\uFF08\u5361\u7247\u540D / \u5173\u952E\u8BCD / \u903B\u8F91\u8DEF\u5F84 / \u6B63\u6587\uFF09\uFF0C\u5E76**\u544A\u77E5\u5DF2\u5199\u5165**\uFF08\u4E0D\u6084\u6084\u8BB0\uFF09\u3002\n- \u7528\u6237\u660E\u786E\u8BF4\u300C**\u8FD9\u662F\u94C1\u5F8B / \u8FD9\u662F\u89C4\u77E9**\u300D\u2192 \u5199\u5165**\u89C4\u77E9**\u533A\uFF1A\u94C1\u5F8B\u6761\u4F8B\uFF08\u9501\u6B7B \xB7 \u6BCF\u8F6E\u5FC5\u6CE8\u5165\uFF09\u6216**\u52A8\u6001\u89C4\u77E9**\uFF08\u53EF\u542F\u505C\uFF09\uFF0C\u5E76\u544A\u77E5\u5DF2\u5199\u5165\uFF1B\u4E0D\u964D\u7EA7\u585E\u8FDB\u5907\u5FD8\u5361\u3002\n- \u7528\u6237**\u660E\u786E\u7EA0\u6B63**\u4E86\u6211\u7684\u505A\u6CD5\uFF0C\u4E14\u8BE5\u7EA0\u6B63\u5C5E\u901A\u7528\u53E3\u5F84\uFF08\u6362\u53F0\u673A\u5668/\u6362\u4E2A\u4EFB\u52A1\u4E5F\u6210\u7ACB\uFF09\u2192 \u843D\u6210\u5361\u7247\u3002\n- \u4F1A\u8BDD\u4E2D\u786E\u8BA4\u4E86**\u53EF\u590D\u7528\u7684\u65B0\u4E8B\u5B9E**\uFF1A\u65B0\u8BBE\u5907 / \u65B0\u8DEF\u5F84 / \u65B0\u8D26\u53F7 / \u65B0\u6D41\u7A0B / \u65B0\u5751\u4E0E\u7ED5\u6CD5 \u2192 \u843D\u6210\u5361\u7247\uFF08\u5C24\u5176"\u4E0B\u6B21\u8FD8\u4F1A\u7528\u5230"\u7684\uFF09\u3002\n- \u540C\u4E00\u95EE\u9898**\u7B2C\u4E8C\u6B21**\u51FA\u73B0\uFF08\u4E0A\u6B21\u9760\u4E34\u65F6\u5224\u65AD\u89E3\u51B3\uFF09\u2192 \u843D\u6210\u5361\u7247\uFF0C\u522B\u518D\u4E34\u65F6\u5224\u65AD\u7B2C\u4E09\u6B21\u3002\n- \u7528\u6237\u5BF9\u67D0\u7C7B\u4E8B\u7684**\u504F\u597D/\u53E3\u5F84**\uFF08\u8F93\u51FA\u683C\u5F0F\u3001\u8BED\u8A00\u3001\u7C92\u5EA6\u3001\u5148\u95EE\u8FD8\u662F\u5148\u505A\uFF09\u2192 \u843D\u6210\u5361\u7247\u6216\u52A8\u6001\u89C4\u77E9\u3002\n\n**\u843D\u4F4D\u53E3\u5F84\uFF08\u9ED8\u8BA4\u4ECE\u4E25\uFF09**\uFF1A\n- **\u9664\u975E\u7528\u6237\u660E\u786E\u5F3A\u8C03\u300C\u8FD9\u662F\u89C4\u77E9 / \u94C1\u5F8B\u300D\uFF0C\u5426\u5219\u65B0\u5361\u7247\u901A\u5E38\u53EA\u80FD\u843D\u5165\u300C\u5907\u5FD8\u300D\u533A**\u2014\u2014\u5373\u9ED8\u8BA4\u6309\u300C\u6309\u9700\u67E5\u9605\u300D\u5904\u7406\uFF0C\u4E0D\u4E3B\u52A8\u5347\u7EA7\u4E3A\u6BCF\u8F6E\u6CE8\u5165\uFF0C\u514D\u5F97\u6084\u6084\u5403\u6389\u4E0A\u4E0B\u6587\u3002\n- \u8981\u5347\u7EA7\uFF0C\u987B\u6709\u7528\u6237\u7684\u660E\u786E\u8868\u8FF0\uFF08\u300C\u8FD9\u662F\u89C4\u77E9\u300D\u300C\u4EE5\u540E\u6BCF\u8F6E\u90FD\u8981\u9075\u5B88\u300D\uFF09\uFF0C\u6216\u7528\u6237\u4E8B\u540E\u5728\u300C\u624B\u8BB0\u300DTab \u91CC\u624B\u52A8\u70B9\u300C\u7ACB\u4E3A\u89C4\u77E9\u300D\u3002\n- \u5FC5\u987B\u9075\u5B88\u3001\u8981\u6BCF\u8F6E\u751F\u6548 \u2192 \u89C4\u77E9\u533A\uFF1B\u6309\u9700\u67E5\u9605\u3001\u5E73\u65F6\u522B\u5360\u4E0A\u4E0B\u6587 \u2192 \u5907\u5FD8\u5361\u3002\n- \u62FF\u4E0D\u51C6\u65F6**\u5148\u843D\u5907\u5FD8**\uFF0C\u5E76\u8BF4\u660E\u300C\u5DF2\u8BB0\u4E3A\u5907\u5FD8\u5361\uFF0C\u5982\u9700\u6BCF\u8F6E\u9075\u5B88\u8BF7\u8BF4\u4E00\u58F0\uFF0C\u6211\u7ACB\u4E3A\u89C4\u77E9\u300D\u3002\n\n**\u7EF4\u62A4\u53E3\u5F84**\uFF1A\u5E93\u4E3A\u552F\u4E00\u771F\u6E90 `~/.dsh/nio-memo/memo.db`\uFF08\u5168\u5C40\u5E93\uFF0C\u4E0D\u7ED1\u9879\u76EE\uFF09\uFF1B\u5361\u7247\u8DEF\u5F84\u7531\u533A+\u5361\u540D\u6D3E\u751F\uFF1B\u505C\u7528\u5361\u4E0D\u8FDB\u6CE8\u5165\u7D22\u5F15\uFF1B\n\u9ED8\u8BA4\u5361\uFF08\u5B98\u65B9\u7EF4\u62A4\uFF09\u5C3D\u91CF\u522B\u6539\u2014\u2014\u9700\u8981\u6539\u5C31**\u590D\u5236**\u6210\u81EA\u5B9A\u4E49\u5361\u6216\u5148**\u5173\u95ED**\uFF1B\u5220\u9664\u8FDB\u56DE\u6536\u7AD9\uFF0C\u53EF\u6062\u590D\u3002\n\u6761\u4F8B/\u5361\u7247\u66F4\u65B0\u9700\u660E\u786E\u7248\u672C\u4E0E\u65E5\u671F\u3002'
  }
];
var SEED_RULES = [
  {
    "name": "\u7981\u6B62\u9759\u9ED8\u515C\u5E95\uFF08v2.4.5\uFF09",
    "keywords": [
      "\u9759\u9ED8\u515C\u5E95",
      "\u964D\u7EA7",
      "\u515C\u5E95",
      "\u5931\u8D25\u62A5\u9519"
    ],
    "path": "\u89C4\u77E9/\u52A8\u6001/\u7981\u6B62\u9759\u9ED8\u515C\u5E95\uFF08v2.4.5\uFF09.md",
    "content": "## \u7981\u6B62\u9759\u9ED8\u515C\u5E95\uFF08v2.4.5\uFF09\n\n\u4EFB\u4F55\u964D\u7EA7/\u515C\u5E95\u8DEF\u5F84**\u5FC5\u987B\u663E\u5F0F\u63D0\u9192\u7528\u6237**\uFF08\u8C03\u8BD5\u65E5\u5FD7 + \u53EF\u8BFB\u56DE\u590D\uFF09\uFF0C\u7EDD\u4E0D\u9ED8\u9ED8\u5207\u6362\u3002\u4E8C\u9009\u4E00\uFF1A\n\n1. **\u4E3B\u8DEF\u5F84\u5931\u8D25 \u2192 \u76F4\u63A5\u62A5\u9519**\uFF0C\u8BA9\u7528\u6237\u5904\u7406\uFF1B\n2. **\u5FC5\u987B\u515C\u5E95 \u2192 \u660E\u786E\u63D0\u793A**\u300C\u8D70\u4E86\u515C\u5E95\uFF08\u539F\u56E0\uFF09\u300D\u53CA\u5F71\u54CD\u3002\n\n\u53C2\u7167\uFF1Aslim \u5931\u8D25\u5373\u62A5\u9519\u56DE\u6EDA\u3002\u7981\u6B62\u300C\u5931\u8D25 \u2192 \u9759\u9ED8\u6362\u6761\u4F4E\u8D28\u91CF\u8DEF\u7EE7\u7EED\u8DD1\u300D\u3002",
    "origin": "default"
  },
  {
    "name": "\u5931\u8D25\u663E\u5F0F\u5316",
    "keywords": [
      "\u5931\u8D25",
      "\u964D\u7EA7",
      "\u53EF\u8FFD\u6EAF",
      "\u8DEF\u5F84"
    ],
    "path": "\u89C4\u77E9/\u52A8\u6001/\u5931\u8D25\u663E\u5F0F\u5316.md",
    "content": "## \u5931\u8D25\u663E\u5F0F\u5316\n\n- \u4E3B\u8DEF\u5F84\u5931\u8D25\u4E0D\u8BB8\u6084\u6084\u964D\u7EA7\u6210\u4F4E\u8D28\u91CF\u7ED3\u679C\uFF08\u5982 LLM \u2192 \u8BCD\u9891\u3001\u65B0\u8DEF\u5F84 \u2192 \u65E7\u8DEF\u5F84\uFF09\u3002\n- \u7528\u6237\u770B\u5230\u7684\u6BCF\u4E2A\u7ED3\u679C\u90FD\u8981\u80FD\u8FFD\u6EAF\u5230\u8D70\u4E86\u54EA\u6761\u8DEF\u5F84\u3002",
    "origin": "default"
  },
  {
    "name": "\u6539\u52A8\u524D\u5907\u4EFD",
    "keywords": [
      "\u5907\u4EFD",
      "\u8FC1\u79FB",
      "\u4E8B\u52A1",
      "\u56DE\u6EDA",
      "\u8FD0\u884C\u65F6\u6570\u636E"
    ],
    "path": "\u89C4\u77E9/\u52A8\u6001/\u6539\u52A8\u524D\u5907\u4EFD.md",
    "content": "## \u6539\u52A8\u524D\u5907\u4EFD\n\n- \u4FEE\u6539 `.nio-memory/\u8BB0\u5FC6.db` \u7B49\u8FD0\u884C\u65F6\u6570\u636E\u524D\uFF0C\u5148\u5907\u4EFD\uFF08`cp \u8BB0\u5FC6.db \u8BB0\u5FC6.db.bak-$(date +%s)`\uFF09\u3002\n- \u6570\u636E\u5E93\u6574\u7406/\u8FC1\u79FB\u5FC5\u987B\u4E8B\u52A1\u5185\u6267\u884C\uFF0C\u5931\u8D25\u56DE\u6EDA\u3002",
    "origin": "default"
  },
  {
    "name": "\u51E1\u9700\u7528\u6237\u53CD\u9988/\u51B3\u7B56\u7684\uFF0C\u4E00\u5F8B\u8D70\u4EA4\u4E92\u6027\u51B3\u7B56\uFF08v2.11 \xB7 2026-10-14\uFF09",
    "keywords": [
      "\u4EA4\u4E92\u6027\u51B3\u7B56",
      "\u62CD\u677F",
      "\u9009\u62E9\u9898",
      "\u7528\u6237\u53CD\u9988"
    ],
    "path": "\u89C4\u77E9/\u52A8\u6001/\u51E1\u9700\u7528\u6237\u53CD\u9988/\u51B3\u7B56\u7684\uFF0C\u4E00\u5F8B\u8D70\u4EA4\u4E92\u6027\u51B3\u7B56\uFF08v2.11 \xB7 2026-10-14\uFF09.md",
    "content": '## \u51E1\u9700\u7528\u6237\u53CD\u9988/\u51B3\u7B56\u7684\uFF0C\u4E00\u5F8B\u8D70\u4EA4\u4E92\u6027\u51B3\u7B56\uFF08v2.11 \xB7 2026-10-14\uFF09\n\n> \u6765\u6E90\uFF1A\u7528\u6237 2026-10-14 \u539F\u8BDD \u2014\u2014\u300C**\u4EA4\u4E92\u6027\u51B3\u7B56\u3002\u53E6\u5916\u628A\u4EA4\u4E92\u6027\u51B3\u7B56\u5199\u5165\u94C1\u5F8B\uFF0C\u8981\u6C42\u9664\u975E\u662F\u5BF9\u8BDD\u7ED3\u675F\uFF0C\u5426\u5219\u4E00\u5207\u9700\u8981\u7528\u6237\u53CD\u9988\u548C\u51B3\u7B56\u7684\uFF0C\u90FD\u5FC5\u987B\u8D70\u4EA4\u4E92\u6027\u51B3\u7B56\u3002**\u300D\n> \u89E6\u53D1\u573A\u666F\uFF1A**\u4EFB\u4F55**\u8F6E\u5230"\u7B49\u7528\u6237\u7ED9\u4E1C\u897F"\u7684\u65F6\u523B \u2014\u2014 \u65B9\u6848\u53D6\u820D\u3001\u53E3\u5F84\u5B9A\u4E49\u3001\u8981\u4E0D\u8981\u52A8\u624B\u7684\u8BB8\u53EF\u3001\u786E\u8BA4\u4E0B\u4E00\u6B65\u3001\u8865\u5145\u4FE1\u606F\u3002\n\n**\u6761\u6587**\uFF1A\n\n1. **\u6B63\u6761**\uFF1A\u53EA\u8981**\u8FD8\u9700\u8981\u7528\u6237\u53CD\u9988\u6216\u62CD\u677F**\uFF0C**\u5FC5\u987B**\u7528\u5BBF\u4E3B\u5DE5\u5177 **`ask_user_question`** \u51FA**\u6309\u94AE\u5F0F\u9009\u62E9\u9898**\uFF0C\u8BA9\u7528\u6237\u70B9\u3002\n   - \u26D4 **\u4E0D\u8BB8**\u628A\u5B83\u5199\u6210\u6563\u6587\u91CC\u7684\u4E00\u53E5\u53CD\u95EE\uFF08\u300C\u6211\u53EF\u4EE5\u5408\u5E76\u5E76\u90E8\u7F72\u5417\uFF1F\u300D\u8FD9\u79CD\u5C31\u7B97\u8FDD\u89C4\uFF09\uFF1B\n   - \u26D4 **\u4E0D\u8BB8**\u4EE5\u300C\u7B49\u4F60\u8BF4\u4E00\u53E5\u300D\u6536\u5C3E\u672C\u56DE\u5408\u3002\n2. **\u552F\u4E00\u4F8B\u5916 \u2014\u2014 \u5BF9\u8BDD\u5DF2\u7ED3\u675F**\uFF1A\u672C\u8F6E**\u4E0D\u518D\u9700\u8981\u7528\u6237\u8F93\u5165**\uFF08\u7EAF\u6C47\u62A5\u3001\u4EFB\u52A1\u6536\u5C3E\u3001\u65E0\u5F85\u51B3\u4E8B\u9879\uFF09\u65F6\u6B63\u5E38\u6536\u5C3E\uFF0C**\u4E0D\u5F97\u4E3A\u51D1\u4EA4\u4E92\u800C\u63D0\u95EE**\u3002\n3. **\u51FA\u9898\u8981\u6C42**\uFF1A\u6BCF\u9898 2~4 \u4E2A\u9009\u9879\uFF1B**\u63A8\u8350\u9879\u653E\u7B2C\u4E00\u4E2A**\uFF0C\u6807\u7B7E\u672B\u5C3E\u52A0\u300C\uFF08\u63A8\u8350\uFF09\u300D\uFF1B\u6BCF\u9879\u914D**\u4E00\u53E5\u5F71\u54CD/\u4EE3\u4EF7\u8BF4\u660E**\uFF1B\u9898\u5E72\u524D\u4E00\u884C\u8BF4\u6E05**\u4E3A\u4EC0\u4E48\u73B0\u5728\u8981\u4F60\u62CD\u677F**\uFF1B\u53EF\u4E00\u6B21\u51FA**\u591A\u9898**\uFF08\u5404\u9898\u72EC\u7ACB\uFF09\uFF1B\u7528\u6237\u53EF\u5E26**\u81EA\u5B9A\u4E49\u7B54\u6848**\uFF0C**\u4EE5\u81EA\u5B9A\u4E49\u4E3A\u51C6**\u3002\n4. **\u4E0D\u5F97\u62FF\u4EA4\u4E92\u6027\u51B3\u7B56\u5077\u61D2**\uFF1A\u6446\u4E0A\u53BB\u7684\u9009\u9879\u5FC5\u987B\u662F**\u5DF2\u6838\u8FC7\u4E8B\u5B9E**\u7684\u771F\u5B9E\u5206\u53C9\uFF0C\u4E0D\u8BB8\u628A\u6CA1\u67E5\u6E05\u7684\u4E1C\u897F\u4E22\u7ED9\u7528\u6237\u6311\u3002\n5. **\u51B2\u7A81\u53E3\u5F84\uFF08\u91CD\u8981\uFF09**\uFF1A\u5DE5\u574A\u5728\u5C97\u987B\u77E5\u90A3\u53E5\u300C\u4E0D\u8981\u5728\u5BF9\u8BDD\u91CC\u5217\u9009\u9879\u7B49\u7528\u6237\u6311\u300D\u9488\u5BF9\u7684\u662F**\u5DF2\u5E9F\u9664\u7684 Web \u51B3\u65AD\u53F0 / \u6563\u6587\u5F0F\u83DC\u5355**\uFF1B\u672C\u6761\u751F\u6548\u540E**\u4EE5\u672C\u6761\u4E3A\u51C6** \u2014\u2014 \u9700\u8981\u62CD\u677F\u5C31\u51FA\u6309\u94AE\u5F0F\u9009\u62E9\u9898\u3002\n   \uFF08\u540C\u6B3E\u53E3\u5F84\u5DF2\u540C\u6B65\u8FDB\u504F\u597D\u5361 `\u504F\u597D/\u5BF9\u8BDD\u9009\u62E9\u9898.md` v2\uFF1A\u5220\u6389\u4E86\u65E7\u7248"\u4E00\u53E5\u8BDD\u80FD\u95EE\u6E05\u7684\u76F4\u63A5\u95EE"\u90A3\u4E2A\u4F8B\u5916\u3002\uFF09\n6. **\u5B9A\u5B8C\u8981\u7559\u75D5**\uFF1A\u7528\u6237\u88C1\u51B3\u7684**\u539F\u6587**\u6298\u8FDB\u7559\u75D5\uFF08`forge say` / \u4EA4\u4ED8\u8BF4\u660E / \u7ED3\u8BBA\u8868\uFF09\uFF0C\u514D\u5F97\u56DE\u5934\u518D\u95EE\u4E00\u904D\u3002\n\n**\u5224\u636E\u4E00\u53E5\u8BDD**\uFF1A*\u8FD9\u4E00\u8F6E\u6211\u8FD8\u9700\u8981\u7528\u6237\u7ED9\u4E1C\u897F\u5417\uFF1F\u8981 \u2192 \u51FA\u9009\u62E9\u9898\uFF1B\u4E0D\u8981 \u2192 \u6B63\u5E38\u6536\u5C3E\u3002*\n\n---\n\n---\n\n---',
    "origin": "default"
  }
];
var SAMPLE_CARDS = [
  {
    "name": "Tailscale\u7EC4\u7F51",
    "keywords": [
      "Tailscale",
      "WireGuard",
      "\u7EC4\u7F51",
      "\u8FDC\u7A0B\u8BBF\u95EE",
      "ZeroTier"
    ],
    "path": "\u5907\u5FD8/Tailscale\u7EC4\u7F51.md",
    "content": '# Tailscale \u7EC4\u7F51\uFF08WireGuard \u6570\u636E\u9762\uFF09\n\n> \u793A\u4F8B\u5361\u7247 \u00B7 v1 \u00B7 2026-10-10\n> \u573A\u666F\uFF1A\u6D89\u53CA **Tailscale / WireGuard \u7EC4\u7F51**\u3001**\u8FDC\u7A0B\u8BBF\u95EE\u5185\u7F51\u8BBE\u5907**\u3001**\u4E0E ZeroTier \u5E76\u5B58\u6216\u8FC1\u79FB**\u65F6\u547D\u4E2D\u672C\u5361\u3002\n> \u26A0\uFE0F \u672C\u5361\u4E3A**\u901A\u7528\u793A\u4F8B**\uFF1A\u4E3B\u673A\u540D / IP / \u7F51\u6BB5\u4E00\u5F8B\u7528\u5360\u4F4D\u7B26\uFF0C\u5B9E\u9645\u4F7F\u7528\u65F6\u66FF\u6362\u4E3A\u81EA\u5DF1\u7684\u503C\u3002\n\n## \u4E00\u53E5\u8BDD\n\n**Tailscale \u4E0E ZeroTier \u53EF\u4EE5\u5E76\u5B58\uFF08Linux / Windows \u5404\u7528\u5404\u7684\u865A\u62DF\u7F51\u5361\uFF09\uFF1B\u624B\u673A\u7AEF\u540C\u65F6\u53EA\u80FD\u542F\u7528\u4E00\u4E2A VPN\uFF1B\u51B7\u542F\u52A8\u5EFA\u8FDE Tailscale \u660E\u663E\u66F4\u5FEB\u3002**\n\n## \u4E0E ZeroTier \u7684\u5BF9\u6BD4\uFF08\u7ECF\u9A8C\u503C\uFF09\n\n| \u6307\u6807 | ZeroTier | **Tailscale** |\n|---|---|---|\n| \u6570\u636E\u9762 | \u81EA\u7814\u534F\u8BAE | **WireGuard** |\n| \u9996\u6B21\u5EFA\u8FDE | \u6570\u79D2\uFF08rendezvous \u67B6\u6784\u6027\u5EF6\u8FDF\uFF09 | **\u6570\u767E\u6BEB\u79D2** |\n| \u63A7\u5236\u9762 | \u81EA\u5EFA controller | \u5B98\u65B9 SaaS\uFF08\u53EF\u81EA\u5EFA Headscale\uFF09 |\n| Android \u5BA2\u6237\u7AEF | \u793E\u533A\u7248\u7EF4\u62A4\u8F83\u6162 | \u5B98\u65B9\u5BA2\u6237\u7AEF\u6D3B\u8DC3\u7EF4\u62A4 |\n\n## \u8282\u70B9\u547D\u540D\uFF08\u793A\u4F8B\uFF09\n\n| \u8282\u70B9 | \u5730\u5740 | \u8BF4\u660E |\n|---|---|---|\n| `host-a` | `100.64.0.1` | \u672C\u673A |\n| `phone-a` | `100.64.0.2` | \u624B\u673A |\n| `host-b` | `100.64.0.3` | \u5907\u7528\u673A |\n\n> \u5730\u5740\u6BB5 `100.64.0.0/10` \u662F CGNAT \u4FDD\u7559\u6BB5\uFF0CTailscale / ZeroTier \u90FD\u4ECE\u8FD9\u91CC\u5206\u914D\u5730\u5740\u3002\n\n## \u4E0E ZeroTier \u5E76\u5B58\u7684\u94C1\u5F8B\n\n| \u5E73\u53F0 | \u80FD\u5426\u5E76\u5B58 |\n|---|---|\n| **Linux / Windows** | \u2705 \u53EF\u4EE5\uFF08\u5404\u7528\u5404\u7684\u865A\u62DF\u7F51\u5361\uFF09 |\n| **Android / iOS** | \u274C **\u540C\u65F6\u53EA\u80FD\u4E00\u4E2A VPN \u751F\u6548**\uFF08\u7CFB\u7EDF\u9650\u5236\uFF09 |\n| **\u4E0E\u539F\u751F WireGuard** | \u274C **\u4E0D\u8981\u540C\u8DD1**\uFF08\u90FD\u7528 WG \u5E93\uFF0C\u5DF2\u77E5\u51B2\u7A81\uFF09 |\n\n**\u4E09\u4E2A\u5FC5\u907F\u7684\u5751**\uFF1A\n\n1. **\u8DEF\u7531\u522B\u649E** \u2014\u2014 \u522B\u4E24\u8FB9\u90FD advertise \u540C\u4E00\u7F51\u6BB5\n2. **DNS \u522B\u62A2** \u2014\u2014 \u5173\u4E00\u8FB9\uFF08\u5982 `--accept-dns=false`\uFF09\n3. **\u522B\u90FD\u5F53\u51FA\u53E3\u8282\u70B9**\n\n## \u5B89\u5168\u8981\u70B9\n\n- \u6570\u636E\u9762 = **WireGuard**\uFF08Curve25519 + ChaCha20-Poly1305\uFF0C\u524D\u5411\u4FDD\u5BC6\uFF09\n- **\u63A7\u5236\u9762\u7406\u8BBA\u53EF\u505A MITM**\uFF08\u4E0B\u53D1\u5047\u516C\u94A5\uFF09\u2192 \u7528 **Tailnet Lock** \u7F13\u89E3\n- **\u9ED8\u8BA4 ACL \u5E38\u662F\u300C\u5168\u901A\u300D** \u26A0\uFE0F \u2014\u2014 \u8FDB\u7F51\u540E\u5EFA\u8BAE\u7ACB\u5373\u6536\u7D27\n- \u8EAB\u4EFD\u6E90\u662F SSO \u2192 **IdP \u8D26\u53F7\u52A1\u5FC5\u5F00 2FA**\n- **Funnel = \u771F\u516C\u7F51\u66B4\u9732**\uFF0C\u522B\u968F\u624B\u5F00\n- **\u6E05\u7406\u4E0D\u7528\u7684\u65E7\u8282\u70B9**\uFF08\u65E7\u5BC6\u94A5\u4ECD\u6709\u6548\uFF09\n\n## \u670D\u52A1\u7ED1\u5B9A\u7684\u6559\u8BAD\uFF08\u8FC1\u79FB\u8981\u70B9\uFF09\n\n\u670D\u52A1\u7528 `auto` / `0.0.0.0` \u7ED1\u5B9A\uFF0C\u6362 overlay \u65F6\u96F6\u6539\u52A8\uFF1B\n\u51E1\u662F**\u6309\u56FA\u5B9A overlay \u5730\u5740\u786C\u7F16\u7801**\u7684\u5730\u65B9\uFF08systemd\u3001\u9632\u706B\u5899\u767D\u540D\u5355\uFF09\uFF0C\u8FC1\u79FB\u65F6\u90FD\u8981\u8FC7\u4E00\u904D\u3002'
  },
  {
    "name": "\u672C\u673A\u4E3B\u673A102",
    "keywords": [
      "102",
      "\u672C\u673A",
      "\u4E3B\u673A",
      "host-a",
      "\u786C\u4EF6"
    ],
    "path": "\u5907\u5FD8/\u672C\u673A\u4E3B\u673A102.md",
    "content": '# \u672C\u673A\u4E3B\u673A\uFF08\u793A\u4F8B\uFF09\n\n> \u793A\u4F8B\u5361\u7247 \u00B7 v1 \u00B7 2026-10-10\n> \u573A\u666F\uFF1A\u9700\u8981\u8BB0\u5F55**\u672C\u673A\u786C\u4EF6 / \u7F51\u7EDC / \u78C1\u76D8\u5E03\u5C40**\u7B49\u5B9E\u51B5\u3001\u4E14\u5E0C\u671B\u8DE8\u4F1A\u8BDD\u590D\u7528\u65F6\u547D\u4E2D\u672C\u5361\u3002\n> \u26A0\uFE0F \u672C\u5361\u4E3A**\u901A\u7528\u793A\u4F8B**\uFF1A\u4E3B\u673A\u540D / IP / \u578B\u53F7\u5747\u4E3A\u5360\u4F4D\u7B26\uFF0C\u8BF7\u66FF\u6362\u4E3A\u81EA\u5DF1\u673A\u5668\u7684\u5B9E\u6D4B\u503C\u3002\n\n## \u672C\u673A = \u793A\u4F8B\u4E3B\u673A\n\n- **\u7CFB\u7EDF**\uFF1ALinux\uFF08\u793A\u4F8B\uFF1AUbuntu 24.04 LTS \u539F\u751F\uFF0C\u975E WSL\uFF1BPID 1 = systemd\uFF09\n- **\u673A\u578B**\uFF1A\u7B14\u8BB0\u672C / \u53F0\u5F0F\u673A\uFF08\u53EF\u7528 `dmidecode -s system-product-name` \u67E5\uFF09\n- **\u4E3B\u673A\u540D**\uFF1A`host-a`\n- **\u7F51\u7EDC**\uFF1A\n  - \u5C40\u57DF\u7F51\uFF1A`192.168.1.100`\uFF08**DHCP \u52A8\u6001\uFF0C\u4F1A\u53D8\u2014\u2014\u522B\u5199\u6B7B**\uFF1B\u8981\u56FA\u5B9A\u987B\u505A DHCP \u4FDD\u7559 / \u9759\u6001\uFF09\n  - overlay\uFF1A`192.168.192.100`\uFF08\u56FA\u5B9A\uFF0C\u8DE8\u673A\u8C03\u7528\u4F18\u5148\u7528\u5B83\uFF09\n- **\u73AF\u5883**\uFF1Aroot \u7528\u6237\uFF1BNode v22 + Python 3.12\n- **\u7CFB\u7EDF\u76D8**\uFF1A\u5BB9\u91CF\u6309\u5B9E\u9645\u586B\uFF1BLVM \u7ED3\u6784\u793A\u4F8B\u2014\u2014\n  - `sda3` \u2192 VG `ubuntu-vg` \u2192 LV `ubuntu-lv`\uFF08ext4\uFF0C\u6302\u8F7D `/`\uFF09\n  - VG \u9884\u7559\u7A7A\u95F2\u7A7A\u95F4\uFF08\u5907 LVM \u5FEB\u7167 / \u65B0 LV\uFF09\n  - `/boot` \u72EC\u7ACB\u5206\u533A\uFF1Bswap \u53EF\u7528\u6839\u5206\u533A\u4E0A\u7684 `/swap.img`\n\n## \u8BB0\u5F55\u8981\u70B9\uFF08\u5199\u8FD9\u7C7B\u5361\u65F6\u503C\u5F97\u8BB0\u4EC0\u4E48\uFF09\n\n1. \u4E3B\u673A\u540D\u4E0E\u673A\u578B\uFF08\u6392\u67E5\u9A71\u52A8 / \u517C\u5BB9\u6027\u65F6\u7528\u5F97\u4E0A\uFF09\n2. \u5C40\u57DF\u7F51\u5730\u5740 + **\u662F\u5426 DHCP \u52A8\u6001**\uFF08\u5199\u6B7B\u4F1A\u8FC7\u65F6\uFF09\n3. overlay / \u5185\u7F51\u56FA\u5B9A\u5730\u5740\uFF08\u8DE8\u673A\u8C03\u7528\u7528\uFF09\n4. \u78C1\u76D8\u4E0E\u5206\u533A\u5E03\u5C40\uFF08\u6269\u5BB9 / \u5907\u4EFD\u524D\u5FC5\u770B\uFF09\n5. \u5DF2\u5360\u7528\u7684\u7AEF\u53E3\u4E0E\u670D\u52A1\u7ED1\u5B9A\u65B9\u5F0F'
  },
  {
    "name": "DSH\u91CD\u542F\u65B9\u5F0F",
    "keywords": [
      "\u91CD\u542F",
      "dsh.service",
      "systemd",
      "hard-refresh"
    ],
    "path": "\u5907\u5FD8/DSH\u91CD\u542F\u65B9\u5F0F.md",
    "content": "# DSH \u91CD\u542F\u65B9\u5F0F\uFF08\u901A\u7528\u7248\uFF09\n\n> \u573A\u666F\uFF1A\u6539\u4E86 **DSH \u63D2\u4EF6 host \u4EE3\u7801 / \u670D\u52A1\u7EA7\u914D\u7F6E / unit \u6587\u4EF6**\uFF0C\u9700\u8981\u8BA9\u670D\u52A1\u91CD\u542F\u624D\u751F\u6548\u65F6\uFF0C\u6309\u672C\u5361\u6267\u884C\u3002\n> \u26A0\uFE0F **\u300C\u662F\u5426\u5141\u8BB8\u81EA\u884C\u91CD\u542F\u300D\u7531\u672C\u5361\u81EA\u5E26\u7684\u300C\u6743\u9650\u677F\u5757\u300D\u51B3\u5B9A**\uFF08\u6863\u4F4D\uFF1A\u7981\u6B62 / \u5141\u8BB8\uFF1B\u9ED8\u8BA4**\u7981\u6B62**\uFF1D\u5FC5\u987B\u5148\u53D6\u5F97\u7528\u6237\u660E\u786E\u6388\u6743\uFF09\u3002\n> \u5361\u9762\u4E0A\u90A3\u4E2A\u5E26\u989C\u8272\u7684\u6309\u94AE\u663E\u793A\u7684\u5C31\u662F**\u5F53\u524D\u6863\u4F4D**\uFF0C\u70B9\u5B83\u5373\u53EF\u5207\u6362\u3002\n\n## \u4E00\u3001\u4EC0\u4E48\u6539\u52A8\u9700\u8981\u91CD\u542F\n\n- **\u9700\u8981\u91CD\u542F**\uFF1A\u63D2\u4EF6 host \u7AEF\u4EE3\u7801\uFF08\u6784\u5EFA\u8FDB `lib/index.js`\uFF09\u3001\u670D\u52A1\u7EA7\u914D\u7F6E\u3001unit \u6587\u4EF6\uFF08\u6539\u540E\u987B `daemon-reload`\uFF09\u3002\n- **\u514D\u91CD\u542F**\uFF1A\u70ED\u88C5\u8F7D\u6BB5\uFF08\u5982\u6A21\u578B provider \u914D\u7F6E\uFF09\u3001\u51ED\u8BC1\u6587\u4EF6\uFF1B\u7EAF\u524D\u7AEF\u6539\u52A8\u53E6\u8BF4\uFF08\u89C1\u4E0B \xA7\u56DB\uFF09\u3002\n\n## \u4E8C\u3001\u65B9\u5F0F A \xB7 \u7ACB\u5373\u91CD\u542F\uFF08\u4F1A\u6253\u65AD\u5F53\u524D\u56DE\u590D\uFF09\n\n```bash\nsystemctl restart <\u670D\u52A1\u540D>        # \u4F8B\uFF1Adsh.service\n```\n\n\u4EC5\u5728\u660E\u77E5\u4F1A\u6253\u65AD\u4E14\u53EF\u63A5\u53D7\u65F6\u4F7F\u7528\u3002\n\n## \u4E09\u3001\u65B9\u5F0F B \xB7 \u5EF6\u8FDF\u91CD\u542F\uFF08\u63A8\u8350\uFF09\n\n\u7528**\u72EC\u7ACB cgroup \u7684 transient unit** \u6267\u884C\uFF0C\u811A\u672C\u4E0D\u4F1A\u88AB\u81EA\u5DF1\u7684\u91CD\u542F\u8FDE\u5750\u6740\u6389\uFF0C\u4E5F\u4E0D\u4F1A\u6390\u65AD\u6B63\u5728\u53D1\u9001\u7684\u56DE\u590D\uFF1A\n\n```bash\nsystemd-run --unit=<\u524D\u7F00>-$(date +%s) --collect --no-block \\\n  bash -c 'sleep <\u5EF6\u8FDF\u79D2>; systemctl restart <\u670D\u52A1\u540D>'\n```\n\n\u8981\u70B9\uFF1A\n\n- \u5EF6\u8FDF\u5EFA\u8BAE **15~180 \u79D2**\uFF0C\u786E\u4FDD\u5F53\u524D\u56DE\u590D\u5DF2\u9001\u8FBE\u3002\n- \u82E5\u6539\u7528\u4E00\u6B21\u6027\u5B9A\u65F6\u5355\u5143\uFF08timer / `onceNN`\uFF09\uFF0C\u7F16\u53F7**\u5FC5\u987B\u9012\u589E\u3001\u7981\u6B62\u590D\u7528**\uFF1B\u53D6\u53F7\u8981\u8BFB**\u5361\u7247 + \u5F52\u6863 + journal \u786C\u8BC1\u636E**\u4E09\u5904\u6700\u5927\u503C +1\u3002\n- **\u6E05\u7406\u65F6\u673A\u662F\u300C\u786E\u8BA4\u670D\u52A1\u5DF2\u91CD\u542F\u3001PID \u5DF2\u53D8\u300D\u4E4B\u540E**\uFF0C\u4E0D\u662F\u6392\u5B8C\u7A0B\u5C31\u5220\uFF08\u66FE\u56E0\u6B64\u628A\u6392\u597D\u7684\u91CD\u542F\u5220\u6389\u3001\u91CD\u542F\u4ECE\u672A\u53D1\u751F\uFF09\u3002\n- \u6BCF\u6B21\u6392\u7A0B\u540E**\u56DE\u5199\u7F16\u53F7\u951A\u70B9**\uFF0C\u5426\u5219\u4E0B\u4E00\u4E2A\u4EBA\u5FC5\u649E\u53F7\u3002\n\n## \u56DB\u3001\u91CD\u542F\u524D\u540E\u6E05\u5355\n\n- [ ] \u5DF2\u786E\u8BA4\u6388\u6743\uFF08\u6743\u9650\u5361\u4E3A\u300C\u7981\u6B62\u300D\u65F6\u5FC5\u987B\u5148\u95EE\u7528\u6237\uFF09\n- [ ] \u5DF2\u8BB0\u5F55\u65E7 PID / \u65E7\u542F\u52A8\u65F6\u95F4\n- [ ] \u5DF2\u6392\u7A0B\u5EF6\u8FDF\u91CD\u542F\uFF0C\u5E76\u56DE\u5199\u7F16\u53F7\u951A\u70B9\n- [ ] \u91CD\u542F\u4F1A **SIGTERM \u6574\u4E2A cgroup**\uFF1A\u4F1A\u8BDD\u5185\u540E\u53F0\u4EFB\u52A1\uFF08\u542B\u5404\u7C7B\u54E8\u3001\u8BA2\u9605\u8FDB\u7A0B\u3001\u6258\u7BA1 job\uFF09\u4F1A\u88AB\u4E00\u5E76\u6740\u6389\u4E14**\u65E0\u901A\u77E5** \u2192 \u91CD\u542F\u540E\u5404\u81EA\u91CD\u6302\n- [ ] \u91CD\u542F\u540E\uFF1A\u670D\u52A1 `active`\u3001PID \u5DF2\u53D8\u3001\u90BB\u5C45\u670D\u52A1\uFF08\u8BBA\u575B / \u5DE5\u574A / \u4EE3\u7406\u7B49\uFF09\u6B63\u5E38\n- [ ] \u7EAF\u524D\u7AEF\u6539\u52A8\uFF1A\u544A\u77E5\u7528\u6237**\u786C\u5237\u65B0**\uFF08Ctrl/Cmd+Shift+R\uFF09\uFF0C\u5426\u5219\u770B\u5230\u7684\u4ECD\u662F\u65E7 bundle",
    "perm": {
      "levels": [
        {
          "name": "\u7981\u6B62",
          "content": "\u4E0D\u5141\u8BB8\u3002\u4EFB\u4F55 dsh.service \u91CD\u542F\uFF08\u7ACB\u5373\u6216\u5EF6\u8FDF\u6392\u7A0B\uFF09\u90FD\u5FC5\u987B\u5148\u53D6\u5F97\u7528\u6237\u660E\u786E\u6388\u6743\uFF1B\u6539\u5B8C\u53EA\u80FD\u6C47\u62A5\u300C\u9700\u8981\u91CD\u542F\u624D\u751F\u6548\u300D\uFF0C\u7136\u540E\u505C\u624B\u7B49\u7528\u6237\u53D1\u8BDD\u3002",
          "color": "red"
        },
        {
          "name": "\u5141\u8BB8",
          "content": "\u5141\u8BB8 agent \u5728\u6539\u52A8\u5B8C\u6210\u540E\u81EA\u884C\u6392\u7A0B\u91CD\u542F\uFF08\u7528\u5EF6\u8FDF\u65B9\u5F0F\uFF0C\u907F\u514D\u6253\u65AD\u6B63\u5728\u53D1\u9001\u7684\u56DE\u590D\uFF09\uFF0C\u5E76\u5728\u7559\u75D5\u91CC\u5199\u660E\u91CD\u542F\u539F\u56E0\u4E0E\u6392\u7A0B\u7F16\u53F7\u3002",
          "color": "blue"
        }
      ],
      "current": 0
    }
  }
];

// src/db.ts
var SEED_VERSION = "3";
var SYSTEM_TAGS = ["\u9ED8\u8BA4", "\u81EA\u5B9A\u4E49"];
function openMemoDb(dir) {
  const file = dir ? nodePath2.join(dir, "memo.db") : memoDbFile();
  if (!dir) nodeFs.mkdirSync(memoDir(), { recursive: true });
  else nodeFs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  ensureSchema(db);
  migrateColumns(db);
  seedIfNeeded(db);
  backfillOrigin(db);
  ensureSystemTags(db);
  migratePermissionsIntoEntities(db);
  return db;
}
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS iron_clauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grp TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      pos INTEGER NOT NULL DEFAULT 0,
      origin TEXT NOT NULL DEFAULT 'default',
      perm_enabled INTEGER NOT NULL DEFAULT 0,
      perm_current INTEGER
    );
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      keywords TEXT NOT NULL DEFAULT '[]',
      path TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'memo',
      enabled INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'custom',
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      perm_enabled INTEGER NOT NULL DEFAULT 0,
      perm_current INTEGER
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS card_tags (
      card_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (card_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      origin TEXT NOT NULL DEFAULT 'custom',
      enabled INTEGER NOT NULL DEFAULT 1,
      current_level INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS permission_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permission_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      pos INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'gray'
    );
    CREATE TABLE IF NOT EXISTS perm_tags (
      permission_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (permission_id, tag_id)
    );
    -- \u6743\u9650\u5E76\u5165\u5B9E\u4F53\uFF082026-10-15 \u7528\u6237\u53E3\u5F84\uFF09\uFF1A\u6863\u4F4D\u6302\u5728\u300C\u5361\u7247\u300D\u6216\u300C\u94C1\u6761\u4F8B\u300D\u4E0A
    CREATE TABLE IF NOT EXISTS perm_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_kind TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'gray',
      pos INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
function migrateColumns(db) {
  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((r) => String(r.name));
  for (const [table, dflt] of [["iron_clauses", "default"], ["cards", "custom"]]) {
    if (!cols(table).includes("origin")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN origin TEXT NOT NULL DEFAULT '${dflt}'`);
    }
  }
  if (!cols("cards").includes("deleted_at")) {
    db.exec(`ALTER TABLE cards ADD COLUMN deleted_at TEXT`);
  }
  if (!cols("cards").includes("version")) {
    db.exec(`ALTER TABLE cards ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
  }
  for (const t of ["cards", "iron_clauses"]) {
    const c = cols(t);
    if (!c.includes("perm_enabled")) db.exec(`ALTER TABLE ${t} ADD COLUMN perm_enabled INTEGER NOT NULL DEFAULT 0`);
    if (!c.includes("perm_current")) db.exec(`ALTER TABLE ${t} ADD COLUMN perm_current INTEGER`);
  }
  const lvlCols = db.prepare(`PRAGMA table_info(permission_levels)`).all().map((r) => String(r.name));
  if (!lvlCols.includes("color")) {
    db.exec(`ALTER TABLE permission_levels ADD COLUMN color TEXT NOT NULL DEFAULT 'gray'`);
    db.prepare(`UPDATE permission_levels SET color = 'red' WHERE name = '\u7981\u6B62'`).run();
    db.prepare(`UPDATE permission_levels SET color = 'blue' WHERE name = '\u5141\u8BB8'`).run();
  }
}
function ensureSystemTags(db) {
  const ins = db.prepare(`INSERT OR IGNORE INTO tags (name, system, created_at) VALUES (?, 1, ?)`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const n of SYSTEM_TAGS) ins.run(n, now);
}
function backfillOrigin(db) {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'origin_v2'`).get();
  if (done) return;
  db.exec("BEGIN");
  try {
    const setIron = db.prepare(`UPDATE iron_clauses SET origin = 'default' WHERE title = ?`);
    for (const c of IRON_CLAUSES) setIron.run(c.title);
    const setCard = db.prepare(`UPDATE cards SET origin = ? WHERE name = ?`);
    for (const c of SEED_RULES) setCard.run(c.origin === "custom" ? "custom" : "default", c.name);
    for (const c of SAMPLE_CARDS) setCard.run("default", c.name);
    db.prepare(`INSERT INTO meta (key, value) VALUES ('origin_v2', '1')`).run();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function seedIfNeeded(db) {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'seed_version'`).get();
  if (done) return false;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insClause = db.prepare(
    `INSERT INTO iron_clauses (grp, title, path, content, pos, origin) VALUES (?, ?, ?, ?, ?, 'default')`
  );
  const insCard = db.prepare(
    `INSERT INTO cards (name, keywords, path, state, enabled, content, created_at, updated_at, origin)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
  );
  db.exec("BEGIN");
  try {
    IRON_CLAUSES.forEach((c, i) => insClause.run(c.group, c.title, c.path, c.content, i));
    for (const s of SEED_RULES) {
      insCard.run(s.name, JSON.stringify(s.keywords), s.path, "rule", s.content, now, now, s.origin ?? "default");
    }
    for (const s of SAMPLE_CARDS) {
      insCard.run(s.name, JSON.stringify(s.keywords), s.path, "memo", s.content, now, now, "default");
      const perm = s.perm;
      if (perm?.levels?.length) {
        const cardId = Number(db.prepare(`SELECT id FROM cards WHERE name = ?`).get(s.name).id);
        const insLvl = db.prepare(
          `INSERT INTO perm_levels (owner_kind, owner_id, name, content, color, pos) VALUES ('card', ?, ?, ?, ?, ?)`
        );
        perm.levels.forEach((l, i) => insLvl.run(cardId, l.name, l.content, l.color, i));
        const lvls = listPermLevels(db, "card", cardId);
        const cur = lvls[Math.max(0, Math.min(lvls.length - 1, Number(perm.current) || 0))];
        db.prepare(`UPDATE cards SET perm_enabled = 1, perm_current = ? WHERE id = ?`).run(cur ? cur.id : null, cardId);
      }
    }
    db.prepare(`INSERT INTO meta (key, value) VALUES ('seed_version', ?)`).run(SEED_VERSION);
    db.prepare(`INSERT INTO meta (key, value) VALUES ('index_note', ?)`).run(INDEX_NOTE);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return true;
}
function readIndexNote(db) {
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'index_note'`).get();
  if (row?.value) return { text: String(row.value), fallback: false };
  return { text: INDEX_NOTE, fallback: true };
}
function parseKeywords(raw) {
  try {
    const a = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}
var asOrigin = (v) => v === "default" ? "default" : "custom";
function tagMap(db) {
  const rows = db.prepare(
    `SELECT ct.card_id, t.id, t.name, t.system FROM card_tags ct JOIN tags t ON t.id = ct.tag_id ORDER BY t.system DESC, t.id`
  ).all();
  const m = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const arr = m.get(Number(r.card_id)) ?? [];
    arr.push({ id: Number(r.id), name: String(r.name), system: Number(r.system) === 1 });
    m.set(Number(r.card_id), arr);
  }
  return m;
}
function toCard(db, row, tags) {
  const ps = getPermState(db, "card", Number(row.id));
  return {
    id: Number(row.id),
    name: String(row.name),
    keywords: parseKeywords(row.keywords),
    path: String(row.path),
    state: row.state === "rule" ? "rule" : "memo",
    enabled: Number(row.enabled) === 1,
    origin: asOrigin(row.origin),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    version: Number(row.version ?? 1),
    tags,
    permEnabled: ps.enabled,
    permLevels: ps.levels,
    permCurrentLevelId: ps.currentLevelId,
    permCurrentLevelName: ps.currentLevelName
  };
}
function listIron(db) {
  const rows = db.prepare(`SELECT * FROM iron_clauses ORDER BY pos, id`).all();
  return rows.map((r) => ({
    id: Number(r.id),
    group: String(r.grp),
    title: String(r.title),
    path: String(r.path),
    content: String(r.content),
    origin: asOrigin(r.origin),
    permEnabled: getPermState(db, "iron", Number(r.id)).enabled,
    permLevels: getPermState(db, "iron", Number(r.id)).levels,
    permCurrentLevelId: getPermState(db, "iron", Number(r.id)).currentLevelId,
    permCurrentLevelName: getPermState(db, "iron", Number(r.id)).currentLevelName
  }));
}
var ORDER_SQL = `ORDER BY CASE origin WHEN 'default' THEN 0 ELSE 1 END, enabled DESC, updated_at DESC, id`;
function listCards(db, state, opts = {}) {
  const where = [];
  const args = [];
  if (state) {
    where.push("state = ?");
    args.push(state);
  }
  if (!opts.deleted) where.push("deleted_at IS NULL");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM cards ${whereSql} ${ORDER_SQL}`).all(...args);
  const tm = tagMap(db);
  return rows.map((r) => toCard(db, r, tm.get(Number(r.id)) ?? []));
}
function listTrash(db) {
  const rows = db.prepare(`SELECT * FROM cards WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`).all();
  const tm = tagMap(db);
  return rows.map((r) => toCard(db, r, tm.get(Number(r.id)) ?? []));
}
function rowById(db, id) {
  const row = db.prepare(`SELECT * FROM cards WHERE id = ?`).get(id);
  if (!row) return null;
  return toCard(db, row, tagMap(db).get(id) ?? []);
}
function getCardByPath(db, path) {
  const row = db.prepare(`SELECT * FROM cards WHERE path = ?`).get(path);
  if (!row) return null;
  return toCard(db, row, tagMap(db).get(Number(row.id)) ?? []);
}
var getCardById = rowById;
function setCardEnabled(db, id, enabled) {
  if (!rowById(db, id)) return null;
  db.prepare(`UPDATE cards SET enabled = ?, updated_at = ? WHERE id = ?`).run(enabled ? 1 : 0, (/* @__PURE__ */ new Date()).toISOString(), id);
  return rowById(db, id);
}
function setCardState(db, id, state) {
  if (!rowById(db, id)) return null;
  db.prepare(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`).run(state, (/* @__PURE__ */ new Date()).toISOString(), id);
  return rowById(db, id);
}
function pathFor(state, name2) {
  return state === "rule" ? `\u89C4\u77E9/\u52A8\u6001/${name2}.md` : `\u5907\u5FD8/${name2}.md`;
}
function lazyPatchVersion(patch, cur) {
  const v = Number(patch?.version);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : cur + 1;
}
function setCardTags(db, cardId, tagIds) {
  db.prepare(`DELETE FROM card_tags WHERE card_id = ?`).run(cardId);
  const ins = db.prepare(`INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)`);
  for (const t of tagIds) {
    const exists = db.prepare(`SELECT id FROM tags WHERE id = ?`).get(t);
    if (exists) ins.run(cardId, t);
  }
}
function createCard(db, draft, state = "memo") {
  const name2 = draft.name.trim();
  if (!name2) throw new Error("\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A");
  const p = pathFor(state, name2);
  if (db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name2)) throw new Error(`\u5DF2\u5B58\u5728\u540C\u540D\u5361\u7247\uFF1A${name2}`);
  if (db.prepare(`SELECT id FROM cards WHERE path = ?`).get(p)) throw new Error(`\u8DEF\u5F84\u5DF2\u88AB\u5360\u7528\uFF1A${p}`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ver = Number.isFinite(Number(draft.version)) && Number(draft.version) > 0 ? Math.floor(Number(draft.version)) : 1;
  db.prepare(
    `INSERT INTO cards (name, keywords, path, state, enabled, content, created_at, updated_at, origin, version)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'custom', ?)`
  ).run(name2, JSON.stringify(draft.keywords ?? []), p, state, draft.content ?? "", now, now, ver);
  const id = Number(db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name2).id);
  if (draft.tagIds?.length) setCardTags(db, id, draft.tagIds);
  return rowById(db, id);
}
function updateCard(db, id, patch) {
  const cur = rowById(db, id);
  if (!cur) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  const name2 = patch.name === void 0 ? cur.name : String(patch.name).trim();
  if (!name2) throw new Error("\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A");
  if (name2 !== cur.name && db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name2)) {
    throw new Error(`\u5DF2\u5B58\u5728\u540C\u540D\u5361\u7247\uFF1A${name2}`);
  }
  const p = name2 === cur.name ? cur.path : pathFor(cur.state, name2);
  if (p !== cur.path && db.prepare(`SELECT id FROM cards WHERE path = ?`).get(p)) {
    throw new Error(`\u8DEF\u5F84\u5DF2\u88AB\u5360\u7528\uFF1A${p}`);
  }
  const ver = lazyPatchVersion(patch, cur.version);
  db.prepare(
    `UPDATE cards SET name = ?, keywords = ?, path = ?, content = ?, version = ?, updated_at = ? WHERE id = ?`
  ).run(
    name2,
    JSON.stringify(patch.keywords === void 0 ? cur.keywords : patch.keywords),
    p,
    patch.content === void 0 ? cur.content : String(patch.content),
    ver,
    (/* @__PURE__ */ new Date()).toISOString(),
    id
  );
  if (patch.tagIds !== void 0) setCardTags(db, id, patch.tagIds);
  return rowById(db, id);
}
function copyCard(db, id) {
  const src = rowById(db, id);
  if (!src) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  let name2 = `${src.name}_\u526F\u672C`;
  let n = 2;
  while (db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name2)) name2 = `${src.name}_\u526F\u672C${n++}`;
  return createCard(db, { name: name2, keywords: src.keywords, content: src.content, tagIds: src.tags.map((t) => t.id) }, "memo");
}
function touchCard(db, id) {
  if (!rowById(db, id)) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  db.prepare(`UPDATE cards SET updated_at = ? WHERE id = ?`).run((/* @__PURE__ */ new Date()).toISOString(), id);
  return rowById(db, id);
}
function deleteCard(db, id) {
  if (!rowById(db, id)) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  db.prepare(`UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?`).run((/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString(), id);
  return rowById(db, id);
}
function restoreCard(db, id) {
  if (!rowById(db, id)) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  db.prepare(`UPDATE cards SET deleted_at = NULL, updated_at = ? WHERE id = ?`).run((/* @__PURE__ */ new Date()).toISOString(), id);
  return rowById(db, id);
}
function purgeCard(db, id) {
  if (!rowById(db, id)) throw new Error(`\u672A\u627E\u5230\u5361\u7247 id=${id}`);
  db.prepare(`DELETE FROM card_tags WHERE card_id = ?`).run(id);
  db.prepare(`DELETE FROM cards WHERE id = ?`).run(id);
}
function listTags(db) {
  const rows = db.prepare(
    `SELECT t.id, t.name, t.system,
            CASE
              WHEN t.name = '\u9ED8\u8BA4' THEN (SELECT COUNT(*) FROM cards WHERE origin = 'default' AND deleted_at IS NULL)
              WHEN t.name = '\u81EA\u5B9A\u4E49' THEN (SELECT COUNT(*) FROM cards WHERE origin = 'custom' AND deleted_at IS NULL)
              ELSE (SELECT COUNT(*) FROM card_tags ct JOIN cards c ON c.id = ct.card_id
                     WHERE ct.tag_id = t.id AND c.deleted_at IS NULL)
            END AS cnt
     FROM tags t ORDER BY t.system DESC, t.id`
  ).all();
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), system: Number(r.system) === 1, count: Number(r.cnt) }));
}
function createTag(db, name2) {
  const n = String(name2 ?? "").trim();
  if (!n) throw new Error("\u6807\u7B7E\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  if (db.prepare(`SELECT id FROM tags WHERE name = ?`).get(n)) throw new Error(`\u6807\u7B7E\u5DF2\u5B58\u5728\uFF1A${n}`);
  db.prepare(`INSERT INTO tags (name, system, created_at) VALUES (?, 0, ?)`).run(n, (/* @__PURE__ */ new Date()).toISOString());
  const row = db.prepare(`SELECT * FROM tags WHERE name = ?`).get(n);
  return { id: Number(row.id), name: String(row.name), system: false, count: 0 };
}
function renameTag(db, id, name2) {
  const cur = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id);
  if (!cur) throw new Error(`\u672A\u627E\u5230\u6807\u7B7E id=${id}`);
  if (Number(cur.system) === 1) throw new Error(`\u7CFB\u7EDF\u6807\u7B7E\u300C${cur.name}\u300D\u4E0D\u53EF\u4FEE\u6539\uFF08\u9ED8\u8BA4 / \u81EA\u5B9A\u4E49\u7531\u7CFB\u7EDF\u7EF4\u62A4\uFF09`);
  const n = String(name2 ?? "").trim();
  if (!n) throw new Error("\u6807\u7B7E\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  if (db.prepare(`SELECT id FROM tags WHERE name = ? AND id <> ?`).get(n, id)) throw new Error(`\u6807\u7B7E\u5DF2\u5B58\u5728\uFF1A${n}`);
  db.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(n, id);
  return { id, name: n, system: false, count: 0 };
}
function deleteTag(db, id) {
  const cur = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id);
  if (!cur) throw new Error(`\u672A\u627E\u5230\u6807\u7B7E id=${id}`);
  if (Number(cur.system) === 1) throw new Error(`\u7CFB\u7EDF\u6807\u7B7E\u300C${cur.name}\u300D\u4E0D\u53EF\u5220\u9664`);
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM card_tags WHERE tag_id = ?`).run(id);
    db.prepare(`DELETE FROM tags WHERE id = ?`).run(id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function setCardsState(db, ids, state) {
  const st = db.prepare(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(state, now, id).changes);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return n;
}
function setCardsEnabled(db, ids, enabled) {
  const st = db.prepare(`UPDATE cards SET enabled = ?, updated_at = ? WHERE id = ?`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(enabled ? 1 : 0, now, id).changes);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return n;
}
function deleteCards(db, ids) {
  const st = db.prepare(`UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?`);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(now, now, id).changes);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return n;
}
var DEFAULT_LEVELS = [
  { name: "\u7981\u6B62", content: "", color: "red" },
  { name: "\u5141\u8BB8", content: "", color: "blue" }
];
var LEGACY_PERM_MAP = [
  { permName: "\u662F\u5426\u5141\u8BB8 agent \u81EA\u884C\u6DFB\u52A0\u624B\u8BB0\u5361\u7247", kind: "iron", ownerName: "\u624B\u8BB0\u5361\u7247\u7EF4\u62A4" },
  { permName: "\u662F\u5426\u5141\u8BB8 agent \u81EA\u884C\u91CD\u542F DSH", kind: "card", ownerName: "DSH\u91CD\u542F\u65B9\u5F0F" }
];
function ownerExists(db, kind, ownerId) {
  return !!db.prepare(`SELECT id FROM ${kind === "card" ? "cards" : "iron_clauses"} WHERE id = ?`).get(ownerId);
}
function listPermLevels(db, kind, ownerId) {
  const rows = db.prepare(
    `SELECT * FROM perm_levels WHERE owner_kind = ? AND owner_id = ? ORDER BY pos, id`
  ).all(kind, ownerId);
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    content: String(r.content ?? ""),
    color: String(r.color ?? "gray"),
    pos: Number(r.pos ?? 0)
  }));
}
function getPermState(db, kind, ownerId) {
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  const row = db.prepare(`SELECT perm_enabled, perm_current FROM ${tbl} WHERE id = ?`).get(ownerId);
  const levels = listPermLevels(db, kind, ownerId);
  const cur = levels.find((l) => l.id === Number(row?.perm_current)) ?? levels[0] ?? null;
  return {
    enabled: Number(row?.perm_enabled) === 1,
    currentLevelId: cur ? cur.id : null,
    currentLevelName: cur ? cur.name : "\uFF08\u65E0\u6863\u4F4D\uFF09",
    levels
  };
}
function refreshPerm(db, kind, ownerId) {
  return getPermState(db, kind, ownerId);
}
function setPermEnabled(db, kind, ownerId, enabled) {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`\u672A\u627E\u5230${kind === "card" ? "\u5361\u7247" : "\u94C1\u6761\u4F8B"} id=${ownerId}`);
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  if (enabled && listPermLevels(db, kind, ownerId).length === 0) {
    addPermLevel(db, kind, ownerId, DEFAULT_LEVELS[0].name, DEFAULT_LEVELS[0].content, DEFAULT_LEVELS[0].color);
    addPermLevel(db, kind, ownerId, DEFAULT_LEVELS[1].name, DEFAULT_LEVELS[1].content, DEFAULT_LEVELS[1].color);
  }
  db.prepare(`UPDATE ${tbl} SET perm_enabled = ?${kind === "card" ? ", updated_at = ?" : ""} WHERE id = ?`).run(...kind === "card" ? [enabled ? 1 : 0, (/* @__PURE__ */ new Date()).toISOString(), ownerId] : [enabled ? 1 : 0, ownerId]);
  const st = getPermState(db, kind, ownerId);
  if (st.enabled && st.currentLevelId == null && st.levels.length) {
    db.prepare(`UPDATE ${tbl} SET perm_current = ? WHERE id = ?`).run(st.levels[0].id, ownerId);
  }
  return refreshPerm(db, kind, ownerId);
}
function setPermCurrentLevel(db, kind, ownerId, levelId) {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`\u672A\u627E\u5230${kind === "card" ? "\u5361\u7247" : "\u94C1\u6761\u4F8B"} id=${ownerId}`);
  if (!listPermLevels(db, kind, ownerId).some((l) => l.id === levelId)) throw new Error(`\u6863\u4F4D ${levelId} \u4E0D\u5C5E\u4E8E\u8BE5\u5B9E\u4F53`);
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  db.prepare(`UPDATE ${tbl} SET perm_current = ?${kind === "card" ? ", updated_at = ?" : ""} WHERE id = ?`).run(...kind === "card" ? [levelId, (/* @__PURE__ */ new Date()).toISOString(), ownerId] : [levelId, ownerId]);
  return refreshPerm(db, kind, ownerId);
}
function addPermLevel(db, kind, ownerId, name2, content = "", color = "gray") {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`\u672A\u627E\u5230${kind === "card" ? "\u5361\u7247" : "\u94C1\u6761\u4F8B"} id=${ownerId}`);
  const n = String(name2 ?? "").trim();
  if (!n) throw new Error("\u6863\u4F4D\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  const pos = Number(db.prepare(
    `SELECT COALESCE(MAX(pos), -1) + 1 AS p FROM perm_levels WHERE owner_kind = ? AND owner_id = ?`
  ).get(kind, ownerId).p);
  db.prepare(`INSERT INTO perm_levels (owner_kind, owner_id, name, content, color, pos) VALUES (?, ?, ?, ?, ?, ?)`).run(kind, ownerId, n, String(content ?? ""), String(color || "gray"), pos);
  const before = db.prepare(
    `SELECT perm_current FROM ${kind === "card" ? "cards" : "iron_clauses"} WHERE id = ?`
  ).get(ownerId);
  if (before?.perm_current == null) {
    const first = listPermLevels(db, kind, ownerId)[0];
    if (first) setPermCurrentLevel(db, kind, ownerId, first.id);
  }
  return refreshPerm(db, kind, ownerId);
}
function updatePermLevel(db, levelId, patch) {
  const row = db.prepare(`SELECT * FROM perm_levels WHERE id = ?`).get(levelId);
  if (!row) throw new Error(`\u672A\u627E\u5230\u6863\u4F4D id=${levelId}`);
  const name2 = patch.name === void 0 ? String(row.name) : String(patch.name).trim();
  if (!name2) throw new Error("\u6863\u4F4D\u540D\u4E0D\u80FD\u4E3A\u7A7A");
  db.prepare(`UPDATE perm_levels SET name = ?, content = ?, color = ? WHERE id = ?`).run(
    name2,
    patch.content === void 0 ? String(row.content ?? "") : String(patch.content),
    patch.color === void 0 ? String(row.color ?? "gray") : String(patch.color || "gray"),
    levelId
  );
  return refreshPerm(db, String(row.owner_kind), Number(row.owner_id));
}
function deletePermLevel(db, levelId) {
  const row = db.prepare(`SELECT * FROM perm_levels WHERE id = ?`).get(levelId);
  if (!row) throw new Error(`\u672A\u627E\u5230\u6863\u4F4D id=${levelId}`);
  const kind = String(row.owner_kind);
  const ownerId = Number(row.owner_id);
  if (listPermLevels(db, kind, ownerId).length <= 1) throw new Error("\u81F3\u5C11\u8981\u4FDD\u7559\u4E00\u4E2A\u6863\u4F4D");
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM perm_levels WHERE id = ?`).run(levelId);
    const tbl = kind === "card" ? "cards" : "iron_clauses";
    const cur = db.prepare(`SELECT perm_current FROM ${tbl} WHERE id = ?`).get(ownerId);
    if (Number(cur?.perm_current) === levelId) {
      const first = listPermLevels(db, kind, ownerId)[0];
      if (first) db.prepare(`UPDATE ${tbl} SET perm_current = ? WHERE id = ?`).run(first.id, ownerId);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return refreshPerm(db, kind, ownerId);
}
function migratePermissionsIntoEntities(db) {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'perm_merged_v1'`).get();
  if (done) return;
  let legacy = [];
  try {
    legacy = db.prepare(`SELECT id, name, origin, enabled, current_level FROM permissions WHERE deleted_at IS NULL`).all();
  } catch {
    legacy = [];
  }
  db.exec("BEGIN");
  try {
    for (const p of legacy) {
      const map = LEGACY_PERM_MAP.find((m) => m.permName === String(p.name));
      if (!map) continue;
      const tbl = map.kind === "card" ? "cards" : "iron_clauses";
      const col = map.kind === "card" ? "name" : "title";
      const owner = db.prepare(`SELECT id FROM ${tbl} WHERE ${col} = ?`).get(map.ownerName);
      if (!owner) continue;
      const ownerId = Number(owner.id);
      if (listPermLevels(db, map.kind, ownerId).length) continue;
      const lvls = db.prepare(`SELECT * FROM permission_levels WHERE permission_id = ? ORDER BY pos, id`).all(Number(p.id));
      let currentId = null;
      for (const l of lvls) {
        const st = addPermLevel(db, map.kind, ownerId, String(l.name), String(l.content ?? ""), String(l.color ?? "gray"));
        if (Number(p.current_level) === Number(l.id)) currentId = st.levels[st.levels.length - 1].id;
      }
      if (currentId == null) {
        const first = listPermLevels(db, map.kind, ownerId)[0];
        currentId = first ? first.id : null;
      }
      db.prepare(`UPDATE ${tbl} SET perm_enabled = 1, perm_current = ? WHERE id = ?`).run(currentId, ownerId);
    }
    for (const m of LEGACY_PERM_MAP) {
      const tbl = m.kind === "card" ? "cards" : "iron_clauses";
      const col = m.kind === "card" ? "name" : "title";
      const owner = db.prepare(`SELECT id FROM ${tbl} WHERE ${col} = ?`).get(m.ownerName);
      if (!owner) continue;
      const ownerId = Number(owner.id);
      if (listPermLevels(db, m.kind, ownerId).length) continue;
      db.prepare(`UPDATE ${tbl} SET perm_enabled = 1 WHERE id = ?`).run(ownerId);
      setPermEnabled(db, m.kind, ownerId, true);
    }
    db.prepare(`INSERT INTO meta (key, value) VALUES ('perm_merged_v1', '1')`).run();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function permOwnerOfLevel(db, levelId) {
  const row = db.prepare(`SELECT owner_kind, owner_id FROM perm_levels WHERE id = ?`).get(levelId);
  if (!row) return null;
  return { kind: String(row.owner_kind), ownerId: Number(row.owner_id) };
}
function permForInject(db, kind, ownerId) {
  const st = getPermState(db, kind, ownerId);
  if (!st.enabled || !st.currentLevelId) return null;
  const cur = st.levels.find((l) => l.id === st.currentLevelId);
  return { levelName: st.currentLevelName, content: (cur?.content ?? "").trim() };
}

// src/inject.ts
var INJECT_TAG = "nio-memo";
function buildInjectText(db) {
  const iron = listIron(db);
  const cards = listCards(db);
  const rules = cards.filter((c) => c.state === "rule" && c.enabled);
  const memos = cards.filter((c) => c.state === "memo" && c.enabled);
  const offCount = cards.filter((c) => !c.enabled).length;
  const parts = ["", `<${INJECT_TAG}>`];
  if (iron.length) {
    parts.push("\u{1F4CC} \u624B\u8BB0 \xB7 \u89C4\u77E9\uFF08\u94C1\u5F8B \xB7 \u9501\u6B7B\uFF0C\u6BCF\u8F6E\u5FC5\u8BFB\uFF09");
    for (const c of iron) {
      parts.push(c.content.trim());
      if (c.permEnabled) {
        const p = permForInject(db, "iron", c.id);
        if (p) parts.push(`**\u21E2 \u5F53\u524D\u6863\u4F4D\uFF1A${p.levelName}**
${p.content || "\uFF08\u6863\u4F4D\u5185\u5BB9\u4E3A\u7A7A\uFF09"}`);
      }
    }
  } else {
    parts.push("\u26A0\uFE0F \u624B\u8BB0 \xB7 \u89C4\u77E9\uFF08\u94C1\u5F8B\uFF09\u4E3A\u7A7A\u2014\u2014\u5F53\u524D\u5E93\u65E0\u4EFB\u4F55\u94C1\u5F8B\u6761\u4F8B\uFF08\u975E\u6B63\u5E38\u72B6\u6001\uFF0C\u8BF7\u6838\u5BF9\u5E93\u5185\u5BB9\uFF09\u3002");
  }
  if (rules.length) {
    parts.push("", "\u{1F4CC} \u624B\u8BB0 \xB7 \u52A8\u6001\u89C4\u77E9\uFF08\u542F\u7528\u4E2D \xB7 \u6BCF\u8F6E\u5168\u6587\u6CE8\u5165\uFF09");
    for (const c of rules) {
      parts.push(`### ${c.name}
${c.content.trim()}`);
      if (c.permEnabled) {
        const p = permForInject(db, "card", c.id);
        if (p) parts.push(`**\u21E2 \u5F53\u524D\u6863\u4F4D\uFF1A${p.levelName}**
${p.content || "\uFF08\u6863\u4F4D\u5185\u5BB9\u4E3A\u7A7A\uFF09"}`);
      }
    }
  }
  const note = readIndexNote(db);
  parts.push("", "\u{1F4CC} \u624B\u8BB0 \xB7 \u5907\u5FD8\u7D22\u5F15\uFF08\u547D\u4E2D\u5173\u952E\u8BCD \u2192 \u7528 nio_memo(\u8DEF\u5F84) \u53D6\u5168\u6587\uFF09");
  parts.push(note.text.trim());
  if (note.fallback) parts.push("\u26A0\uFE0F \u7D22\u5F15\u8BF4\u660E\u672A\u843D\u5E93\uFF0C\u672C\u6B21\u4F7F\u7528\u5185\u7F6E\u515C\u5E95\u6587\u672C\uFF08\u7981\u9759\u9ED8\u515C\u5E95\uFF1A\u6B64\u4E3A\u663E\u5F0F\u63D0\u793A\uFF09\u3002");
  const permMemos = memos.filter((c) => c.permEnabled);
  const plainMemos = memos.filter((c) => !c.permEnabled);
  if (permMemos.length) {
    parts.push("", "\u{1F4CC} \u624B\u8BB0 \xB7 \u5907\u5FD8\uFF08\u5DF2\u5F00\u542F\u6743\u9650 \xB7 \u5168\u6587\u6CE8\u5165\uFF1A\u5361\u5185\u5BB9 + \u5F53\u524D\u6863\u4F4D\uFF09");
    for (const c of permMemos) {
      const p = permForInject(db, "card", c.id);
      parts.push(`### ${c.name}${p ? ` \uFF5C \u5F53\u524D\u6863\u4F4D\uFF1A${p.levelName}` : ""}`);
      parts.push(c.content.trim() || "\uFF08\u5361\u7247\u5185\u5BB9\u4E3A\u7A7A\uFF09");
      if (p) parts.push(`**\u21E2 \u5F53\u524D\u6863\u4F4D\u5185\u5BB9\uFF1A**
${p.content || "\uFF08\u6863\u4F4D\u5185\u5BB9\u4E3A\u7A7A\uFF09"}`);
    }
  }
  if (plainMemos.length) {
    for (const c of plainMemos) {
      const kw = c.keywords.length ? c.keywords.join("\u3001") : "\uFF08\u65E0\uFF09";
      parts.push(`- ${c.name} \uFF5C \u5173\u952E\u8BCD\uFF1A${kw} \uFF5C \u8DEF\u5F84\uFF1A${c.path}`);
    }
  } else if (!permMemos.length) {
    parts.push("- \uFF08\u6682\u65E0\u542F\u7528\u4E2D\u7684\u5907\u5FD8\u5361\uFF09");
  }
  if (offCount > 0) parts.push(`\uFF08\u53E6\u6709 ${offCount} \u5F20\u5361\u7247\u5DF2\u505C\u7528\uFF0C\u672A\u6CE8\u5165\uFF09`);
  parts.push(`</${INJECT_TAG}>`, "");
  return parts.join("\n");
}

// src/api.ts
function normKeywords(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}
function normIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isInteger(n));
}
function json(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
function installApi(ctx, deps) {
  return ctx.webServer.register({
    kind: "prefix",
    path: "/nio-memo",
    handler: async (req, res) => {
      const urlPath = (req.url ?? "").split("?")[0] ?? "";
      let db;
      try {
        db = deps.getDb();
      } catch (e) {
        json(res, 200, { ok: false, error: `\u624B\u8BB0\u5E93\u6253\u5F00\u5931\u8D25\uFF1A${String(e?.message || e).slice(0, 200)}` });
        return;
      }
      try {
        const isPost = req.method === "POST";
        const body = async () => JSON.parse(await readBody(req) || "{}");
        if (req.method === "GET" && urlPath.endsWith("/api/all")) {
          const cards = listCards(db);
          json(res, 200, {
            ok: true,
            iron: listIron(db).map(({ group, permEnabled, permLevels, permCurrentLevelId, permCurrentLevelName, ...rest }) => ({
              ...rest,
              permEnabled,
              permLevels,
              permCurrentLevelId,
              permCurrentLevelName
            })),
            rules: cards.filter((c) => c.state === "rule"),
            memos: cards.filter((c) => c.state === "memo"),
            tags: listTags(db),
            trashCount: listTrash(db).length
          });
          return;
        }
        if (req.method === "GET" && urlPath.endsWith("/api/trash")) {
          json(res, 200, { ok: true, cards: listTrash(db) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/create")) {
          const b = await body();
          const card = createCard(db, {
            name: String(b?.name ?? ""),
            keywords: normKeywords(b?.keywords),
            content: String(b?.content ?? ""),
            tagIds: normIds(b?.tagIds),
            version: b?.version === void 0 || b?.version === "" ? void 0 : Number(b.version)
          });
          json(res, 200, { ok: true, card });
          return;
        }
        if (isPost && urlPath.endsWith("/api/update")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          const patch = {};
          if (b?.version !== void 0 && b?.version !== "") patch.version = Number(b.version);
          if (b?.name !== void 0) patch.name = String(b.name);
          if (b?.keywords !== void 0) patch.keywords = normKeywords(b.keywords);
          if (b?.content !== void 0) patch.content = String(b.content);
          if (b?.tagIds !== void 0) patch.tagIds = normIds(b.tagIds);
          json(res, 200, { ok: true, card: updateCard(db, id, patch) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/copy")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          json(res, 200, { ok: true, card: copyCard(db, id) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/toggle")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          const cur = listCards(db, void 0, { deleted: true }).find((c) => c.id === id);
          if (!cur) {
            json(res, 200, { ok: false, error: `\u672A\u627E\u5230\u5361\u7247 id=${id}` });
            return;
          }
          json(res, 200, { ok: true, card: setCardEnabled(db, id, !cur.enabled) });
          return;
        }
        if (isPost && (urlPath.endsWith("/api/promote") || urlPath.endsWith("/api/demote"))) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          const target = urlPath.endsWith("/api/promote") ? "rule" : "memo";
          const card = setCardState(db, id, target);
          if (!card) {
            json(res, 200, { ok: false, error: `\u672A\u627E\u5230\u5361\u7247 id=${id}` });
            return;
          }
          json(res, 200, { ok: true, card });
          return;
        }
        if (isPost && urlPath.endsWith("/api/touch")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          json(res, 200, { ok: true, card: touchCard(db, id) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/delete")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          json(res, 200, { ok: true, card: deleteCard(db, id) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/restore")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          json(res, 200, { ok: true, card: restoreCard(db, id) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/purge")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          purgeCard(db, id);
          json(res, 200, { ok: true });
          return;
        }
        if (isPost && urlPath.endsWith("/api/card/tags")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          setCardTags(db, id, normIds(b?.tagIds));
          const card = listCards(db, void 0, { deleted: true }).find((c) => c.id === id) ?? null;
          json(res, 200, { ok: true, card });
          return;
        }
        if (isPost && urlPath.endsWith("/api/tags/create")) {
          const b = await body();
          json(res, 200, { ok: true, tag: createTag(db, String(b?.name ?? "")) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/tags/rename")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          json(res, 200, { ok: true, tag: renameTag(db, id, String(b?.name ?? "")) });
          return;
        }
        if (isPost && urlPath.endsWith("/api/tags/delete")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 id" });
            return;
          }
          deleteTag(db, id);
          json(res, 200, { ok: true });
          return;
        }
        const permOwner = async () => {
          const b = await body();
          const kind = b?.kind === "iron" ? "iron" : "card";
          const id = Number(b?.id);
          if (!Number.isInteger(id)) return null;
          return { b, kind, id };
        };
        const withOwner = (kind, id, perm) => ({
          ok: true,
          kind,
          id,
          perm,
          ...kind === "card" ? { card: getCardById(db, id) } : { clause: listIron(db).find((c) => c.id === id) ?? null }
        });
        if (isPost && urlPath.endsWith("/api/perm/enable")) {
          const o = await permOwner();
          if (!o) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 kind / id" });
            return;
          }
          const st = setPermEnabled(db, o.kind, o.id, !!o.b?.enabled);
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }
        if (isPost && urlPath.endsWith("/api/perm/current")) {
          const o = await permOwner();
          if (!o) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 kind / id" });
            return;
          }
          const levelId = Number(o.b?.levelId);
          if (!Number.isInteger(levelId)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 levelId" });
            return;
          }
          const st = setPermCurrentLevel(db, o.kind, o.id, levelId);
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }
        if (isPost && urlPath.endsWith("/api/perm/level/add")) {
          const o = await permOwner();
          if (!o) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 kind / id" });
            return;
          }
          const st = addPermLevel(db, o.kind, o.id, String(o.b?.name ?? ""), String(o.b?.content ?? ""), String(o.b?.color ?? "gray"));
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }
        if (isPost && urlPath.endsWith("/api/perm/level/update")) {
          const b = await body();
          const levelId = Number(b?.levelId);
          if (!Number.isInteger(levelId)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 levelId" });
            return;
          }
          const patch = {};
          if (b?.name !== void 0) patch.name = String(b.name);
          if (b?.content !== void 0) patch.content = String(b.content);
          if (b?.color !== void 0) patch.color = String(b.color);
          const st = updatePermLevel(db, levelId, patch);
          const owner = permOwnerOfLevel(db, levelId);
          json(res, 200, owner ? withOwner(owner.kind, owner.ownerId, st) : { ok: true, perm: st });
          return;
        }
        if (isPost && urlPath.endsWith("/api/perm/level/delete")) {
          const b = await body();
          const levelId = Number(b?.levelId);
          if (!Number.isInteger(levelId)) {
            json(res, 200, { ok: false, error: "\u7F3A\u5C11\u5408\u6CD5 levelId" });
            return;
          }
          const owner0 = permOwnerOfLevel(db, levelId);
          const st = deletePermLevel(db, levelId);
          json(res, 200, owner0 ? withOwner(owner0.kind, owner0.ownerId, st) : { ok: true, perm: st });
          return;
        }
        if (isPost && urlPath.endsWith("/api/batch")) {
          const b = await body();
          const ids = normIds(b?.ids);
          if (!ids.length) {
            json(res, 200, { ok: false, error: "\u6CA1\u6709\u9009\u4E2D\u4EFB\u4F55\u5361\u7247" });
            return;
          }
          const op = String(b?.op ?? "");
          let n = 0;
          if (op === "state") {
            const st = String(b?.state ?? "");
            if (st !== "memo" && st !== "rule") {
              json(res, 200, { ok: false, error: `\u975E\u6CD5\u76EE\u6807\u533A\uFF1A${st}` });
              return;
            }
            n = setCardsState(db, ids, st);
          } else if (op === "enable") n = setCardsEnabled(db, ids, true);
          else if (op === "disable") n = setCardsEnabled(db, ids, false);
          else if (op === "delete") n = deleteCards(db, ids);
          else {
            json(res, 200, { ok: false, error: `\u672A\u77E5\u6279\u91CF\u64CD\u4F5C\uFF1A${op}` });
            return;
          }
          json(res, 200, { ok: true, changed: n });
          return;
        }
        json(res, 404, { ok: false, error: `\u672A\u77E5\u7AEF\u70B9\uFF1A${req.method} ${urlPath}` });
      } catch (e) {
        json(res, 200, { ok: false, error: `\u5904\u7406\u5931\u8D25\uFF1A${String(e?.message || e).slice(0, 200)}` });
      }
    }
  });
}

// src/index.ts
var name = "dsh-nio-memo";
var inject = ["systemPrompt", "tools"];
function apply(ctx) {
  let db = null;
  const getDb = () => {
    if (!db) db = openMemoDb();
    return db;
  };
  ctx.systemPrompt.section({
    name: "nio-memo",
    order: 122,
    text: () => {
      try {
        return buildInjectText(getDb());
      } catch (e) {
        const msg = String(e?.message || e).slice(0, 200);
        console.error(`[dsh-nio-memo] \u6CE8\u5165\u5931\u8D25\uFF1A${msg}\uFF08\u5E93\uFF1A${memoDbFile()}\uFF09`);
        return `
\u26A0\uFE0F \u624B\u8BB0\u6CE8\u5165\u5931\u8D25\uFF08\u663E\u5F0F\u544A\u8B66 \xB7 \u975E\u9759\u9ED8\u515C\u5E95\uFF09\uFF1A${msg}
\uFF08\u5E93\u6587\u4EF6\uFF1A${memoDbFile()}\uFF09
`;
      }
    }
  });
  ctx.tools.register(defineTool({
    name: "nio_memo",
    description: "\u8BFB\u53D6\u300C\u624B\u8BB0\u300D\u5361\u7247\u5168\u6587\u3002\u4F20\u7D22\u5F15\u91CC\u7ED9\u7684\u903B\u8F91\u8DEF\u5F84\uFF08\u5982 \u5907\u5FD8/\u672C\u673A\u4E3B\u673A102.md\uFF09\u3002\u5907\u5FD8\u5361\u547D\u4E2D\u5173\u952E\u8BCD\u65F6\u7528\u5B83\u53D6\u5168\u6587\uFF1B\u94C1\u5F8B\u6761\u4F8B\u4E0E\u52A8\u6001\u89C4\u77E9\u5DF2\u6BCF\u8F6E\u6CE8\u5165\u3001\u4E00\u822C\u65E0\u9700\u8C03\u7528\u3002\u505C\u7528\u5361\u7247\u4F1A\u88AB\u663E\u5F0F\u62D2\u7EDD\uFF08\u4E0D\u8FD4\u56DE\u7A7A\u5185\u5BB9\uFF09\u3002",
    parameters: {
      path: { type: "string", description: "\u5361\u7247\u903B\u8F91\u8DEF\u5F84\uFF08\u6765\u81EA\u624B\u8BB0\u7D22\u5F15\u6E05\u5355\u7684\u300C\u8DEF\u5F84\u300D\u5B57\u6BB5\uFF09" }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args) {
      const p = String(args?.path || "").trim();
      if (!p) return '\u672A\u63D0\u4F9B path\u3002\u7528\u6CD5\uFF1Anio_memo(path="\u5907\u5FD8/\u5361\u540D.md")';
      let card;
      try {
        card = getCardByPath(getDb(), p);
      } catch (e) {
        return `\u624B\u8BB0\u5E93\u4E0D\u53EF\u7528\uFF1A${String(e?.message || e).slice(0, 200)}`;
      }
      if (!card) return `\u672A\u627E\u5230\u624B\u8BB0\u5361\u7247\uFF1A\u300C${p}\u300D\u3002\u8BF7\u4F7F\u7528\u624B\u8BB0\u7D22\u5F15\u6E05\u5355\u91CC\u7ED9\u51FA\u7684\u8DEF\u5F84\u539F\u6587\u3002`;
      if (card.deletedAt) {
        return `\u8BE5\u624B\u8BB0\u5361\u7247\u5DF2\u5728\u56DE\u6536\u7AD9\uFF08${card.deletedAt}\uFF09\uFF0C\u4E0D\u5728\u6CE8\u5165\u7D22\u5F15\u4E2D\uFF0C\u6545\u4E0D\u8FD4\u56DE\u5185\u5BB9\uFF1A\u300C${card.name}\u300D\u3002\u9700\u8981\u7684\u8BDD\u8BF7\u5728\u300C\u624B\u8BB0\u300DTab \u7684\u56DE\u6536\u7AD9\u91CC\u6062\u590D\u3002`;
      }
      if (!card.enabled) {
        return `\u8BE5\u624B\u8BB0\u5361\u7247\u5DF2\u505C\u7528\uFF08\u4E0D\u5728\u6CE8\u5165\u7D22\u5F15\u4E2D\uFF0C\u6545\u4E0D\u8FD4\u56DE\u5185\u5BB9\uFF09\uFF1A\u300C${card.name}\u300D\uFF08\u8DEF\u5F84 ${card.path}\uFF09\u3002\u5982\u786E\u9700\uFF0C\u8BF7\u5728\u300C\u624B\u8BB0\u300DTab \u4E2D\u542F\u7528\u3002`;
      }
      const zone = card.state === "rule" ? "\u52A8\u6001\u89C4\u77E9" : "\u5907\u5FD8";
      return `# ${card.name}\uFF08${zone}\uFF09
\u8DEF\u5F84\uFF1A${card.path}
\u5173\u952E\u8BCD\uFF1A${card.keywords.join("\u3001") || "\uFF08\u65E0\uFF09"}

${card.content}`;
    }
  }));
  ctx.inject(["webServer"], (webCtx) => {
    installApi(webCtx, { getDb });
  });
}
export {
  apply,
  inject,
  name
};
