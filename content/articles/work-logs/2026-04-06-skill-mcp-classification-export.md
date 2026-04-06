---
title: "Skill/MCP 内外网分类与公网导出"
excerpt: "全面扫描 150+ Skill 和 10 个 MCP，按内外网分类，编写公网 Skill 一键导出脚本"
category: "work-logs"
tags: ["skill", "mcp", "配置管理", "导出迁移"]
publishedAt: "2026-04-06"
readTime: 3
---

## 做了什么
- 全面扫描已安装的 10 个 MCP 和 150+ 个 Skill
- 按内网依赖/公网可用进行分类整理
- 编写公网 Skill 导出脚本 `~/.claude/scripts/export-portable-skills.sh`
- 执行导出，生成包含 24 个通用 skill 的便携包
- 配套生成了公网版 mcp.json 和一键导入脚本 import.sh

## 关键结论
1. MCP 内网依赖 3 个（aone-km/aone-mix/odps-query-mcp），公网可用 7 个
2. Skill 内网依赖约 130 个，公网可用约 24 个
3. Skill 迁移只需复制目录，纯 Markdown 无依赖
4. 导出包自带 import.sh，新电脑两行命令即可导入
