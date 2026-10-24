import React from 'react';
import { X, Download, Terminal, FolderCheck, ExternalLink } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#1c120a] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-[#f7efe6]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40 bg-[#25180f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-semibold text-amber-200">
                本地运行与项目归档说明
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                支持 macOS / Windows / Linux 跨平台一键启动方案
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm font-sans">
          {/* Quick ZIP Download Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 to-amber-900/30 border border-amber-500/40 flex items-center justify-between gap-4">
            <div>
              <div className="font-serif font-semibold text-amber-200 text-sm">
                打包下载升级后完整项目 (ZIP)
              </div>
              <p className="text-xs text-stone-300/80 mt-0.5">
                包含全部 3D 原模型资源 (pufferfish.glb)、场景贴图、React/Three.js 源码及本地启动脚本。
              </p>
            </div>
            <a
              href="/pufferfish_upgraded.zip"
              download="pufferfish_upgraded.zip"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#170a04] font-medium text-xs shadow-md transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>下载 ZIP</span>
            </a>
          </div>

          {/* Local Run Scheme A: Node.js (Vite) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>方案一：现代 Node.js / Vite 启动（推荐，支持热更新）</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#120a06] border border-amber-950 font-mono text-xs text-amber-200/90 space-y-1">
              <p className="text-stone-400"># 1. 解压后进入项目目录</p>
              <p>cd pufferfish_upgraded</p>
              <p className="text-stone-400 mt-2"># 2. 安装依赖并启动开发服务器</p>
              <p>npm install</p>
              <p>npm run dev</p>
              <p className="text-stone-400 mt-2"># 浏览器打开：http://localhost:3000</p>
            </div>
          </div>

          {/* Local Run Scheme B: Python 3 server */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>方案二：Python 3 一键静态运行（无需 Node 环境）</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#120a06] border border-amber-950 font-mono text-xs text-amber-200/90 space-y-1">
              <p className="text-stone-400"># 无论是 macOS 还是 Linux，终端运行：</p>
              <p>python3 -m http.server 8765 --directory dist</p>
              <p className="text-stone-400 mt-2"># 浏览器访问：http://localhost:8765</p>
            </div>
          </div>

          {/* File Provenance & Backup info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <FolderCheck className="w-4 h-4 text-emerald-400" />
              <span>原始模型与文件备份保障</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-300 text-xs">
              <li>
                原始模型文件：<code className="text-amber-300 font-mono">public/assets/pufferfish/pufferfish.glb</code>（完整保留 8 个部件、144,672 三角面，SHA-256 无损校验）。
              </li>
              <li>
                ZIP 全量原貌备份：<code className="text-amber-300 font-mono">src/backup_original_pufferfish/</code>，包含原 Blender 源文件、原脚本及检测结果。
              </li>
              <li>
                无任何外部网络外链依赖，纯本地运行与离线渲染。
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-amber-900/40 bg-[#25180f]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#170a04] font-medium text-xs transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
