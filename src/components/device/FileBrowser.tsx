"use client";

import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { Folder, FileText, Image, Music, Film, Download, ChevronRight, Home, FolderOpen } from "lucide-react";
import { toast } from "sonner";

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return <Image className="h-5 w-5 flex-shrink-0 text-pink-400" />;
  if (["mp4","mov","avi","mkv"].includes(ext))         return <Film  className="h-5 w-5 flex-shrink-0 text-purple-400" />;
  if (["mp3","wav","aac","flac"].includes(ext))        return <Music className="h-5 w-5 flex-shrink-0 text-green-400" />;
  return <FileText className="h-5 w-5 flex-shrink-0 text-blue-400" />;
}

export function FileBrowser({ deviceId }: { deviceId: string }) {
  const [path, setPath] = useState("/");

  const { data, isLoading, refetch } = trpc.file.list.useQuery(
    { deviceId, path },
    { placeholderData: (prev: any) => prev },
  );

  const download = trpc.file.download.useMutation({
    onSuccess: (result) => {
      const a = document.createElement("a");
      a.href = result.url; a.download = result.fileName ?? "file";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast.success(`Downloading ${result.fileName ?? "file"}`);
    },
    onError: (err) => toast.error(`Download failed: ${err.message}`),
  });

  const segments   = path.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => ({
    label: seg,
    path:  "/" + segments.slice(0, idx + 1).join("/"),
  }));

  const navigateTo = (p: string) => { setPath(p); refetch(); };
  const files = data?.files ?? [];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">File Browser</h3>
      <div className="glass-card overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 overflow-x-auto border-b dark:border-white/10 border-slate-200 px-3 py-2.5 text-sm">
          <button onClick={() => navigateTo("/")} className="flex items-center gap-1 rounded-lg px-2 py-1 dark:hover:bg-white/10 hover:bg-slate-100 flex-shrink-0">
            <Home className="h-3.5 w-3.5" />
          </button>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight className="h-3 w-3 dark:text-slate-600 text-slate-400" />
              <button onClick={() => navigateTo(crumb.path)} className="rounded-lg px-2 py-1 dark:hover:bg-white/10 hover:bg-slate-100 max-w-[120px] truncate">
                {crumb.label}
              </button>
            </span>
          ))}
        </div>

        {path !== "/" && (
          <button onClick={() => navigateTo(segments.slice(0, -1).join("/") || "/")}
            className="flex w-full items-center gap-2 border-b dark:border-white/5 border-slate-100 px-3 py-2.5 text-sm dark:hover:bg-white/5 hover:bg-slate-50 transition">
            <ChevronRight className="h-4 w-4 rotate-180 dark:text-slate-500 text-slate-400" />
            <span className="dark:text-slate-400 text-slate-500">..</span>
          </button>
        )}

        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="skeleton h-5 w-5 rounded" />
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}

        {!isLoading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FolderOpen className="h-10 w-10 dark:text-slate-700 text-slate-300" />
            <p className="text-sm dark:text-slate-500 text-slate-400">This folder is empty.</p>
          </div>
        )}

        {files.map((file, idx) => (
          <div key={file.path} onClick={() => file.type === "directory" ? navigateTo(file.path) : download.mutate({ deviceId, filePath: file.path })}
            className={`flex cursor-pointer items-center gap-3 px-3 py-3 transition dark:hover:bg-white/5 hover:bg-slate-50
              ${idx < files.length - 1 ? "border-b dark:border-white/5 border-slate-100" : ""}`}>
            {file.type === "directory" ? <Folder className="h-5 w-5 flex-shrink-0 text-yellow-400" /> : fileIcon(file.name)}
            <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
            {"size" in file && file.size != null && (
              <span className="flex-shrink-0 text-xs dark:text-slate-500 text-slate-400">
                {(file.size as number) < 1_048_576
                  ? `${((file.size as number) / 1024).toFixed(1)} KB`
                  : `${((file.size as number) / 1_048_576).toFixed(1)} MB`}
              </span>
            )}
            {file.type !== "directory" && <Download className="h-4 w-4 flex-shrink-0 dark:text-slate-500 text-slate-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}