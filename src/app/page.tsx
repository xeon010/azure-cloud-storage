"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredFile } from "./api/files/route";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (res.ok && data.folders.length > 0) {
        setFolders(data.folders);
        setFolder((prev) => prev || data.folders[0]);
      }
    } catch {
      // silently fail — user can still type a new folder name
    }
  }, []);

  const fetchFiles = useCallback(async (f: string) => {
    if (!f) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/files?folder=${encodeURIComponent(f)}`);
      const data = await res.json();
      setFiles(res.ok ? data.files : []);
    } catch {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (folder) fetchFiles(folder);
  }, [folder, fetchFiles]);

  function handleFolderChange(value: string) {
    if (value === "__new__") {
      setShowNewFolder(true);
    } else {
      setShowNewFolder(false);
      setFolder(value);
    }
  }

  function commitNewFolder() {
    const name = newFolder.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setFolders((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
    setFolder(name);
    setNewFolder("");
    setShowNewFolder(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setUploadStatus("success");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchFiles(folder);
        setTimeout(() => setUploadStatus("idle"), 3000);
      } else {
        setUploadStatus("error");
        setUploadError(data.error ?? "Upload failed");
      }
    } catch {
      setUploadStatus("error");
      setUploadError("Network error — is the dev server running?");
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student File Storage</h1>
          <p className="text-gray-400 mt-1 text-sm">Backed by Azure Blob Storage</p>
        </div>

        {/* Upload Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Upload a File</h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Folder</label>
              <select
                value={showNewFolder ? "__new__" : folder}
                onChange={(e) => handleFolderChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {folders.length === 0 && (
                  <option value="" disabled>No folders yet</option>
                )}
                {folders.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
                <option value="__new__">+ New folder…</option>
              </select>
              {showNewFolder && (
                <div className="flex gap-2 mt-2">
                  <input
                    autoFocus
                    type="text"
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitNewFolder()}
                    placeholder="e.g. algorithms"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={commitNewFolder}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">File</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer"
              />
              {file && (
                <p className="text-xs text-gray-500 mt-1">
                  {file.name} — {formatBytes(file.size)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || uploadStatus === "uploading"}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg py-2.5 font-medium transition-colors text-sm"
            >
              {uploadStatus === "uploading" ? "Uploading…" : "Upload to Azure"}
            </button>
          </form>

          {uploadStatus === "success" && (
            <p className="mt-3 text-green-400 text-sm text-center">
              File uploaded successfully.
            </p>
          )}
          {uploadStatus === "error" && (
            <p className="mt-3 text-red-400 text-sm text-center">{uploadError}</p>
          )}
        </div>

        {/* File List */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Files in <span className="text-blue-400">{folder}</span>
            </h2>
            <button
              onClick={() => fetchFiles(folder)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loadingFiles ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading…</p>
          ) : files.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">
              No files in this folder yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {files.map((f) => (
                <li key={f.path} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatBytes(f.size)} · {formatDate(f.lastModified)}
                    </p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  );
}
