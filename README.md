# 一口糖 · 一尾河豚 (The Birth of a Sugar Pufferfish)

> 中国传统手工艺「吹糖人」3D 沉浸式电影感交互体验网页

---

## 一、最高优先级原则与模型完整性保障

本项目以**最高优先级严格保留了原 ZIP 中的河豚 3D 模型及其全部几何特征**：

1. **零几何修改**：完整保留原模型全部 8 个部件（`Pufferfish_Body`、`Pufferfish_Mouth`、`Fin_Left`、`Fin_Right`、`Fin_Dorsal`、`Fin_Tail`、`Eye_Left`、`Eye_Right`），共 144,672 个三角面，无任何减面、重新拓扑或近似替代。
2. **SHA-256 无损校验**：
   - 原始导出的 `pufferfish.glb` 哈希值：`9d01b1599209d2e5ae72a29933d31cf20c2bf212141174e7a2dce81061c4e3cf`
   - 本项目引用的 `public/assets/pufferfish/pufferfish.glb` 与原文件完全一致。
3. **备份存放**：原 ZIP 完整文件（包含原始 `河豚.blend` 源文件、原检测脚本和原验证结果）已无损归档在 `src/backup_original_pufferfish/` 目录中。
4. **弹性和可恢复性**：长按膨胀采用独立的统一几何缩放与物理弹性控制器，松开后通过衰减曲线精确恢复为 1.000 原始形态，绝不产生累积形变。

---

## 二、功能特性与三幕体验设计

### Scene 01：糖人制作现场 (The Workshop)
- 质感厚重的老榆木案头（具有真实木纹漫反射与高光）。
- 紫铜保温糖锅（带有双耳铜把手与微温热力感）。
- 锅中浓稠流动的琥珀金麦芽糖浆，泛着蜂蜜般的晶润微光。
- 锅上升腾的细腻半透明热气轻烟粒子。
- 传统吹糖工具：细长吹糖竹芦管、调糖竹铲、剪刀与白瓷扑粉小碟。

### Scene 02：手工制作与吹糖人 (The Birth)
- 电影感运镜叙事动画，还原吹糖人四部曲：
  1. **挑糖**：竹管探入温锅引出温热糖浆；
  2. **揉胚**：在木案上揉捏出柔软半透明金黄糖胚；
  3. **吹气**：气息自竹管徐徐注入，糖胚均匀膨胀，化出河豚圆滚身躯、小嘴与鱼鳍；
  4. **凝晶**：晶莹琥珀光芒流转，化作玲珑剔透的吹糖人河豚。
- 支持随时点击「跳过动画 · 直接品赏」进入交互。

### Scene 03：河豚糖人交互体验 (The Interactive Pufferfish)
- **长按膨胀（Hold to Breathe）**：
  - 按住河豚或界面吹气按钮，或键盘空格 / 回车键，河豚平滑膨胀至 1.35x。
  - 伴有模拟空气注入的呼气声效、微温呼吸光晕与糖壳反光位移。
- **松开回弹（Release & Settle）**：
  - 松开后自然回弹收缩，恢复原始 1.00x，无视觉扭曲。
- **360° 自由旋转（360° Free Orbit）**：
  - 支持鼠标或触控拖拽，平滑旋转观察背鳍、尾巴、侧鳍、嘴唇和黑糖眼珠。
  - 智能防冲突判定：长按吹气与拖拽旋转严格区分（位移 > 6px 判定为旋转，避免误触）。
  - 提供「正面 / 侧面 / 背面 / 复位」一键观察按钮。
- **三向光效切换**：
  - 暖金工坊、烛影微光、晨曦金光三种东方典雅光影模式。

---

## 三、新增与修改文件清单

| 文件路径 | 类型 | 说明 |
| :--- | :--- | :--- |
| `public/assets/pufferfish/pufferfish.glb` | 核心 3D 资源 | 原 ZIP 导出的无损模型（SHA-256 校验一致） |
| `public/assets/pufferfish/*-color.png` | 材质贴图 | 原模型烘焙的部件贴图，用于呈现传统麦芽糖色泽 |
| `src/backup_original_pufferfish/` | 原始备份 | 完整备份原 ZIP 所有文件（含 `河豚.blend` 源文件） |
| `src/scene/SugarWorkshopScene.ts` | 核心场景类 | 包含工作台、温糖铜锅、热气粒子、制作动画、360°旋转及膨胀逻辑 |
| `src/utils/motion.ts` & `.test.ts` | 物理计算逻辑 | 纯逻辑模块与 `node:test` 单元测试，保证膨胀回弹无误差 |
| `src/utils/audio.ts` | 声音合成 | 基于 Web Audio API 的蒸汽温锅、吹气声与糖晶清脆声（零外链 404） |
| `src/components/Header.tsx` | UI 组件 | 极简东方美学顶部栏，包含重温、光影、音效与信息入口 |
| `src/components/InteractionOverlay.tsx` | UI 组件 | 长按吹气膨胀触控按钮、倍率指示器与视角快捷切换 |
| `src/components/StoryProgressOverlay.tsx` | UI 组件 | 吹糖四部曲电影感字幕、进度与跳过按钮 |
| `src/components/InspectionModal.tsx` | 校验工具 | 8 大部件面数/顶点数详情核对、正面/侧面/背面实时截图导出 |
| `src/components/CraftsmanshipModal.tsx` | 文化介绍 | 介绍中国传统非遗吹糖人历史与工艺技法 |
| `src/components/ExportModal.tsx` | 交付工具 | 提供本地一键启动说明与完整 ZIP 下载 |
| `server.py` | 启动脚本 | 跨平台 Python 静态服务，支持 `--lan` 手机局域网测试 |
| `启动河豚.command` | 启动脚本 | macOS 桌面双击即可启动运行 |

---

## 四、本地运行说明

### 启动方案一：双击启动（适用于 macOS）
1. 双击项目根目录下的 `启动河豚.command`。
2. 浏览器将自动打开：`http://localhost:8765/`（或提示的端口）。

### 启动方案二：Python 3 轻量启动（无需安装 Node.js）
在终端中进入项目目录运行：
```sh
python3 server.py
```
- 如果需要局域网手机访问，运行：`python3 server.py --lan`，并在手机浏览器访问电脑 IP。
- 端口冲突时可指定：`python3 server.py --port 8766`。

### 启动方案三：现代 Node.js / Vite 启动
```sh
npm install
npm run dev
```
浏览器打开控制台输出的地址（默认为 `http://localhost:3000/`）。
也可通过 `http://localhost:3000/?autostart=1` 直接跳过开场动画进入交互模式。

---

## 五、浏览器兼容性
- 支持 macOS Safari, Chrome, Edge, Firefox 等支持 WebGL 2 的现代浏览器。
- 移动端适配 iOS Safari 及 Android Chrome，触控手势防误触。
