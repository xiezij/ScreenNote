## ADDED Requirements

### Requirement: 主界面必须具备一致视觉层级
系统 MUST 在页面背景、主面板、分区容器、交互控件之间建立明确且一致的层级关系，避免视觉重心混乱。

#### Scenario: 分区层级审查
- **WHEN** 用户查看主界面结构
- **THEN** 各分区 SHALL 通过边框、阴影、间距或对比度呈现清晰层次

### Requirement: 交互状态表达必须统一
系统 SHALL 统一按钮、输入框、卡片、选择控件在 hover/focus/active/disabled 状态下的反馈强度与风格。

#### Scenario: 控件状态一致性检查
- **WHEN** 用户连续操作不同类型控件
- **THEN** 系统 MUST 呈现一致的状态反馈节奏与视觉语言

### Requirement: 深浅主题下需保持可读性与耐看性
系统 MUST 在 light/dark 两主题下保持关键文本、边界和操作控件的可读性，不得出现低对比导致的信息识别困难。

#### Scenario: 双主题可读性检查
- **WHEN** 用户在 light 与 dark 主题间切换并浏览主界面
- **THEN** 关键文本、按钮和输入区 SHALL 保持稳定可读与可辨识
