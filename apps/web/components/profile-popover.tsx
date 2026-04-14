"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiClientError } from "@/lib/api-client";

const MAX_SIZE_PX = 128;

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = MAX_SIZE_PX;
      canvas.height = MAX_SIZE_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      const scale = Math.max(MAX_SIZE_PX / img.width, MAX_SIZE_PX / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (MAX_SIZE_PX - w) / 2, (MAX_SIZE_PX - h) / 2, w, h);
      resolve(canvas.toDataURL("image/webp", 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ProfilePopover() {
  const { address, avatarUrl, isAuthenticated, logout, updateAvatar, username } =
    useAuth();

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);
      setUploading(true);
      try {
        const dataUrl = await resizeToDataUrl(file);
        await updateAvatar(dataUrl);
      } catch (err) {
        setUploadError(
          err instanceof ApiClientError || err instanceof Error
            ? err.message
            : "Upload failed",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [updateAvatar],
  );

  if (!isAuthenticated || !address) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-outline-variant/30 bg-surface-container transition-colors hover:border-primary/40"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-label="Profile"
      >
        {avatarUrl ? (
          <img
            alt="avatar"
            className="h-full w-full object-cover"
            src={avatarUrl}
          />
        ) : (
          <span className="material-symbols-outlined text-lg text-on-surface-variant">
            person
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container shadow-2xl">
          <div className="flex flex-col items-center gap-3 border-b border-outline-variant/15 px-5 py-5">
            <div className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/20 bg-surface-container-high">
              {avatarUrl ? (
                <img
                  alt="avatar"
                  className="h-full w-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  person
                </span>
              )}

              <button
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                type="button"
                aria-label="Upload avatar"
              >
                <span className="material-symbols-outlined text-lg text-white">
                  {uploading ? "hourglass_top" : "photo_camera"}
                </span>
              </button>
            </div>

            <input
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void handleFileChange(e)}
              ref={fileRef}
              type="file"
            />

            <div className="text-center">
              <p className="font-headline text-sm font-bold text-on-surface">
                {username ?? "No username"}
              </p>
              <p className="font-mono text-[11px] text-primary">
                {shortenAddress(address)}
              </p>
            </div>

            {uploadError && (
              <p className="text-xs text-error">{uploadError}</p>
            )}
          </div>

          <div className="px-2 py-2">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
