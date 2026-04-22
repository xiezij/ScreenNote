## ADDED Requirements

### Requirement: 默认保存目录必须可点击打开
当存在默认保存目录时，系统 SHALL 将目录展示为可点击交互元素，用户点击后 MUST 打开对应文件夹。

#### Scenario: 点击目录打开文件夹
- **WHEN** 用户点击“当前目录”路径
- **THEN** 系统 SHALL 打开该目录并保持当前应用状态不变

### Requirement: 目录打开失败必须提示
目录打开能力调用失败时，系统 MUST 提示用户失败原因，避免无反馈。

#### Scenario: 目录打开失败
- **WHEN** 用户点击目录但操作系统拒绝打开或目录不存在
- **THEN** 系统 SHALL 显示错误提示并保留当前页面
