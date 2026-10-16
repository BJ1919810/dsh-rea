# dsh-rea

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件：**一个开关，同时开/关**

- **REA MCP 服务** —— 207 个逆向分析工具（Ghidra / IDA / jadx / apktool / frida / adb / pcap / 固件 / 浏览器 / Electron / 托管代码 …）
- **REA 的三个工作流技能** —— `reverse-engineer-anything`（含 6 篇 references）、`rea-tool-design`、`rea-changelog-update`

关掉插件 → 工具和技能一起消失；打开 → 一起回来。改开关**无需重启**。

## 安装

```powershell
# 方式一：直接从 GitHub 装（本仓库未发布到 npm）
dsh plugin --profile desktop add github:BJ1919810/dsh-rea

# 方式二：clone 后按本地路径装（最稳，不依赖 GitHub 安装链）
git clone https://github.com/BJ1919810/dsh-rea
dsh plugin --profile desktop add file:D:/path/to/dsh-rea
```

锁定版本（本仓库已打 tag）：

```powershell
dsh plugin --profile desktop add github:BJ1919810/dsh-rea#v1.0.0
```

`--profile desktop` 是 GUI 用的 profile；TUI 用户改成 `--profile tui`。
装完在**插件页**会出现 `dsh-rea` 这一项，那个开关就是总开关。

> 方式一用的是 pnpm 的 `github:` spec，作者**未实测** DSH 的供应链策略是否放行；
> 装不上就用方式二。已实测的只有：Windows x64 + DSH Desktop + REA 6.5.0 + 方式二。

## 前置：分析引擎要自备

本插件**不安装任何引擎**（和 REA 本身一样）。REA 只是适配层，引擎缺了对应工具就会报
`provider_unavailable`。常用组合：

| 用途 | 需要自备 |
|---|---|
| 原生 PE/ELF 静态分析 | [Ghidra](https://github.com/NationalSecurityAgency/ghidra) 12.1.x + **JDK 21+**（或自备 IDA，见 REA 文档） |
| APK 资源 / DEX | apktool、[jadx-headless-mcp](https://github.com/1013503897/jadx-headless-mcp) 0.7.1 的 `-all.jar` |
| 真机 / 模拟器 | Android platform-tools（adb） |

## 环境变量

本插件**不写死任何路径**。REA 的 MCP 服务继承 DSH 进程的环境，所以先把变量设成**用户/系统环境变量**，再启动 DSH：

```powershell
GHIDRA_INSTALL_DIR   = D:\tools\ghidra_12.1.4_PUBLIC
JAVA_HOME            = D:\tools\jdk-21
REA_JADX_MCP_JAR     = D:\tools\jadx-headless-mcp-0.7.1-all.jar
REA_APKTOOL_COMMAND  = D:\tools\apktool\apktool.cmd
REA_ADB_PATH         = D:\Android\Sdk\platform-tools\adb.exe
```

只需要设你实际要用的那几个。查是否就绪：

```powershell
npx -y rea-agents@latest doctor --json
```

**不设也能装上**：插件会正常安装、MCP 服务也能启动，只是对应工具会以 `capability_unavailable`
失败，并在提示里**点名该设哪个变量**（实测：未设 `REA_APKTOOL_COMMAND` 时，`inspect_apktool_client`
直接返回「apktool launcher was not found … Set REA_APKTOOL_COMMAND to an absolute apktool launcher」）。
设完变量需要**重启 DSH**（它只在启动时读环境）。

## macOS / Linux

启动器用一条表达式**按平台自动选形态**（Windows 上 `npx` 是 `npx.cmd`，必须经 `cmd.exe`）：

```yaml
command: !!js "process.platform === 'win32' ? 'cmd.exe' : 'npx'"
args: !!js "process.platform === 'win32' ? ['/d','/c','npx','-y','rea-agents@latest','mcp'] : ['-y','rea-agents@latest','mcp']"
```

**表达式在 bundle patch 里被求值已实测**（Windows x64 → 正确取 `cmd.exe` 分支，207 工具全部可用）；
非 Windows 那条 `npx` 分支**没有**在 macOS/Linux 上跑过。不想用表达式就把这两行换成字面量（见 `cordis.patch.yml` 注释）。

## 与 REA 官方注册的关系（重要）

如果你以前跑过 `rea setup --client dsh`，REA 已经往 **home patch** `~/.dsh/cordis.patch.yml`
写过一份它自己的 `rea-mcp`。那会和本插件的条目**撞 id**，而且它不受本插件开关控制。
用本插件前请删掉 home patch 里那份，并把该文件恢复成 `[]`：

```yaml
[]
```

⚠️ home patch **不能留空文件或纯注释**（DSH 启动会失败），停用该层必须写 `[]`。

## 卸载

```powershell
dsh plugin --profile desktop remove dsh-rea
```

引擎目录与本仓库无关，不会被删除。

## 更新技能内容

技能文件的权威来源是 [morluto/rea](https://github.com/morluto/rea) 的 `.agents/skills`：

```powershell
node sync-skills.mjs D:\path\to\rea-checkout
node test/smoke.mjs
```

## 验证状态（作者实测）

| 项 | 状态 |
|---|---|
| Windows x64 + DSH Desktop + 本地路径安装 | ✅ 实测：开关 ON → `cordis.yml` 出现 `rea-skills`/`rea-mcp`，`inspect_apktool_client` 真调用返回 apktool 3.0.3；OFF → 两条目消失、调用报 `unknown tool` |
| `github:` spec 安装（上面方式一） | ✅ 实测（2026-10-16）：pnpm 6.4s 装好，DSH 供应链策略放行（`Lockfile passes supply-chain policies`），自动入列 `dsh.profile.bundles` 并即时生效，`rea-skills` 指向 `dsh-rea`，MCP 服务可调用 |
| `!!js` 启动器表达式在 bundle patch 里被求值 | ✅ 实测（Windows x64：正确取 `cmd.exe` 分支，207 工具可用） |
| 未设环境变量时的行为 | ✅ 实测：装得上、服务起得来，工具报 `capability_unavailable` 并点名缺哪个变量 |
| macOS / Linux 实际运行 | ⚠️ 未实测（只验了表达式求值，没验 `npx` 分支） |

## 致谢与许可

- **REA**（`rea-agents`）作者 **[morluto](https://github.com/morluto/rea)**，MIT License。
  本仓库 `skills/` 下的三个技能（含 `reverse-engineer-anything/references/` 6 篇）是该项目
  `.agents/skills/` 的**原样副本**，未修改内容；运行时由 `lib/index.js` 解析 frontmatter 供正文。
  原始许可证见 [`LICENSE-REA`](./LICENSE-REA)，出处与改动说明见 [`NOTICE`](./NOTICE)。
- 本插件自身代码（`lib/`、`cordis.patch.yml`、脚本）MIT License，见 [`LICENSE`](./LICENSE)。
