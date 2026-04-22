## Requirement: 用户可以切换主题偏好
系统 MUST 提供可见且可操作的主题切换入口，支持 `light`、`dark`、`system` 三种主题偏好。

### Scenario: 手动切换到浅色主题
- **WHEN** 用户在主题切换入口选择 `light`
- **THEN** 系统 SHALL 立即将界面应用为浅色主题

### Scenario: 手动切换到深色主题
- **WHEN** 用户在主题切换入口选择 `dark`
- **THEN** 系统 SHALL 立即将界面应用为深色主题

## Requirement: 主题偏好需要持久化
系统 SHALL 将用户的主题偏好写入本地持久化存储，并在应用重启后恢复该偏好。

### Scenario: 重启后恢复用户偏好
- **WHEN** 用户已设置主题偏好并重新启动应用
- **THEN** 系统 MUST 按上次保存的偏好恢复主题状态

## Requirement: 跟随系统主题模式
当用户选择 `system` 偏好时，系统 MUST 根据操作系统当前明暗主题解析为实际主题，并在系统主题变化时自动同步。

### Scenario: system 模式下启动应用
- **WHEN** 用户主题偏好为 `system` 且应用启动
- **THEN** 系统 SHALL 根据当前系统主题应用对应的浅色或深色样式

### Scenario: system 模式下系统主题变化
- **WHEN** 用户主题偏好为 `system` 且系统从浅色切换到深色（或反向）
- **THEN** 系统 SHALL 自动更新应用主题且无需手动刷新
